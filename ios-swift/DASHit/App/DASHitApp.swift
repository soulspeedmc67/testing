import SwiftUI
import FirebaseCore

@main
struct DASHitApp: App {
    @StateObject private var auth = AuthService.shared
    @StateObject private var cart = CartViewModel.shared
    /// The animated splash that takes over from the static launch screen.
    @State private var isSplashVisible = true
    /// The app starts a touch zoomed in behind the splash and settles as it clears.
    @State private var isAppSettled = false
    
    init() {
        FirebaseManager.shared.configure()
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
