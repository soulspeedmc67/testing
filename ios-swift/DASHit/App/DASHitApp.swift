import SwiftUI
import FirebaseCore

@main
struct DASHitApp: App {
    @StateObject private var auth = AuthService.shared
    @StateObject private var cart = CartViewModel.shared
    
    init() {
        FirebaseManager.shared.configure()
    }
    
    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(auth)
                .environmentObject(cart)
        }
    }
}
