import SwiftUI
import FirebaseCore

// The admin app (DASHitAdmin target) compiles these sources too and has its
// own entry point, DASHitAdminApp.
#if !ADMIN_APP_TARGET
@main
struct DASHitApp: App {
    @StateObject private var auth = AuthService.shared
    @StateObject private var cart = CartViewModel.shared
    /// The animated splash that takes over from the static launch screen.
    @State private var isSplashVisible = true
    /// The app starts a touch zoomed in behind the splash and settles as it clears.
    @State private var isAppSettled = false
    /// Log in / sign up, once, on the very first launch; the splash clears onto
    /// it. "Skip for now" goes straight to the shop.
    @State private var isWelcomeAuthVisible: Bool

    private static let welcomeSeenKey = "dashit_seen_auth_welcome"
    
    init() {
        FirebaseManager.shared.configure()
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
                RootView()
                    .environmentObject(auth)
                    .environmentObject(cart)
                    .scaleEffect(isAppSettled ? 1 : 1.04)
                if isWelcomeAuthVisible {
                    AuthView(isWelcome: true) {
                        UserDefaults.standard.set(true, forKey: Self.welcomeSeenKey)
                        withAnimation(.spring(response: 0.45, dampingFraction: 0.9)) {
                            isWelcomeAuthVisible = false
                        }
                    }
                    .transition(.move(edge: .bottom))
                    .zIndex(0.5)
                }
                if isSplashVisible {
                    SplashView(
                        onReveal: {
                            withAnimation(.spring(response: 0.5, dampingFraction: 0.86)) { isAppSettled = true }
                        },
                        onFinish: { isSplashVisible = false }
                    )
                    .zIndex(1)
                }
            }
        }
    }
}
#endif
