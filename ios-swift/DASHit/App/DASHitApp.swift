import SwiftUI
import FirebaseCore

#if !ADMIN_APP_TARGET
@main
struct DASHitApp: App {
    @StateObject private var auth = AuthService.shared
    @StateObject private var cart = CartViewModel.shared
    
    init() {
        FirebaseManager.shared.configure()
        // AsyncImage loads through URLSession.shared, whose default cache is tiny;
        // without room to keep product photos, fast scrolling re-downloads them.
        URLCache.shared = URLCache(memoryCapacity: 64 * 1024 * 1024, diskCapacity: 256 * 1024 * 1024)
    }
    
    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(auth)
                .environmentObject(cart)
        }
    }
}
#endif
