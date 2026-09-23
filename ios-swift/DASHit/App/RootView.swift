import SwiftUI
import UIKit
import Combine

struct RootView: View {
    @State private var selectedTab: TabItem = .home
    /// Tabs are mounted on first visit and then kept alive, like a native tab
    /// bar, so scroll position and listeners survive switching back and forth.
    @State private var mountedTabs: Set<TabItem> = [.home]
    @State private var isLiveTrackingOpen = false
    @State private var isTrackerCollapsed = false
    @State private var isKeyboardVisible = false

    @ObservedObject private var activeOrder = ActiveOrderStore.shared
    @ObservedObject private var cart = CartViewModel.shared

    var body: some View {
        ZStack {
            ForEach(TabItem.allCases, id: \.self) { tab in
                if mountedTabs.contains(tab) {
                    screen(for: tab)
                        .opacity(selectedTab == tab ? 1 : 0)
                        .allowsHitTesting(selectedTab == tab)
                        .accessibilityHidden(selectedTab != tab)
                }
            }
        }
        // The tab bar insets every screen's safe area, so scroll views and the
        // floating cart pill stack above it and above the home indicator.
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if !isKeyboardVisible {
                CustomTabBar(selectedTab: tabSelection)
                    .transition(.move(edge: .bottom))
            }
        }
        .overlay(alignment: .top) {
            expandedTracker
        }
        .overlay(alignment: .bottomTrailing) {
            collapsedTracker
        }
        .background(Color.surface.ignoresSafeArea())
        .preferredColorScheme(.dark)
        .onAppear {
            activeOrder.refresh()
        }
        .onChange(of: activeOrder.order?.id) { _, _ in
            isTrackerCollapsed = false
        }
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { _ in
            withAnimation(.dashitSnappy) { isKeyboardVisible = true }
        }
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in
            withAnimation(.dashitSnappy) { isKeyboardVisible = false }
        }
        // Presented here rather than from a storefront so the home and
        // categories tabs, which are both storefronts, never race to show it.
        .sheet(isPresented: $cart.isCartSheetPresented) {
            CartSheetView()
                .dashitSheet([.fraction(0.85), .large])
        }
        .fullScreenCover(isPresented: $isLiveTrackingOpen) {
            if let order = activeOrder.order {
                LiveTrackingMapView(orderId: order.id)
            }
        }
    }

    private var tabSelection: Binding<TabItem> {
        Binding(
            get: { selectedTab },
            set: { tab in
                mountedTabs.insert(tab)
                selectedTab = tab
            }
        )
    }

    @ViewBuilder
    private func screen(for tab: TabItem) -> some View {
        switch tab {
        case .home, .categories:
            StorefrontHomeView()
        case .orders:
            OrdersListView()
        case .profile:
            ProfileView()
        }
    }

    // MARK: - Live order tracker

    @ViewBuilder
    private var expandedTracker: some View {
        if let order = activeOrder.order, !isTrackerCollapsed, !isKeyboardVisible {
            LiveOrderFloatingTrackerView(
                order: order,
                onOpen: { isLiveTrackingOpen = true },
                onClose: {
                    if order.status.stage.isFinished {
                        activeOrder.retireFinishedOrder()
                    } else {
                        withAnimation(.dashitSpring) { isTrackerCollapsed = true }
                    }
                }
            )
            .padding(.top, 6)
            .transition(.move(edge: .top).combined(with: .opacity))
        }
    }

    @ViewBuilder
    private var collapsedTracker: some View {
        if let order = activeOrder.order, isTrackerCollapsed, !isKeyboardVisible {
            CollapsedOrderTrackerButton(order: order) {
                withAnimation(.dashitSpring) { isTrackerCollapsed = false }
            }
            .padding(.trailing, 16)
            .padding(.bottom, CustomTabBar.barHeight + 12 + cartDockHeight)
            .transition(.scale(scale: 0.6).combined(with: .opacity))
        }
    }

    /// Room for the storefront's floating cart pill, so the two never overlap.
    private var cartDockHeight: CGFloat {
        let storefrontVisible = selectedTab == .home || selectedTab == .categories
        return storefrontVisible && !cart.items.isEmpty ? 56 : 0
    }
}
