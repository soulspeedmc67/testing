import SwiftUI

/// Categories tab: a vertical category sidebar on the left and the selected
/// category's products in a two-column grid on the right.
struct CategoriesView: View {
    @StateObject private var vm = StorefrontViewModel()
    @ObservedObject private var cart = CartViewModel.shared
    @State private var selectedCategoryID: String? = nil
    @State private var detailProduct: Product? = nil
    @State private var opensCartAfterDetail = false
    @State private var ageGateProduct: Product? = nil

    private let gridColumns = Array(repeating: GridItem(.flexible(), spacing: 8, alignment: .top), count: 2)
    private static let sidebarWidth: CGFloat = 88

    private var tiles: [CategoryTile] { vm.categoryTiles }

    private var selectedTile: CategoryTile? {
        tiles.first(where: { $0.id == selectedCategoryID }) ?? tiles.first
    }

    private var products: [Product] {
        guard let name = selectedTile?.name else { return [] }
        return vm.products.filter { $0.cat.caseInsensitiveCompare(name) == .orderedSame }
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Categories")
                    .font(.system(size: 24, weight: .black))
                    .foregroundColor(.textPrimary)
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 10)

            Rectangle()
                .fill(Color.hairline)
                .frame(height: 1)

            HStack(spacing: 0) {
                sidebar
                Rectangle()
                    .fill(Color.hairline)
                    .frame(width: 1)
                productPane
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            FloatingCartBarView {
                cart.isCartSheetPresented = true
            }
            .padding(.bottom, 10)
            .followsTabBar()
        }
        .background(Color.surface.ignoresSafeArea())
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
    }

    // MARK: - Sidebar

    private var sidebar: some View {
        ScrollView(showsIndicators: false) {
            LazyVStack(spacing: 2) {
                ForEach(tiles) { tile in
                    sidebarItem(tile)
                }
            }
            .padding(.vertical, 6)
        }
        .frame(width: Self.sidebarWidth)
        .background(Color.surfaceSunken)
    }

    private func sidebarItem(_ tile: CategoryTile) -> some View {
        let isSelected = tile.id == selectedTile?.id

        return Button {
            guard !isSelected else { return }
            HapticsManager.shared.selection()
            withAnimation(.dashitSpring) {
                selectedCategoryID = tile.id
            }
        } label: {
            VStack(spacing: 6) {
                Color.surfaceMuted
                    .frame(width: 52, height: 52)
                    .overlay {
                        AsyncImage(url: tile.previewImages.first.flatMap { URL(string: $0) }) { phase in
                            if let image = phase.image {
                                image
                                    .resizable()
                                    .scaledToFill()
                            } else {
                                Color.surfaceMuted
                            }
                        }
                    }
                    .clipShape(Circle())
                    .overlay(Circle().strokeBorder(isSelected ? Color.brandOrange : Color.clear, lineWidth: 2))
                    .scaleEffect(isSelected ? 1.06 : 1)
                Text(tile.name)
                    .font(.system(size: 11, weight: isSelected ? .bold : .medium))
                    .foregroundColor(isSelected ? .textPrimary : .textMuted)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .padding(.horizontal, 4)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(isSelected ? Color.surface : Color.clear)
            .overlay(alignment: .trailing) {
                if isSelected {
                    UnevenRoundedRectangle(topLeadingRadius: 3, bottomLeadingRadius: 3)
                        .fill(Color.brandOrange)
                        .frame(width: 4, height: 48)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(PressableButtonStyle(scale: 0.95))
        .accessibilityLabel(tile.name)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    // MARK: - Products

    private var productPane: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(selectedTile?.name ?? "")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundColor(.textPrimary)
                        Spacer()
                        Text("\(products.count) item\(products.count == 1 ? "" : "s")")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.textMuted)
                    }
                    .id("top")

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
                .padding(12)
                .padding(.bottom, 12)
                .drivesTabBarVisibility(in: "categoriesScroll")
            }
            .coordinateSpace(.named("categoriesScroll"))
            .onChange(of: selectedCategoryID) { _, _ in
                proxy.scrollTo("top", anchor: .top)
            }
        }
    }
}
