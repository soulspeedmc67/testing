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
    @State private var isProfileOpen = false
    @State private var isAddItemsOpen = false
    @State private var isCancelOrderConfirmOpen = false
    /// "light", "dark" or "system", same values as the web's `dashit_theme`.
    @AppStorage("dashit_theme") private var themePreference = "system"

    @ObservedObject private var activeOrder = ActiveOrderStore.shared
    @ObservedObject private var cart = CartViewModel.shared

    var body: some View {
        customerStorefront
    }

    private var customerStorefront: some View {
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
        // The floating tab bar insets every screen's safe area: content scrolls
        // beneath it and comes to rest above it, and the cart pill stacks on top.
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
        .preferredColorScheme(colorScheme)
        .onAppear {
            activeOrder.refresh()
            #if DEBUG
            if let raw = ScreenshotHooks.initialTab, let tab = TabItem(rawValue: raw) {
                tabSelection.wrappedValue = tab
            }
            if ScreenshotHooks.openProfile {
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                    isProfileOpen = true
                }
            }
            if ScreenshotHooks.demoOrder {
                activeOrder.showDemoOrder()
                if ScreenshotHooks.openTracking {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                        isLiveTrackingOpen = true
                    }
                }
                if ScreenshotHooks.openAddItems {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                        isAddItemsOpen = true
                    }
                }
            }
            #endif
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
        // Presented here rather than from a tab so the home and categories
        // screens, which both show the cart pill, never race to open it.
        .sheet(isPresented: $cart.isCartSheetPresented, onDismiss: {
            // Presenting while the sheets are still animating away is dropped
            // by UIKit, so tracking opens from here, after the dismissal.
            if activeOrder.pendingTrackingPresentation {
                activeOrder.pendingTrackingPresentation = false
                isLiveTrackingOpen = true
            }
        }) {
            CartSheetView()
                .dashitSheet([.fraction(0.85), .large])
        }
        .sheet(isPresented: $isProfileOpen) {
            ProfileView()
                .dashitSheet([.large])
        }
        .sheet(isPresented: $isAddItemsOpen) {
            if let order = activeOrder.order {
                AddItemsSheet(order: order)
            }
        }
        .confirmationDialog("Cancel this order?", isPresented: $isCancelOrderConfirmOpen, titleVisibility: .visible) {
            Button("Cancel and keep items in cart", role: .destructive) {
                Task { _ = await activeOrder.cancelActiveOrder(restoreCart: true) }
            }
            Button("Cancel order", role: .destructive) {
                Task { _ = await activeOrder.cancelActiveOrder(restoreCart: false) }
            }
            Button("Keep order", role: .cancel) {}
        } message: {
            Text("The store will stop preparing it straight away.")
        }
        .fullScreenCover(isPresented: $isLiveTrackingOpen) {
            if let order = activeOrder.order {
                LiveTrackingMapView(orderId: order.id, initialOrder: order)
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
        case .home:
            StorefrontHomeView(onOpenProfile: { isProfileOpen = true })
        case .orderAgain:
            OrdersListView(onOpenProfile: { isProfileOpen = true })
        case .categories:
            CategoriesView()
        }
    }

    // MARK: - Live order tracker

    @ViewBuilder
    private var expandedTracker: some View {
        if let order = activeOrder.order, !isTrackerCollapsed, !isKeyboardVisible {
            LiveOrderFloatingTrackerView(
                order: order,
                tracking: activeOrder.liveTracking,
                onOpen: { isLiveTrackingOpen = true },
                onClose: {
                    if order.status.stage.isFinished {
                        activeOrder.retireFinishedOrder()
                    } else {
                        withAnimation(.dashitSpring) { isTrackerCollapsed = true }
                    }
                },
                onAddItems: { isAddItemsOpen = true },
                onCancelOrder: { isCancelOrderConfirmOpen = true }
            )
            .padding(.top, 6)
            .background(alignment: .top) {
                // Solid behind the card (it covers the header anyway), fading out just below it.
                VStack(spacing: 0) {
                    Color.surface
                    LinearGradient(
                        colors: [Color.surface, Color.surface.opacity(0)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .frame(height: 24)
                }
                .padding(.bottom, -24)
                .ignoresSafeArea(edges: .top)
                .allowsHitTesting(false)
            }
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
            .padding(.bottom, CustomTabBar.dockHeight + 12 + cartDockHeight)
            .transition(.scale(scale: 0.6).combined(with: .opacity))
        }
    }

    /// Room for the floating cart pill, so the two never overlap.
    private var cartDockHeight: CGFloat {
        let showsCartPill = selectedTab == .home || selectedTab == .categories
        return showsCartPill && !cart.items.isEmpty ? 66 : 0
    }

    private var colorScheme: ColorScheme? {
        switch themePreference {
        case "light": return .light
        case "dark": return .dark
        default: return nil
        }
    }
}
