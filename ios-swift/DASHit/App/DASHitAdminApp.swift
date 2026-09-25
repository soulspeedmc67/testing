import SwiftUI
import FirebaseCore

struct DASHitAdminAppView: View {
    @StateObject private var vm = AdminDashboardViewModel.shared

    var body: some View {
        AdminDashboardView()
    }
}

// Standalone entry point when building DASHitAdmin standalone
#if ADMIN_APP_TARGET
@main
struct DASHitAdminApp: App {
    init() {
        FirebaseManager.shared.configure()
        URLCache.shared = URLCache(memoryCapacity: 64 * 1024 * 1024, diskCapacity: 256 * 1024 * 1024)
    }

    var body: some Scene {
        WindowGroup {
            DASHitAdminAppView()
        }
    }
}
#endif
