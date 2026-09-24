import SwiftUI
import UIKit

/// Plays the "Free delivery unlocked" toast when the cart crosses ₹299. It
/// lives in its own pass-through window, so it shows above sheets (the cart,
/// a product) as well as the storefront, and never takes a touch.
@MainActor
final class FreeDeliveryCelebration {
    static let shared = FreeDeliveryCelebration()

    private let model = FreeDeliveryToastModel()
    private var window: UIWindow?
    private var dismissTask: Task<Void, Never>?

    private init() {}

    func celebrate() {
        guard let window = windowForToast() else { return }
        window.overrideUserInterfaceStyle = Self.interfaceStyle
        window.isHidden = false
        HapticsManager.shared.success()
        model.present()
        UIAccessibility.post(notification: .announcement, argument: "Free delivery unlocked")

        dismissTask?.cancel()
        dismissTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(2.6))
            guard !Task.isCancelled, let self else { return }
            self.model.dismiss()
            try? await Task.sleep(for: .seconds(0.5))
            guard !Task.isCancelled else { return }
            self.window?.isHidden = true
        }
    }

    private func windowForToast() -> UIWindow? {
        if let window { return window }
        guard let scene = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first(where: { $0.activationState == .foregroundActive })
        else { return nil }

        let host = UIHostingController(rootView: FreeDeliveryToastOverlay(model: model))
        host.view.backgroundColor = .clear
        let window = UIWindow(windowScene: scene)
        window.windowLevel = .alert + 1
        window.backgroundColor = .clear
        window.isUserInteractionEnabled = false
        window.rootViewController = host
        self.window = window
        return window
    }

    /// The same `dashit_theme` preference the rest of the app follows.
    private static var interfaceStyle: UIUserInterfaceStyle {
        switch UserDefaults.standard.string(forKey: "dashit_theme") {
        case "light": return .light
        case "dark": return .dark
        default: return .unspecified
        }
    }
}

@MainActor
private final class FreeDeliveryToastModel: ObservableObject {
    @Published var isVisible = false
    /// A fresh identity per celebration, so the check and ring replay.
    @Published var presentation = 0

    func present() {
        presentation += 1
        withAnimation(.spring(response: 0.42, dampingFraction: 0.78)) { isVisible = true }
    }

    func dismiss() {
        withAnimation(.dashitSnappy) { isVisible = false }
    }
}

private struct FreeDeliveryToastOverlay: View {
    @ObservedObject var model: FreeDeliveryToastModel

    var body: some View {
        VStack(spacing: 0) {
            if model.isVisible {
                FreeDeliveryToast()
                    .id(model.presentation)
                    .transition(
                        .move(edge: .top)
                            .combined(with: .opacity)
                            .combined(with: .scale(scale: 0.96, anchor: .top))
                    )
            }
            Spacer(minLength: 0)
        }
        .padding(.top, 6)
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct FreeDeliveryToast: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var checkShown = false
    @State private var ringExpanded = false

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .strokeBorder(Color.positive, lineWidth: 2)
                    .scaleEffect(ringExpanded ? 1.9 : 0.7)
                    .opacity(ringExpanded ? 0 : 0.9)
                Circle()
                    .fill(Color.positive)
                    .scaleEffect(checkShown ? 1 : 0.4)
                Image(systemName: "checkmark")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .scaleEffect(checkShown ? 1 : 0.4)
            }
            .frame(width: 32, height: 32)

            VStack(alignment: .leading, spacing: 1) {
                Text("Free delivery unlocked")
                    .font(.system(size: 14.5, weight: .bold))
                    .foregroundColor(.textPrimary)
                Text("You're saving \(CurrencyFormatter.format(CartBillBreakdown.standardDeliveryFee)) on this order")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.textSecondary)
            }
        }
        .padding(.leading, 8)
        .padding(.trailing, 20)
        .padding(.vertical, 8)
        .background(Capsule().fill(Color.surfaceRaised))
        .overlay(Capsule().strokeBorder(Color.hairline, lineWidth: 1))
        .shadow(color: .floatingShadow, radius: 20, x: 0, y: 8)
        .onAppear {
            guard !reduceMotion else {
                checkShown = true
                return
            }
            withAnimation(.spring(response: 0.35, dampingFraction: 0.5).delay(0.05)) { checkShown = true }
            withAnimation(.easeOut(duration: 0.9).delay(0.15)) { ringExpanded = true }
        }
        .accessibilityElement(children: .combine)
    }
}
