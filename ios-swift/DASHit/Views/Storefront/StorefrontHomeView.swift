import SwiftUI
import UIKit

/// Home feed. The ETA header sits on a warm glow and scrolls away; search and
/// the category tabs pin under the status bar, as in the web shop page.
struct StorefrontHomeView: View {
    var onOpenProfile: () -> Void
    /// Opens the address menu growing out of the given on-screen frame.
    var onChangeAddress: (CGRect) -> Void

    @StateObject private var vm = StorefrontViewModel()
    @ObservedObject private var cart = CartViewModel.shared
    @ObservedObject private var storeStatus = StoreStatusStore.shared
    @State private var detailProduct: Product? = nil
    @State private var opensCartAfterDetail = false
    @State private var ageGateProduct: Product? = nil
    @ObservedObject private var addressBook = AddressBook.shared
    @State private var addressAnchor = ScreenAnchor()
    @FocusState private var isSearchFocused: Bool
    @State private var isVoiceSearchOpen = false
    /// The full-page search, laid over the feed so the product and cart
    /// sheets keep presenting from where they always do.
    @State private var isSearchOpen = false
    /// 0 = the search bar on the feed, 1 = the search page filling the screen.
    @State private var searchProgress: CGFloat = 0
    /// Where the feed's search bar was when search opened (global coordinates).
    @State private var searchSource: CGRect = .zero
    /// The bar's live frame, kept in a box so scrolling doesn't redraw the page.
    @State private var searchFieldFrame = FrameBox()
    @State private var searchText = ""
    @State private var submittedSearch: String? = nil
    /// Scroll-driven chrome, held by reference so scrolling redraws only the
    /// backdrops that watch it, never this whole feed.
    @State private var chrome = HomeChromeState()
    /// Skeletons while one category's list gives way to another's.
    @State private var isSwitchingList = false
    @State private var switchTask: Task<Void, Never>?

    private let gridColumns = Array(repeating: GridItem(.flexible(), spacing: 8, alignment: .top), count: 3)
    private let tileColumns = Array(repeating: GridItem(.flexible(), spacing: 10, alignment: .top), count: 3)

    init(onOpenProfile: @escaping () -> Void = {}, onChangeAddress: @escaping (CGRect) -> Void = { _ in }) {
        self.onOpenProfile = onOpenProfile
        self.onChangeAddress = onChangeAddress
    }

    private var address: DeliveryAddress? { addressBook.current }
    /// Kept so the search bar can be scrolled to the top when search opens.
    @State private var scrollProxy: ScrollViewProxy?

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0, pinnedViews: [.sectionHeaders]) {
                    header
                        .id("top")

                    Section {
                        if vm.isBrowsing {
                            welcomeBanner
                                .padding(.top, 14)

                            if vm.isLoading && vm.products.isEmpty {
                                HomeFeedSkeleton()
                                    .padding(.top, 28)
                                    .transition(.opacity)
                            } else {
                                categorySection
                                    .id("categories")
                                    .padding(.top, 28)
                                    .transition(.opacity)
                            }

                            if !vm.offers.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    sectionTitle("Deals for you")
                                    HeroCarouselView(offers: vm.offers) { offer in
                                        vm.selectCategory(offer.category)
                                    }
                                }
                                .padding(.top, 30)
                            }

                            ForEach(vm.departments) { department in
                                departmentSection(department)
                                    .padding(.top, 30)
                            }

                            ForEach(vm.rails) { rail in
                                ProductRailView(
                                    title: rail.title,
                                    products: rail.products,
                                    onSeeAll: { vm.selectCategory(rail.title) },
                                    onOpen: { detailProduct = $0 },
                                    onRequestAgeConfirmation: { ageGateProduct = $0 }
                                )
                                .padding(.top, 28)
                            }
                        } else {
                            resultsGrid
                                .id("results")
                                .padding(.top, 16)
                        }

                        Color.clear
                            .frame(height: 24)
                    } header: {
                        pinnedSearch
                            .id("pinned")
                    }
                }
                .background(alignment: .top) {
                    // Pulling past the top drags the feed down; the glow reaches
                    // up behind it so no bare page opens under the status bar.
                    VStack(spacing: 0) {
                        Color.headerGlow
                            .frame(height: 1000)
                        HeaderBackdrop()
                            .frame(height: 320)
                    }
                    .offset(y: -1000)
                    .allowsHitTesting(false)
                }
                .drivesTabBarVisibility(in: "homeScroll")
            }
            .coordinateSpace(.named("homeScroll"))
            .scrollDismissesKeyboard(.immediately)
            // Paints the status bar: the header's glow at rest, the page colour
            // once search has pinned, so nothing shows through behind the clock.
            .safeAreaInset(edge: .top, spacing: 0) {
                StatusBarBackdrop(chrome: chrome)
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if !isSearchFocused {
                    FloatingCartBarView {
                        cart.isCartSheetPresented = true
                    }
                    .padding(.bottom, 10)
                    .followsTabBar()
                }
            }
            // A picked category shows skeleton cards for a moment, then its items
            // fade in; the page itself stays put instead of jumping up and down.
            .onChange(of: vm.selectedCategory) { _, _ in switchList(proxy) }
            .onAppear { scrollProxy = proxy }
            .task {
                #if DEBUG
                await applyScreenshotHooks(proxy)
                #endif
            }
        }
        .background(Color.surface.ignoresSafeArea())
        .overlay {
            if isSearchOpen {
                GeometryReader { geo in
                    StorefrontSearchView(
                        vm: vm,
                        query: $searchText,
                        submitted: $submittedSearch,
                        onOpenProduct: { detailProduct = $0 },
                        onRequestAgeConfirmation: { ageGateProduct = $0 },
                        onVoiceSearch: { isVoiceSearchOpen = true },
                        onClose: closeSearch
                    )
                    // Grows out of the search bar into the whole screen, and
                    // folds back into it on the way out.
                    .modifier(SearchZoom(
                        progress: searchProgress,
                        source: searchSource,
                        container: geo.frame(in: .global),
                        size: geo.size
                    ))
                }
            }
        }
        .onChange(of: isSearchOpen) { _, isOpen in
            TabBarVisibility.shared.isSuppressed = isOpen
        }
        .sheet(item: $detailProduct, onDismiss: {
            // The cart opens only once the product sheet has gone: UIKit drops
            // a presentation made while another sheet is still on screen.
            if opensCartAfterDetail {
                opensCartAfterDetail = false
                cart.isCartSheetPresented = true
            }
        }) { product in
            ProductDetailSheet(product: product, onGoToCart: {
                opensCartAfterDetail = true
                detailProduct = nil
            })
        }
        .sheet(item: $ageGateProduct) { product in
            AgeGateSheet(product: product) {
                cart.confirmAge()
                cart.add(product: product)
            }
        }
        .sheet(isPresented: $isVoiceSearchOpen) {
            VoiceSearchSheet { phrase in
                let clean = phrase.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !clean.isEmpty else { return }
                if !ProductSearch.results(for: clean, in: vm.searchEntries).isEmpty {
                    RecentSearches.shared.record(clean)
                }
                searchText = clean
                submittedSearch = clean
                openSearch()
            }
        }
    }

    // MARK: - Header (mirrors the web mobile AppHeader)

    private var header: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 1) {
                    Text("DASHIT IN")
                        .font(.system(size: 11, weight: .heavy))
                        .tracking(1.2)
                        .foregroundColor(.textMuted)
                    HStack(alignment: .center, spacing: 8) {
                        Text(headerEta)
                            .font(.system(size: 32, weight: .black))
                            .foregroundColor(.textPrimary)
                            .contentTransition(.numericText())
                        storeChip
                    }
                }

                Spacer(minLength: 12)

                Button {
                    HapticsManager.shared.light()
                    onOpenProfile()
                } label: {
                    Image(systemName: "person.fill")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(.textPrimary)
                        .frame(width: 42, height: 42)
                        .background(Color.surfaceRaised, in: Circle())
                        .overlay(Circle().strokeBorder(Color.hairline, lineWidth: 1))
                }
                .buttonStyle(PressableButtonStyle(scale: 0.92))
                .accessibilityLabel("Account")
            }

            Button {
                onChangeAddress(addressAnchor.rect)
            } label: {
                HStack(spacing: 5) {
                    Image(systemName: "mappin")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.brandAccent)
                    // A newly picked address comes into focus out of a blur.
                    HStack(spacing: 5) {
                        Text((address?.nickname ?? "Home").uppercased())
                            .font(.system(size: 13, weight: .heavy))
                            .foregroundColor(.textPrimary)
                        Text("·")
                            .foregroundColor(.textFaint)
                        Text(addressLine)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.textSecondary)
                            .lineLimit(1)
                    }
                    .id(addressKey)
                    .transition(.blurReplace)
                    Image(systemName: "chevron.down")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.textMuted)
                }
                .animation(.smooth(duration: 0.45), value: addressKey)
                .contentShape(Rectangle())
            }
            .buttonStyle(.pressable)
            .onGeometryChange(for: CGRect.self) { geometry in
                geometry.frame(in: .global)
            } action: { frame in
                addressAnchor.rect = frame
            }
            .padding(.top, 6)
            .accessibilityLabel("Delivery address. Change")

            if !storeStatus.isOpen {
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "moon.zzz.fill")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.caution)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Store closed")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.textPrimary)
                        Text(storeStatus.closeReason)
                            .font(.system(size: 12))
                            .foregroundColor(.textMuted)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer(minLength: 0)
                }
                .padding(12)
                .dashitCard(cornerRadius: 14)
                .padding(.top, 12)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 10)
        .padding(.bottom, 14)
    }

    /// "12 minutes" from the web ETA model for the saved address; the web's
    /// fixed 18 under high demand; a plain notice outside the 5 km area.
    private var headerEta: String {
        let quote = DeliveryEta.quote(for: address?.coordinate ?? DeliveryEta.hub)
        guard let eta = storeStatus.etaMinutes(for: quote) else { return "Not here yet" }
        return "\(eta) minutes"
    }

    private var deliveryQuote: DeliveryEta.Quote {
        DeliveryEta.quote(for: address?.coordinate ?? DeliveryEta.hub)
    }

    /// Distance from the store (web header's store chip), or "Closed".
    @ViewBuilder
    private var storeChip: some View {
        if !storeStatus.isOpen {
            chip(text: "Closed", symbol: "moon.zzz.fill", tint: .caution)
        } else if deliveryQuote.isDeliverable {
            chip(text: deliveryQuote.shortDistanceText, symbol: "storefront", tint: .textSecondary)
        }
    }

    private func chip(text: String, symbol: String, tint: Color) -> some View {
        Label(text, systemImage: symbol)
            .font(.system(size: 11.5, weight: .bold))
            .foregroundColor(tint)
            .labelStyle(.titleAndIcon)
            .padding(.horizontal, 8)
            .frame(height: 24)
            .background(Color.surfaceRaised.opacity(0.75), in: Capsule())
            .overlay(Capsule().strokeBorder(Color.hairline, lineWidth: 1))
    }

    private var addressKey: String { "\(address?.nickname ?? "")|\(addressLine)" }

    private var addressLine: String {
        guard let street = address?.street, !street.isEmpty else { return "Lal Chowk, Anantnag" }
        return street
    }

    // MARK: - Pinned search + category tabs

    private var pinnedSearch: some View {
        VStack(spacing: 6) {
            StorefrontSearchField(
                text: .constant(""),
                isFocused: $isSearchFocused,
                hints: vm.searchHints,
                onVoiceSearch: { isVoiceSearchOpen = true },
                onActivate: openSearch
            )
            .onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: { searchFieldFrame.value = $0 }
            .padding(.horizontal, 16)
            .padding(.top, 6)
            CategoryTabsView(
                categories: vm.categories,
                selectedCategory: vm.selectedCategory,
                onSelect: { vm.selectCategory($0) }
            )
        }
        .background(PinnedSearchBackdrop(chrome: chrome))
        // The pinned bar is always laid out, unlike the header, which a lazy
        // stack drops once it is far off screen; so track the bar's own top.
        .onGeometryChange(for: CGFloat.self) { geometry in
            geometry.frame(in: .named("homeScroll")).minY
        } action: { minY in
            chrome.pinnedTopChanged(minY)
        }
    }

    /// The search page grows out of the bar the shopper tapped, wherever it
    /// is on the feed, and takes over the screen.
    private func openSearch() {
        searchSource = searchFieldFrame.value
        searchProgress = 0
        isSearchOpen = true
        // Next turn, so the page is on screen at the bar's size before it grows.
        DispatchQueue.main.async {
            withAnimation(.smooth(duration: 0.46)) { searchProgress = 1 }
        }
    }

    private func closeSearch() {
        searchSource = searchFieldFrame.value
        // Gentle to start, quick into the bar, so it doesn't linger at bar size.
        withAnimation(.timingCurve(0.3, 0, 0.8, 0.15, duration: 0.3)) {
            searchProgress = 0
        } completion: {
            isSearchOpen = false
            searchText = ""
            submittedSearch = nil
        }
    }

    // MARK: - Shop by category

    private func sectionTitle(_ title: String) -> some View {
        Text(title)
            .font(.system(size: 20, weight: .heavy))
            .foregroundColor(.textPrimary)
            .padding(.horizontal, 16)
    }

    /// Welcome banner with the brand's rider artwork: free delivery on orders
    /// of ₹299 or more, and nothing else.
    /// The welcome line: plain type straight on the page, no box, so the feed
    /// flows on from the search bar and categories.
    private var welcomeBanner: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 6) {
                Rectangle()
                    .fill(Color.brandOrange)
                    .frame(width: 14, height: 2)
                Text("WELCOME TO DASHIT")
                    .font(.system(size: 10.5, weight: .heavy))
                    .tracking(1.6)
                    .foregroundColor(.textMuted)
            }
            (Text("Free delivery on\norders above ")
                + Text("₹\(Int(CartBillBreakdown.freeDeliveryThreshold))").foregroundColor(.brandAccent))
                .font(.system(size: 24, weight: .heavy))
                .foregroundColor(.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, 8)
            Text("Fresh groceries at your door in minutes.")
                .font(.system(size: 13))
                .foregroundColor(.textMuted)
                .padding(.top, 6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.top, 6)
        .accessibilityElement(children: .combine)
    }

    private var categorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionTitle("Shop by category")

            LazyVGrid(columns: tileColumns, spacing: 12) {
                ForEach(vm.topCategoryTiles) { tile in
                    CategoryCollageTile(tile: tile) {
                        vm.selectCategory(tile.name)
                    }
                }
            }
            .padding(.horizontal, 16)
        }
    }

    /// A department grid: four compact category cards per row.
    private func departmentSection(_ department: Department) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionTitle(department.title)

            LazyVGrid(
                columns: Array(repeating: GridItem(.flexible(), spacing: 10, alignment: .top), count: 4),
                spacing: 14
            ) {
                ForEach(department.tiles) { tile in
                    CategoryCard(tile: tile) {
                        vm.selectCategory(tile.name)
                    }
                }
            }
            .padding(.horizontal, 16)
        }
    }

    // MARK: - Filtered results

    /// Puts the list right under the pinned search bar: the header scrolled
    /// away, the bar at the top, the first items directly beneath it.
    /// Swaps the list under the tabs. While search is pinned (scrolled into a
    /// list), the new list starts right under it; with the header still in view
    /// nothing moves. Skeletons cover the swap, so a longer or shorter list
    /// never shows the page jumping or a blank stretch.
    private func switchList(_ proxy: ScrollViewProxy) {
        switchTask?.cancel()
        isSwitchingList = true
        if chrome.pinProgress >= 1 {
            var transaction = Transaction()
            transaction.disablesAnimations = true
            withTransaction(transaction) { proxy.scrollTo("pinned", anchor: .top) }
        }
        switchTask = Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(260))
            guard !Task.isCancelled else { return }
            withAnimation(.easeOut(duration: 0.25)) { isSwitchingList = false }
        }
    }

    private var resultsGrid: some View {
        let products = vm.filteredProducts

        return VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(vm.selectedCategory ?? "Results")
                    .font(.system(size: 19, weight: .bold))
                    .foregroundColor(.textPrimary)
                Spacer()
                Text(isSwitchingList ? " " : "\(products.count) item\(products.count == 1 ? "" : "s")")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.textMuted)
            }

            if isSwitchingList {
                ProductGridSkeleton(columns: 3, count: 12)
                    .transition(.opacity)
            } else if products.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 28))
                        .foregroundColor(.textFaint)
                    Text(vm.searchQuery.trimmingCharacters(in: .whitespaces).isEmpty
                         ? "Nothing here yet"
                         : "Nothing matches “\(vm.searchQuery)”")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.textSecondary)
                    Text("Try another word, or pick a category above.")
                        .font(.system(size: 13))
                        .foregroundColor(.textMuted)
                }
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
            } else {
                PagedProductGrid(
                    products: products,
                    listKey: "\(vm.selectedCategory ?? "")|\(vm.searchQuery)",
                    columns: gridColumns
                ) { product in
                    ProductCardView(
                        product: product,
                        onOpen: { detailProduct = product },
                        onRequestAgeConfirmation: { ageGateProduct = product }
                    )
                }
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Debug

    #if DEBUG
    /// Drives the screen into the state the CI screenshot job asked for.
    private func applyScreenshotHooks(_ proxy: ScrollViewProxy) async {
        guard ScreenshotHooks.scrollTarget != nil
                || ScreenshotHooks.openProductId != nil
                || ScreenshotHooks.openCart
                || ScreenshotHooks.openAddressPicker else { return }
        try? await Task.sleep(for: .seconds(1.5))
        if let target = ScreenshotHooks.scrollTarget {
            proxy.scrollTo(target, anchor: .top)
        }
        if let id = ScreenshotHooks.openProductId {
            detailProduct = vm.products.first(where: { $0.id == id }) ?? vm.products.first
        }
        if ScreenshotHooks.openCart {
            cart.isCartSheetPresented = true
        }
        if ScreenshotHooks.openAddressPicker {
            onChangeAddress(addressAnchor.rect)
        }
    }
    #endif
}

// MARK: - Header chrome

/// How far the search bar has pinned, driven by the header's position.
@MainActor
final class HomeChromeState: ObservableObject {
    /// 0 while the header is in view, 1 once search has pinned under the clock.
    @Published private(set) var pinProgress: CGFloat = 0

    /// `minY` is the pinned bar's top in the scroll view: the header's height
    /// at rest, 0 once it has pinned under the status bar.
    func pinnedTopChanged(_ minY: CGFloat) {
        let raw = min(1, max(0, 1 - minY / 44))
        let stepped = (raw * 10).rounded() / 10
        if stepped != pinProgress {
            pinProgress = stepped
        }
    }
}

/// The warm glow behind the header, search and tabs: the web header's peach in
/// light mode, a warm amber in dark. Straight top-to-bottom, so it carries on
/// from the flat colour behind the status bar without a seam.
private struct HeaderBackdrop: View {
    var body: some View {
        LinearGradient(colors: [Color.headerGlow, Color.surface], startPoint: .top, endPoint: .bottom)
    }
}

private struct StatusBarBackdrop: View {
    @ObservedObject var chrome: HomeChromeState

    var body: some View {
        Color.clear
            .frame(height: 0)
            .background(Color.surface.opacity(chrome.pinProgress))
            .background(Color.headerGlow)
            .animation(.easeOut(duration: 0.15), value: chrome.pinProgress)
    }
}

private struct PinnedSearchBackdrop: View {
    @ObservedObject var chrome: HomeChromeState

    var body: some View {
        Color.surface
            .opacity(chrome.pinProgress)
            .animation(.easeOut(duration: 0.15), value: chrome.pinProgress)
    }
}

/// A frame written on every scroll without redrawing anything: read once,
/// when search opens or closes.
private final class FrameBox {
    var value: CGRect = .zero
}

/// The search page as a panel that grows from the feed's search bar to the
/// whole screen. The panel's shape runs from the bar's rounded rectangle to the
/// screen; the page inside rides along, so its own search field starts where
/// the tapped bar was and settles at the top.
private struct SearchZoom: ViewModifier, Animatable {
    var progress: CGFloat
    let source: CGRect      // the feed's bar, global
    let container: CGRect   // this overlay, global
    let size: CGSize

    var animatableData: CGFloat {
        get { progress }
        set { progress = newValue }
    }

    /// Where the page's own field sits at rest (StorefrontSearchView.searchBar:
    /// 6 pt from the top, after the 6 pt inset and the 44 pt back button).
    private static let fieldRest = CGPoint(x: 50, y: 6)

    func body(content: Content) -> some View {
        let p = min(max(progress, 0), 1)
        // The shape fills a little ahead of the page's glide, so its lower edge
        // doesn't creep over the feed at the end.
        let g = 1 - (1 - p) * (1 - p)
        let bar = source == .zero
            ? CGRect(x: 16, y: Self.fieldRest.y, width: size.width - 32, height: 50)
            : source.offsetBy(dx: -container.minX, dy: -container.minY)
        // The panel reaches past the safe areas, where the page's background goes.
        let full = CGRect(x: 0, y: -container.minY - 60, width: size.width, height: size.height + container.minY + 160)
        let panel = CGRect(
            x: bar.minX + (full.minX - bar.minX) * g,
            y: bar.minY + (full.minY - bar.minY) * g,
            width: bar.width + (full.width - bar.width) * g,
            height: bar.height + (full.height - bar.height) * g
        )
        content
            .offset(
                x: (bar.minX - Self.fieldRest.x) * (1 - p),
                y: (bar.minY - Self.fieldRest.y) * (1 - p)
            )
            .mask(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 16 * (1 - g), style: .continuous)
                    .frame(width: panel.width, height: panel.height)
                    .offset(x: panel.minX, y: panel.minY)
            }
            // Solid except while still about the bar's size, so the page and
            // the feed are never seen through each other.
            .opacity(min(1, g / 0.12))
    }
}
