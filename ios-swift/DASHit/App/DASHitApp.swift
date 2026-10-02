import SwiftUI
import FirebaseCore

// The admin app (DASHitAdmin target) compiles these sources too and has its
// own entry point, DASHitAdminApp.
#if !ADMIN_APP_TARGET
@main
struct DASHitApp: App {
    @UIApplicationDelegateAdaptor(PushAppDelegate.self) private var pushDelegate
    @StateObject private var auth = AuthService.shared
    @StateObject private var cart = CartViewModel.shared
    /// The animated splash that takes over from the static launch screen.
    @State private var isSplashVisible = true
    /// The app starts a touch zoomed in behind the splash and settles as it clears.
    /// Log in / sign up, once, on the very first launch; the splash clears onto
    /// it. "Skip for now" goes straight to the shop.
    @State private var isWelcomeAuthVisible: Bool

    private static let welcomeSeenKey = "dashit_seen_auth_welcome"
    
    init() {
        FirebaseManager.shared.configure()
        OrderNotifications.showWhileOpen()
        // The splash covers the first seconds: entrances wait for it to clear.
        AppReveal.shared.coversLaunch = true
        _isWelcomeAuthVisible = State(
            initialValue: !UserDefaults.standard.bool(forKey: Self.welcomeSeenKey) && !AuthService.shared.isAuthenticated
        )
        // AsyncImage loads through URLSession.shared, whose default cache is tiny;
        // without room to keep product photos, fast scrolling re-downloads them.
        URLCache.shared = URLCache(memoryCapacity: 64 * 1024 * 1024, diskCapacity: 256 * 1024 * 1024)
    }
    
    var body: some Scene {
        WindowGroup {
            ZStack {
                // Built straight away, under the splash: the splash plays in Core
                // Animation, so this work can't make it stutter, and the shop is
                // fully laid out (catalogue and all) by the time it clears.
                RootView()
                    .environmentObject(auth)
                    .environmentObject(cart)
                if isWelcomeAuthVisible {
                    AuthView(isWelcome: true) {
                        UserDefaults.standard.set(true, forKey: Self.welcomeSeenKey)
                        withAnimation(.spring(response: 0.45, dampingFraction: 0.9)) {
                            isWelcomeAuthVisible = false
                        }
                        AppReveal.shared.reveal()
                        StartupLocation.shared.askIfNeeded()
                    }
                    .transition(.move(edge: .bottom))
                    .zIndex(0.5)
                }
                if isSplashVisible {
                    SplashView(
                        onReveal: {
                            LaunchZoom.play()
                            // The welcome sign-in still covers the shop on a first launch.
                            if !isWelcomeAuthVisible { AppReveal.shared.reveal() }
                        },
                        onFinish: {
                            isSplashVisible = false
                            // With the welcome screen up, it asks once that closes.
                            if !isWelcomeAuthVisible {
                                StartupLocation.shared.askIfNeeded()
                            }
                        }
                    )
                    .zIndex(1)
                }
            }
        }
    }
}

/// The shop settling into place as the splash clears: a gentle zoom from
/// slightly close up. It runs in Core Animation on the window's root layer,
/// on the render server, so it stays smooth while the home screen is busy
/// starting its own entrances (a SwiftUI scale effect there got two frames).
private enum LaunchZoom {
    static func play() {
        guard !UIAccessibility.isReduceMotionEnabled,
              let window = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene })
                .flatMap(\.windows)
                .first(where: \.isKeyWindow),
              let layer = window.rootViewController?.view.layer else { return }
        let zoom = CABasicAnimation(keyPath: "transform.scale")
        zoom.fromValue = 1.05
        zoom.toValue = 1
        zoom.duration = 0.75
        // A long, soft ease-out: quick to start, settling slowly.
        zoom.timingFunction = CAMediaTimingFunction(controlPoints: 0.16, 1, 0.3, 1)
        layer.add(zoom, forKey: "launch-zoom")
    }
}
#endif
