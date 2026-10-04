import SwiftUI

/// Categories tab: a few departments down the left, and on the right the
/// picked department's categories as chips, the shelves inside the picked
/// category as smaller chips, and its products in a two-column grid.
/// (The sidebar used to list every category, which is a lot to take in.)
struct CategoriesView: View {
    @StateObject private var vm = StorefrontViewModel()
    @ObservedObject private var cart = CartViewModel.shared
    @State private var selectedDepartmentID: String? = nil
    @State private var selectedCategoryID: String? = nil
    /// The shelf inside the category; "" shows all of it.
    @State private var selectedSub = ""
    @State private var detailProduct: Product? = nil
    @State private var opensCartAfterDetail = false
    @State private var ageGateProduct: Product? = nil

    private let gridColumns = Array(repeating: GridItem(.flexible(), spacing: 8, alignment: .top), count: 2)
    private static let sidebarWidth: CGFloat = 88

    private var departments: [Department] { vm.departments }

    private var selectedDepartment: Department? {
        departments.first(where: { $0.id == selectedDepartmentID }) ?? departments.first
    }

    /// The categories inside the picked department.
    private var tiles: [CategoryTile] { selectedDepartment?.tiles ?? [] }

    private var selectedTile: CategoryTile? {
        tiles.first(where: { $0.id == selectedCategoryID }) ?? tiles.first
    }

    private var shelfProducts: [Product] {
        guard let name = selectedTile?.name else { return [] }
        return vm.products(inCategory: name)
    }

    /// The shelves inside the picked category, biggest first.
    private var subShelves: [String] {
        var counts: [String: Int] = [:]
        for product in shelfProducts where !product.sub.isEmpty {
            counts[product.sub, default: 0] += 1
        }
        return counts.sorted { $0.value == $1.value ? $0.key < $1.key : $0.value > $1.value }.map(\.key)
    }

    private var products: [Product] {
        selectedSub.isEmpty ? shelfProducts : shelfProducts.filter { $0.sub == selectedSub }
    }

    /// One chip in a row of choices.
    private struct Chip: Identifiable {
        let id: String
        let label: String
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

    /// Nothing to show yet: the catalogue is still on its way.
    private var isLoadingCatalogue: Bool { vm.isLoading && vm.products.isEmpty }

    private var sidebar: some View {
        ScrollView(showsIndicators: false) {
            if isLoadingCatalogue {
                CategorySidebarSkeleton()
            } else {
                LazyVStack(spacing: 2) {
                    ForEach(departments) { department in
                        sidebarItem(department)
                    }
                }
                .padding(.vertical, 6)
                .transition(.opacity)
            }
        }
        .frame(width: Self.sidebarWidth)
        .background(Color.surfaceSunken)
    }

    private func sidebarItem(_ department: Department) -> some View {
        let isSelected = department.id == selectedDepartment?.id
        // The department shows its first category's photo.
        let tile = CategoryTile(
            id: department.id,
            name: department.title,
            previewImages: department.tiles.first?.previewImages ?? [],
            productCount: department.tiles.reduce(0) { $0 + $1.productCount }
        )

        return Button {
            guard !isSelected else { return }
            HapticsManager.shared.selection()
            selectedDepartmentID = department.id
            selectedCategoryID = nil
            selectedSub = ""
        } label: {
            VStack(spacing: 6) {
                Color.surfaceMuted
                    .frame(width: 52, height: 52)
                    .overlay {
                        CachedAsyncImage(url: tile.previewImages.first.flatMap { URL(string: $0) }) { phase in
                            if let image = phase.image {
                                image
                                    .resizable()
                                    .scaledToFill()
                            } else if phase.error == nil && tile.previewImages.first?.isEmpty == false {
                                ShimmerView()
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
        // A new scroll view per shelf (the id below), so every shelf opens at
        // its first item instead of at the old shelf's scroll position.
        // Nothing scrolls it by hand as well: a scrollTo fired while the lazy
        // grid under it is being replaced can leave the pane empty until it is
        // touched, and a fresh scroll view already starts at the top.
        ScrollView {
            if isLoadingCatalogue {
                VStack(alignment: .leading, spacing: 12) {
                    SkeletonBlock(width: 120, height: 17)
                        .shimmering()
                    ProductGridSkeleton(columns: 2, count: 6)
                }
                .padding(12)
            } else if shelfProducts.isEmpty {
                // Never a bare pane: say what is going on.
                emptyShelf
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    chipRow(tiles.map { Chip(id: $0.id, label: $0.name) }, selected: selectedTile?.id ?? "", filled: true) { id in
                        HapticsManager.shared.selection()
                        selectedCategoryID = id
                        selectedSub = ""
                    }
                    if subShelves.count > 1 {
                        chipRow([Chip(id: "", label: "All")] + subShelves.map { Chip(id: $0, label: $0) }, selected: selectedSub, filled: false) { id in
                            selectedSub = id
                        }
                    }

                    HStack(alignment: .firstTextBaseline) {
                        Text(selectedTile?.name ?? "")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundColor(.textPrimary)
                        Spacer()
                        Text("\(products.count) item\(products.count == 1 ? "" : "s")")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.textMuted)
                    }

                    PagedProductGrid(products: products, listKey: "\(selectedTile?.id ?? "")|\(selectedSub)", columns: gridColumns) { product in
                        ProductCardView(
                            product: product,
                            onOpen: { detailProduct = product },
                            onRequestAgeConfirmation: { ageGateProduct = product }
                        )
                    }
                }
                .padding(12)
                .padding(.bottom, 12)
                .drivesTabBarVisibility(in: "categoriesScroll")
            }
        }
        .coordinateSpace(.named("categoriesScroll"))
        .id("\(selectedTile?.id ?? "")|\(selectedSub)")
    }

    /// A row of chips that scrolls sideways. `filled` marks the picked one
    /// solid (categories); otherwise with an orange outline (shelves).
    private func chipRow(_ chips: [Chip], selected: String, filled: Bool, onSelect: @escaping (String) -> Void) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(chips) { chip in
                    chipButton(chip, isSelected: chip.id == selected, filled: filled, onSelect: onSelect)
                }
            }
        }
    }

    private func chipButton(_ chip: Chip, isSelected: Bool, filled: Bool, onSelect: @escaping (String) -> Void) -> some View {
        let shape = RoundedRectangle(cornerRadius: filled ? 12 : 16, style: .continuous)
        let background: Color = (isSelected && filled) ? .textPrimary : .surfaceRaised
        let border: Color = isSelected ? (filled ? .textPrimary : .brandOrange) : .hairline
        let text: Color = isSelected ? (filled ? .surface : .brandAccent) : .textSecondary

        return Button {
            onSelect(chip.id)
        } label: {
            Text(chip.label)
                .font(.system(size: filled ? 13 : 12, weight: isSelected ? .bold : .medium))
                .foregroundColor(text)
                .lineLimit(1)
                .padding(.horizontal, 12)
                .padding(.vertical, filled ? 8 : 6)
                .background(background, in: shape)
                .overlay(shape.strokeBorder(border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private var emptyShelf: some View {
        VStack(spacing: 8) {
            Image(systemName: "square.grid.2x2")
                .font(.system(size: 28))
                .foregroundColor(.textFaint)
            Text(departments.isEmpty ? "No categories yet" : "Nothing here right now")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.textSecondary)
            Text(departments.isEmpty ? "Products are still on their way. Check back in a moment." : "Pick another category on the left.")
                .font(.system(size: 13))
                .foregroundColor(.textMuted)
        }
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 16)
        .padding(.vertical, 60)
    }
}
