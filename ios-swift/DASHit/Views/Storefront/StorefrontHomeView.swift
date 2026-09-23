import SwiftUI

/// Home feed. The ETA header scrolls away; search and the category tabs pin
/// under the status bar, as in the web shop page.
struct StorefrontHomeView: View {
    var onOpenProfile: () -> Void

    @StateObject private var vm = StorefrontViewModel()
    @ObservedObject private var cart = CartViewModel.shared
    @ObservedObject private var storeStatus = StoreStatusStore.shared
    @State private var detailProduct: Product? = nil
    @State private var ageGateProduct: Product? = nil
    @State private var isAddressPickerOpen = false
    @State private var address: DeliveryAddress? = LocalStorage.shared.loadAddress()
    @FocusState private var isSearchFocused: Bool

    private let gridColumns = Array(repeating: GridItem(.flexible(), spacing: 8, alignment: .top), count: 3)
    private let tileColumns = Array(repeating: GridItem(.flexible(), spacing: 10, alignment: .top), count: 3)

    init(onOpenProfile: @escaping () -> Void = {}) {
        self.onOpenProfile = onOpenProfile
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0, pinnedViews: [.sectionHeaders]) {
                    header
                        .id("top")

                    Section {
                        if vm.isBrowsing {
                            if !vm.offers.isEmpty {
                                HeroCarouselView(offers: vm.offers) { offer in
                                    vm.selectCategory(offer.category)
                                }
                                .padding(.top, 16)
                            }

                            categorySection
                                .id("categories")
                                .padding(.top, 26)

                            ForEach(vm.departments) { department in
                                departmentSection(department)
                                    .padding(.top, 28)
                            }

                            ForEach(vm.rails) { rail in
                                ProductRailView(
                                    title: rail.title,
                                    products: rail.products,
                                    onSeeAll: { vm.selectCategory(rail.title) },
                                    onOpen: { detailProduct = $0 },
                                    onRequestAgeConfirmation: { ageGateProduct = $0 }
                                )
                                .padding(.top, 26)
                            }
                        } else {
                            resultsGrid
                                .padding(.top, 16)
                        }

                        Color.clear
                            .frame(height: 24)
                    } header: {
                        pinnedSearch
                    }
                }
            }
            .scrollDismissesKeyboard(.immediately)
            // Covers the status bar so content scrolling up under the pinned
            // search is hidden rather than showing through behind the clock.
            .safeAreaInset(edge: .top, spacing: 0) {
                Color.clear
                    .frame(height: 0)
                    .background(Color.surface)
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if !isSearchFocused {
                    FloatingCartBarView {
                        cart.isCartSheetPresented = true
                    }
                    .padding(.bottom, 10)
                }
            }
            .task {
                #if DEBUG
                await applyScreenshotHooks(proxy)
                #endif
            }
        }
        .background(Color.surface.ignoresSafeArea())
        .sheet(item: $detailProduct) { product in
            ProductDetailSheet(product: product)
        }
        .sheet(item: $ageGateProduct) { product in
            AgeGateSheet(product: product) {
                cart.confirmAge()
                cart.add(product: product)
            }
        }
        .sheet(isPresented: $isAddressPickerOpen, onDismiss: {
            address = LocalStorage.shared.loadAddress()
        }) {
            AddressPickerMapView()
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
                    Text(headerEta)
                        .font(.system(size: 32, weight: .black))
                        .foregroundColor(.textPrimary)
                        .contentTransition(.numericText())
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
                HapticsManager.shared.light()
                isAddressPickerOpen = true
            } label: {
                HStack(spacing: 5) {
                    Image(systemName: "mappin")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.brandAccent)
                    Text((address?.nickname ?? "Home").uppercased())
                        .font(.system(size: 13, weight: .heavy))
                        .foregroundColor(.textPrimary)
                    Text("·")
                        .foregroundColor(.textFaint)
                    Text(addressLine)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.textSecondary)
                        .lineLimit(1)
                    Image(systemName: "chevron.down")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.textMuted)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.pressable)
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
                .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Color.hairline, lineWidth: 1))
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

    private var addressLine: String {
        guard let street = address?.street, !street.isEmpty else { return "Lal Chowk, Anantnag" }
        return street
    }

    // MARK: - Pinned search + category tabs

    private var pinnedSearch: some View {
        VStack(spacing: 6) {
            StorefrontSearchField(text: $vm.searchQuery, isFocused: $isSearchFocused)
                .padding(.horizontal, 16)
                .padding(.top, 6)
            CategoryTabsView(
                categories: vm.categories,
                selectedCategory: vm.selectedCategory,
                onSelect: { vm.selectCategory($0) }
            )
        }
        .background(Color.surface)
    }

    // MARK: - Shop by category

    private var categorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Top categories")
                .font(.system(size: 19, weight: .bold))
                .foregroundColor(.textPrimary)
                .padding(.horizontal, 16)

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
            Text(department.title)
                .font(.system(size: 19, weight: .bold))
                .foregroundColor(.textPrimary)
                .padding(.horizontal, 16)

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
                LazyVGrid(columns: gridColumns, spacing: 10) {
                    ForEach(products) { product in
                        ProductCardView(
                            product: product,
                            onOpen: { detailProduct = product },
                            onRequestAgeConfirmation: { ageGateProduct = product }
                        )
                    }
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
            detailProduct = vm.products.first(where: { $0.id == id })
        }
        if ScreenshotHooks.openCart {
            cart.isCartSheetPresented = true
        }
        if ScreenshotHooks.openAddressPicker {
            isAddressPickerOpen = true
        }
    }
    #endif
}
