import SwiftUI

struct RootView: View {
    @State private var selectedTab: TabItem = .home
    @State private var activeOrder: Order?
    @State private var isLiveTrackingOpen = false
    
    var body: some View {
        ZStack(alignment: .bottom) {
            Color.obsidianBlack.ignoresSafeArea()
            
            Group {
                switch selectedTab {
                case .home:
                    StorefrontHomeView()
                case .categories:
                    StorefrontHomeView()
                case .orders:
                    OrdersListView()
                case .profile:
                    ProfileView()
                }
            }
            
            VStack(spacing: 8) {
                // Docked Live Order Floating Capsule
                if let order = activeOrder, order.status != .delivered, order.status != .cancelled {
                    LiveOrderFloatingTrackerView(order: order) {
                        isLiveTrackingOpen = true
                    }
                }
                
                // Floating Tab Bar
                CustomTabBar(selectedTab: $selectedTab)
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            checkActiveOrder()
        }
        .fullScreenCover(isPresented: $isLiveTrackingOpen) {
            if let order = activeOrder {
                LiveTrackingMapView(orderId: order.id)
            }
        }
    }
    
    private func checkActiveOrder() {
        if let orderId = LocalStorage.shared.loadActiveOrderId() {
            _ = FirestoreService.shared.listenOrder(orderId: orderId) { order in
                self.activeOrder = order
            }
        }
    }
}
