import SwiftUI
import UIKit
import Combine

struct RootView: View {
    @State private var selectedTab: TabItem = .home
    /// Tabs are mounted on first visit and then kept alive, like a native tab
    /// bar, so scroll position and listeners survive switching back and forth.
    @State private var mountedTabs: Set<TabItem> = [.home]
    @State private var isLiveTrackingOpen = false
    /// The home address row's on-screen frame while the address menu is open.
    @State private var addressMenuAnchor: CGRect?
    @State private var isAddressSearchOpen = false
    @State private var isAddressPickerOpen = false
    @State private var isKeyboardVisible = false
    @State private var isProfileOpen = false
    @State private var isAddItemsOpen = false
    /// The delivered order being celebrated, once other screens are out of the way.
    @State private var celebrationOrder: Order?
    /// "light", "dark" or "system", same values as the web's `dashit_theme`.
    @AppStorage("dashit_theme") private var themePreference = "system"

    @ObservedObject private var activeOrder = ActiveOrderStore.shared
    @ObservedObject private var cart = CartViewModel.shared
    @ObservedObject private var tabBar = TabBarVisibility.shared
    @Environment(\.scenePhase) private var scenePhase

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
        // The floating tab bar insets every screen's safe area: content scrolls
        // beneath it and comes to rest above it, and the cart pill stacks on top.
        // The order pill rides on top of the bar, so screens (and the cart
        // pill) make room for it without knowing it exists. Scrolling down a
        // feed tucks the bar away and the pills drop into its slot, but only by
        // offset: the inset keeps its height, because resizing it would re-lay
        // out every scroll view in the middle of a drag and make it jump.
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if !isKeyboardVisible {
                VStack(spacing: 10) {
                    orderPill
                        .followsTabBar()
                    CustomTabBar(selectedTab: tabSelection)
                        .offset(y: tabBar.isHidden ? CustomTabBar.hiddenOffset : 0)
                        .opacity(tabBar.isHidden ? 0 : 1)
                        .allowsHitTesting(!tabBar.isHidden)
                        .accessibilityHidden(tabBar.isHidden)
                }
                .transition(.move(edge: .bottom))
            }
        }
        .overlay {
            addressMenu
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
        .onChange(of: selectedTab) { _, _ in
            tabBar.show()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                activeOrder.resume()
            }
        }
        .onChange(of: activeOrder.deliveredCelebration?.id) { _, id in
            guard id != nil, let delivered = activeOrder.deliveredCelebration else { return }
            // Clear whatever is on screen first; UIKit drops a sheet presented over another.
            let wasCovered = isLiveTrackingOpen || cart.isCartSheetPresented || isProfileOpen || isAddItemsOpen
                || isAddressSearchOpen || isAddressPickerOpen
            isLiveTrackingOpen = false
            cart.isCartSheetPresented = false
            isProfileOpen = false
            isAddItemsOpen = false
            isAddressSearchOpen = false
            isAddressPickerOpen = false
            DispatchQueue.main.asyncAfter(deadline: .now() + (wasCovered ? 0.6 : 0.2)) {
                celebrationOrder = delivered
            }
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
        .sheet(isPresented: $isAddressSearchOpen) {
            AddressSearchView()
        }
        .sheet(isPresented: $isAddressPickerOpen) {
            AddressPickerMapView(addsNewAddress: true)
        }
        .sheet(isPresented: $isAddItemsOpen) {
            if let order = activeOrder.order {
                AddItemsSheet(order: order)
            }
        }
        .sheet(item: $celebrationOrder, onDismiss: {
            activeOrder.finishCelebration()
        }) { order in
            DeliveredCelebrationSheet(order: order) {
                cart.reorder(order.items)
            }
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
            StorefrontHomeView(
                onOpenProfile: { isProfileOpen = true },
                onChangeAddress: { anchor in addressMenuAnchor = anchor }
            )
        case .orderAgain:
            OrdersListView(onOpenProfile: { isProfileOpen = true })
        case .categories:
            CategoriesView()
        }
    }

    // MARK: - Live order status

    /// The live order lives in a pill above the tab bar, never as a banner
    /// over the screen. Tap it for the live map.
    @ViewBuilder
    private var orderPill: some View {
        if let order = activeOrder.order {
            OrderStatusPill(
                order: order,
                tracking: activeOrder.liveTracking,
                onOpen: { isLiveTrackingOpen = true },
                onDismiss: { activeOrder.retireFinishedOrder() }
            )
            .frame(maxWidth: CustomTabBar.maxWidth)
            .padding(.horizontal, CustomTabBar.sideInset)
            .transition(.scale(scale: 0.6, anchor: .bottom).combined(with: .opacity))
        }
    }

    // MARK: - Address menu

    @ViewBuilder
    private var addressMenu: some View {
        if let anchor = addressMenuAnchor {
            AddressMenuPopup(
                anchor: anchor,
                onSearch: { isAddressSearchOpen = true },
                onPickOnMap: { isAddressPickerOpen = true },
                onDismiss: { addressMenuAnchor = nil }
            )
        }
    }

    private var colorScheme: ColorScheme? {
        switch themePreference {
        case "light": return .light
        case "dark": return .dark
        default: return nil
        }
    }
}
