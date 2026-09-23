import SwiftUI

struct RootView: View {
    @State private var selectedTab: TabItem = .home
    
    var body: some View {
        ZStack(alignment: .bottom) {
            Color.obsidianBlack.ignoresSafeArea()
            
            Group {
                switch selectedTab {
                case .home:
                    StorefrontHomeView()
                case .categories:
                    StorefrontHomeView() // Filtered categories
                case .orders:
                    OrdersListView()
                case .profile:
                    ProfileView()
                }
            }
            
            // Floating Tab Bar
            CustomTabBar(selectedTab: $selectedTab)
        }
        .preferredColorScheme(.dark)
    }
}
