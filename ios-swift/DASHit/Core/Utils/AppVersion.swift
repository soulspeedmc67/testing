import SwiftUI
import UIKit

/// This app's version, and the oldest one the shop still takes orders from.
///
/// An installed app keeps the fees it was built with: a charge added later
/// (rain, night distance) is missing from its bill. The shop sets the oldest
/// version it accepts as `minIosVersion` on `config/store`; an app older than
/// that shows `UpdateRequiredView` and can't be used until it is updated.
/// Every order carries the version it was placed from (`appVersionCode`), and
/// `firestore.rules` refuse an iPhone order below the minimum, which is what
/// stops the apps installed before this screen existed.
enum AppVersion {
    /// "1.0.3", as the App Store shows it.
    static let name = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
    /// The same as one number that can be compared: 1.0.3 is 10003.
    static let code = code(from: name) ?? 0

    static let appStoreURL = URL(string: "https://apps.apple.com/in/app/dashit-fastest-grocery-app/id6815538756")!

    /// "1.0.3" → 10003, "1.2" → 10200; nil for anything that isn't a version.
    /// (Web: `versionCode` in `src/lib/appVersion.js`. Keep the two in step.)
    static func code(from text: String) -> Int? {
        let parts = text.trimmingCharacters(in: .whitespaces).split(separator: ".", omittingEmptySubsequences: false)
        guard (1...3).contains(parts.count) else { return nil }
        var numbers: [Int] = []
        for part in parts {
            guard let number = Int(part), (0...99).contains(number) else { return nil }
            numbers.append(number)
        }
        while numbers.count < 3 { numbers.append(0) }
        return numbers[0] * 10_000 + numbers[1] * 100 + numbers[2]
    }

    /// Whether this app is older than the oldest version the shop accepts.
    /// A blank or unreadable minimum means every version is accepted.
    static func isOlder(than minimum: String) -> Bool {
        guard let needed = code(from: minimum) else { return false }
        return code < needed
    }
}

#if !ADMIN_APP_TARGET

/// Puts the "update needed" sheet over the whole app, and takes it away.
///
/// It lives in its own window above everything, so it also covers a sheet
/// that was open when the shop raised the minimum (a sheet presented from the
/// app's own views is dropped by UIKit while another one is up).
@MainActor
final class UpdateGate {
    static let shared = UpdateGate()
    private var window: UIWindow?

    private init() {}

    func set(required: Bool) {
        if required { show() } else { hide() }
    }

    private func show() {
        guard window == nil else { return }
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        // None yet at the very start of a launch: asked again when the app becomes active.
        guard let scene = scenes.first(where: { $0.activationState == .foregroundActive }) ?? scenes.first else { return }

        let host = UIHostingController(rootView: UpdateRequiredView())
        host.view.backgroundColor = .clear
        let window = UIWindow(windowScene: scene)
        window.windowLevel = UIWindow.Level(rawValue: UIWindow.Level.alert.rawValue + 1)
        window.backgroundColor = .clear
        window.rootViewController = host
        window.makeKeyAndVisible()
        self.window = window
    }

    private func hide() {
        window?.isHidden = true
        window = nil
    }
}

/// Invisible. Watches the shop's minimum version and keeps the sheet in step.
struct UpdateGateWatcher: View {
    @ObservedObject private var store = StoreStatusStore.shared
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        Color.clear
            .allowsHitTesting(false)
            .onChange(of: store.rules.mustUpdate, initial: true) { _, required in
                UpdateGate.shared.set(required: required)
            }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active { UpdateGate.shared.set(required: store.rules.mustUpdate) }
            }
    }
}

/// The sheet itself: it can't be swiped away, and the app behind it can't be touched.
struct UpdateRequiredView: View {
    @AppStorage("dashit_theme") private var themePreference = "system"
    @State private var isShown = false

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.black.opacity(isShown ? 0.5 : 0)
                .ignoresSafeArea()

            if isShown {
                card
                    .transition(.move(edge: .bottom))
            }
        }
        .preferredColorScheme(colorScheme)
        .onAppear {
            withAnimation(.spring(response: 0.45, dampingFraction: 0.9)) { isShown = true }
        }
    }

    private var card: some View {
        VStack(alignment: .leading, spacing: 14) {
            Image(systemName: "arrow.down.app.fill")
                .font(.system(size: 34, weight: .semibold))
                .foregroundColor(.brandAccent)
                .accessibilityHidden(true)

            Text("Update DASHit to keep ordering")
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(.textPrimary)
                .fixedSize(horizontal: false, vertical: true)

            Text("A new version is on the App Store. This one is too old to place orders. Updating takes a minute, and your account, addresses and orders stay as they are.")
                .font(.system(size: 15))
                .foregroundColor(.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            Button {
                UIApplication.shared.open(AppVersion.appStoreURL)
            } label: {
                Text("Update on the App Store")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color.brandOrange)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .padding(.top, 4)

            Text("You have version \(AppVersion.name).")
                .font(.system(size: 13))
                .foregroundColor(.textMuted)
                .frame(maxWidth: .infinity, alignment: .center)
        }
        .padding(.horizontal, 22)
        .padding(.top, 26)
        .padding(.bottom, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            UnevenRoundedRectangle(topLeadingRadius: 32, topTrailingRadius: 32, style: .continuous)
                .fill(Color.surfaceRaised)
                .ignoresSafeArea(edges: .bottom)
        )
        .accessibilityAddTraits(.isModal)
    }

    private var colorScheme: ColorScheme? {
        switch themePreference {
        case "light": return .light
        case "dark": return .dark
        default: return nil
        }
    }
}

#endif
