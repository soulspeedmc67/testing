import SwiftUI

struct StorefrontHomeView: View {
    @StateObject private var vm = StorefrontViewModel()
    @ObservedObject private var cart = CartViewModel.shared
    @State private var detailProduct: Product? = nil
    @State private var ageGateProduct: Product? = nil
    @State private var isAddressPickerOpen = false
    @FocusState private var isSearchFocused: Bool

    private let gridColumns = Array(repeating: GridItem(.flexible(), spacing: 8, alignment: .top), count: 3)

    var body: some View {
        VStack(spacing: 0) {
            header
            searchBar

            ScrollView {
                LazyVStack(alignment: .leading, spacing: 22) {
                    if vm.isBrowsing && !vm.offers.isEmpty {
                        HeroCarouselView(offers: vm.offers) { offer in
                            vm.selectCategory(offer.category)
                        }
                    }

                    CategoryRailView(
                        categories: vm.categories,
                        selectedCategory: vm.selectedCategory,
                        onSelect: { vm.selectCategory($0) }
                    )

                    if vm.isBrowsing {
                        ForEach(vm.rails) { rail in
                            ProductRailView(
                                title: rail.title,
                                products: rail.products,
                                onSeeAll: { vm.selectCategory(rail.title) },
                                onOpen: { detailProduct = $0 },
                                onRequestAgeConfirmation: { ageGateProduct = $0 }
                            )
                        }
                    } else {
                        resultsGrid
                    }
                }
                .padding(.top, 4)
                .padding(.bottom, 20)
            }
            .scrollDismissesKeyboard(.immediately)
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if !isSearchFocused {
                    FloatingCartBarView {
                        cart.isCartSheetPresented = true
                    }
                    .padding(.bottom, 10)
                }
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
        .sheet(isPresented: $isAddressPickerOpen) {
            AddressPickerMapView()
        }
    }

    // MARK: - Header (layout unchanged; colours only)

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.caution)
                    Text("DASHIT IN 8 MINS")
                        .font(.dashitCaptionBold)
                        .foregroundColor(.white)
                }

                Button(action: {
                    isAddressPickerOpen = true
                    HapticsManager.shared.light()
                }) {
                    HStack(spacing: 4) {
                        Text("Lal Chowk, Anantnag")
                            .font(.dashitBodyBold)
                            .foregroundColor(.white)
                        Image(systemName: "chevron.down")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.textMuted)
                    }
                }
            }

            Spacer()

            // Profile Button
            Button(action: {}) {
                Image(systemName: "person.crop.circle.fill")
                    .font(.system(size: 28))
                    .foregroundColor(.brandAccent)
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 12)
    }

    // MARK: - Search

    private var searchBar: some View {
        let shape = RoundedRectangle(cornerRadius: 12, style: .continuous)

        return HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.textMuted)
            TextField("", text: $vm.searchQuery, prompt: Text("Search 'milk', 'bread', 'chips'...").foregroundColor(.textFaint))
                .font(.dashitBody)
                .foregroundColor(.textPrimary)
                .focused($isSearchFocused)
                .submitLabel(.search)
                .autocorrectionDisabled()
            if !vm.searchQuery.isEmpty {
                Button {
                    vm.searchQuery = ""
                    HapticsManager.shared.tick()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.textMuted)
                        .frame(width: 30, height: 30)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("Clear search")
            }
        }
        .padding(.horizontal, 12)
        .frame(height: 46)
        .background(Color.surfaceRaised, in: shape)
        .overlay(shape.strokeBorder(isSearchFocused ? Color.brandOrange.opacity(0.7) : Color.hairline, lineWidth: 1))
        .animation(.dashitSnappy, value: isSearchFocused)
        .padding(.horizontal, 16)
        .padding(.bottom, 12)
    }

    // MARK: - Filtered results

    private var resultsGrid: some View {
        let products = vm.filteredProducts

        return VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(vm.selectedCategory ?? "Results")
                    .font(.system(size: 17, weight: .bold))
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
                    Text("Try another word, or browse the categories above.")
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
}
