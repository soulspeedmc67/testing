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
    @State private var searchText = ""
    @State private var submittedSearch: String? = nil
    /// Scroll-driven chrome, held by reference so scrolling redraws only the
    /// backdrops that watch it, never this whole feed.
    @State private var chrome = HomeChromeState()

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
            // A new scroll view per picked category, so it always opens at the
            // top: the old offset, kept over a new and shorter list, showed blank.
            .id(vm.selectedCategory ?? "")
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
            // A picked category, or a search, starts at the top of its list. The
            // page before it stayed scrolled, which left the new list scrolled
            // past its end: a blank screen to scroll back from.
            .onChange(of: vm.selectedCategory) { _, _ in showFromTop(proxy) }
            .onChange(of: vm.isBrowsing) { _, browsing in
                if !browsing { showFromTop(proxy) }
            }
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
                StorefrontSearchView(
                    vm: vm,
                    query: $searchText,
                    submitted: $submittedSearch,
                    onOpenProduct: { detailProduct = $0 },
                    onRequestAgeConfirmation: { ageGateProduct = $0 },
                    onVoiceSearch: { isVoiceSearchOpen = true },
                    onClose: closeSearch
                )
                .transition(.opacity)
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

    /// The search bar rises to the top of the page as the search page fades in,
    /// so the bar the shopper tapped stays put and only what is around it
    /// changes: one movement, not a page swapped in.
    private func openSearch() {
        if let scrollProxy {
            withAnimation(.smooth(duration: 0.28)) { scrollProxy.scrollTo("pinned", anchor: .top) }
        }
        withAnimation(.easeOut(duration: 0.26)) { isSearchOpen = true }
    }

    private func closeSearch() {
        withAnimation(.easeOut(duration: 0.2)) { isSearchOpen = false }
        searchText = ""
        submittedSearch = nil
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
    private func showFromTop(_ proxy: ScrollViewProxy) {
        var transaction = Transaction()
        transaction.disablesAnimations = true
        // At once, so a stale offset never shows a blank page...
        withTransaction(transaction) { proxy.scrollTo("top", anchor: .top) }
        // ...then, after the new list has been laid out, to the pinned bar.
        DispatchQueue.main.async {
            withTransaction(transaction) { proxy.scrollTo("pinned", anchor: .top) }
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
                Text("\(products.count) item\(products.count == 1 ? "" : "s")")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.textMuted)
            }

            if products.isEmpty {
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
/// light mode, a deep ember in dark. Straight top-to-bottom, so it carries on
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
