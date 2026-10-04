import SwiftUI

/// Full-page search, opened from the home search bar. Before anything is typed
/// it shows recent searches and popular items; while typing, live suggestions;
/// on Search (or a suggestion), every matching product in a grid.
struct StorefrontSearchView: View {
    @ObservedObject var vm: StorefrontViewModel
    @Binding var query: String
    /// The search that was run. While it differs from `query`, the shopper is
    /// still typing and sees suggestions.
    @Binding var submitted: String?
    var onOpenProduct: (Product) -> Void
    var onRequestAgeConfirmation: (Product) -> Void
    var onVoiceSearch: () -> Void
    var onClose: () -> Void

    @ObservedObject private var cart = CartViewModel.shared
    @ObservedObject private var recents = RecentSearches.shared
    @FocusState private var isFieldFocused: Bool
    /// The small "Categories" button swaps the recent searches for the shop's categories.
    @State private var showsCategories = false
    #if TOBACCO_SECTION
    @State private var isTobaccoDeclarationOpen = false
    @State private var isTobaccoListOpen = false
    #endif

    private let gridColumns = Array(repeating: GridItem(.flexible(), spacing: 8, alignment: .top), count: 3)

    private var trimmedQuery: String { query.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var isShowingResults: Bool { submitted != nil && submitted == trimmedQuery && !trimmedQuery.isEmpty }

    var body: some View {
        #if TOBACCO_SECTION
        Group {
            if isTobaccoListOpen {
                TobaccoListView(
                    products: tobaccoList,
                    onOpenProduct: onOpenProduct,
                    onRequestAgeConfirmation: onRequestAgeConfirmation,
                    onBack: { isTobaccoListOpen = false }
                )
            } else {
                searchPage
            }
        }
        .sheet(isPresented: $isTobaccoDeclarationOpen) {
            TobaccoDeclarationSheet {
                cart.confirmAge()
                isTobaccoListOpen = true
            }
        }
        #else
        searchPage
        #endif
    }

    private var searchPage: some View {
        VStack(spacing: 0) {
            searchBar

            ScrollView {
                Group {
                    if isShowingResults {
                        results
                    } else if trimmedQuery.isEmpty {
                        idle
                    } else {
                        suggestions
                    }
                }
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.immediately)
        }
        .background(Color.surface.ignoresSafeArea())
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if !isFieldFocused {
                FloatingCartBarView {
                    cart.isCartSheetPresented = true
                }
                .padding(.bottom, 10)
            }
        }
        .onAppear {
            // Straight into typing, unless this opened on a finished search (voice).
            if !isShowingResults {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { isFieldFocused = true }
            }
        }
    }

    // MARK: - Search bar

    private var searchBar: some View {
        HStack(spacing: 4) {
            Button {
                isFieldFocused = false
                onClose()
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 19, weight: .semibold))
                    .foregroundColor(.textPrimary)
                    .frame(width: 40, height: 50)
                    .contentShape(Rectangle())
            }
            .accessibilityLabel("Back")

            StorefrontSearchField(
                text: $query,
                isFocused: $isFieldFocused,
                hints: vm.searchHints,
                onVoiceSearch: onVoiceSearch
            )
            .onSubmit { run(query) }
        }
        .padding(.leading, 6)
        .padding(.trailing, 16)
        .padding(.top, 6)
        .padding(.bottom, 10)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Color.hairline).frame(height: 1)
        }
    }

    // MARK: - Before typing

    private var idle: some View {
        VStack(alignment: .leading, spacing: 28) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .center, spacing: 8) {
                    sectionTitle(showsCategories ? "Categories" : (recents.terms.isEmpty ? "Search the shop" : "Recent searches"))
                    Spacer()
                    Button(showsCategories ? "History" : "Categories") {
                        HapticsManager.shared.tick()
                        showsCategories.toggle()
                    }
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.textPrimary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 7)
                    .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Color.hairline, lineWidth: 1))
                    if !showsCategories && !recents.terms.isEmpty {
                        Button("Clear") {
                            HapticsManager.shared.tick()
                            withAnimation(.dashitSnappy) { recents.clear() }
                        }
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.brandAccent)
                    }
                }
                if showsCategories {
                    ForEach(vm.departments) { department in
                        Text(department.title)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.textMuted)
                            .padding(.top, 12)
                        ForEach(department.tiles) { tile in
                            termRow(icon: "square.grid.2x2", title: Text(verbatim: tile.name), fillText: nil) {
                                vm.selectedCategory = tile.name
                                onClose()
                            }
                        }
                    }
                }
            }
            if !showsCategories && !recents.terms.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(recents.terms, id: \.self) { term in
                        termRow(icon: "clock.arrow.circlepath", title: Text(verbatim: term), fillText: term) {
                            run(term)
                        }
                    }
                }
            }

            let popular = vm.popularProducts
            if !showsCategories && !popular.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    sectionTitle("Popular right now")
                    ForEach(popular) { product in
                        productRow(product, highlighting: "")
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 18)
    }

    // MARK: - While typing

    private var suggestions: some View {
        let matches = ProductSearch.results(for: query, in: vm.searchEntries)
        let categories = ProductSearch.categories(for: query, in: vm.categories.map(\.name))

        return VStack(alignment: .leading, spacing: 4) {
            termRow(
                icon: "magnifyingglass",
                title: Text("Search for “\(Text(verbatim: trimmedQuery).fontWeight(.semibold).foregroundColor(.textPrimary))”"),
                fillText: nil
            ) {
                run(query)
            }

            tobaccoCard(for: trimmedQuery)

            ForEach(categories, id: \.self) { name in
                termRow(
                    icon: "square.grid.2x2",
                    title: ProductSearch.highlighted(name, matching: trimmedQuery),
                    detail: "Category",
                    fillText: nil
                ) {
                    run(name)
                }
            }

            if !matches.isEmpty {
                sectionTitle("Products")
                    .padding(.top, 14)
                    .padding(.bottom, 2)
                ForEach(matches.prefix(8)) { product in
                    productRow(product, highlighting: trimmedQuery)
                }
            } else {
                Text("No items match “\(trimmedQuery)” yet.")
                    .font(.system(size: 13))
                    .foregroundColor(.textMuted)
                    .padding(.top, 10)
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }

    // MARK: - After searching

    @ViewBuilder
    private var results: some View {
        let term = submitted ?? trimmedQuery
        let matches = ProductSearch.results(for: term, in: vm.searchEntries)

        if matches.isEmpty {
            VStack(alignment: .leading, spacing: 28) {
                VStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 28))
                        .foregroundColor(.textFaint)
                    Text("No results for “\(term)”")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.textPrimary)
                    Text("Check the spelling, or try a more general word like “milk” or “rice”.")
                        .font(.system(size: 13))
                        .foregroundColor(.textMuted)
                }
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .padding(.top, 36)

                tobaccoCard(for: term)

                let popular = vm.popularProducts
                if !popular.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        sectionTitle("Popular right now")
                        ForEach(popular) { product in
                            productRow(product, highlighting: "")
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
        } else {
            VStack(alignment: .leading, spacing: 12) {
                Text("\(matches.count) result\(matches.count == 1 ? "" : "s") for “\(term)”")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.textSecondary)
                    .padding(.top, 14)

                tobaccoCard(for: term)

                LazyVGrid(columns: gridColumns, spacing: 10) {
                    ForEach(matches) { product in
                        ProductCardView(
                            product: product,
                            onOpen: { onOpenProduct(product) },
                            onRequestAgeConfirmation: { onRequestAgeConfirmation(product) }
                        )
                    }
                }
            }
            .padding(.horizontal, 16)
        }
    }

    // MARK: - Rows

    private func sectionTitle(_ title: String) -> some View {
        Text(title)
            .font(.system(size: 17, weight: .bold))
            .foregroundColor(.textPrimary)
            .padding(.vertical, 6)
    }

    /// A word to search for. `fillText` adds the iOS "fill in" arrow, which
    /// puts the text in the field to keep typing instead of searching.
    private func termRow(
        icon: String,
        title: Text,
        detail: String? = nil,
        fillText: String?,
        action: @escaping () -> Void
    ) -> some View {
        HStack(spacing: 12) {
            Button {
                HapticsManager.shared.selection()
                action()
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: icon)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(.textMuted)
                        .frame(width: 24)
                    title
                        .font(.system(size: 15))
                        .foregroundColor(.textSecondary)
                        .lineLimit(1)
                    Spacer(minLength: 8)
                    if let detail {
                        Text(detail)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.textFaint)
                    }
                }
                .frame(minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if let fillText {
                Button {
                    HapticsManager.shared.tick()
                    query = fillText + " "
                    isFieldFocused = true
                } label: {
                    Image(systemName: "arrow.up.left")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.textFaint)
                        .frame(width: 32, height: 44)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("Edit “\(fillText)”")
            }
        }
    }

    private func productRow(_ product: Product, highlighting term: String) -> some View {
        let hasVariants = (product.variants?.count ?? 0) > 1

        return HStack(spacing: 12) {
            Button {
                if !term.isEmpty { recents.record(term) }
                onOpenProduct(product)
            } label: {
                HStack(spacing: 12) {
                    thumbnail(product)
                    VStack(alignment: .leading, spacing: 3) {
                        ProductSearch.highlighted(product.name, matching: term)
                            .font(.system(size: 15))
                            .foregroundColor(.textSecondary)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                        Text("\(product.unit) · ₹\(Int(product.price))")
                            .font(.system(size: 12.5, weight: .medium))
                            .foregroundColor(.textMuted)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 8)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            QuantityStepper(
                quantity: cart.quantity(for: product.id),
                isEnabled: product.isAvailable,
                onAdd: {
                    if hasVariants {
                        onOpenProduct(product)
                    } else if cart.requiresAgeConfirmation(for: product) {
                        onRequestAgeConfirmation(product)
                    } else {
                        if !term.isEmpty { recents.record(term) }
                        cart.add(product: product)
                    }
                },
                onIncrement: {
                    if hasVariants { onOpenProduct(product) } else { cart.add(product: product) }
                },
                onDecrement: { cart.decrementLatest(productId: product.id) }
            )
        }
        .padding(.vertical, 6)
    }

    private func thumbnail(_ product: Product) -> some View {
        let shape = RoundedRectangle(cornerRadius: 10, style: .continuous)
        let initial = String(product.name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(1)).uppercased()
        return CachedAsyncImage(url: URL(string: product.img), transaction: Transaction(animation: .easeOut(duration: 0.2))) { phase in
            if let image = phase.image {
                image.resizable().scaledToFit().padding(4)
            } else {
                ZStack {
                    Color.surfaceMuted
                    Text(initial.isEmpty ? "?" : initial)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.textMuted)
                }
            }
        }
        .frame(width: 48, height: 48)
        .background(Color.surfaceRaised, in: shape)
        .clipShape(shape)
        .overlay(shape.strokeBorder(Color.hairline, lineWidth: 1))
        .accessibilityHidden(true)
    }

    // MARK: - Tobacco

    /// "Looking for tobacco products?" under a tobacco search, when the
    /// cigarette section is built in; nothing otherwise.
    @ViewBuilder
    private func tobaccoCard(for term: String) -> some View {
        #if TOBACCO_SECTION
        if Tobacco.showsCard(term, in: vm.tobaccoProducts) {
            TobaccoSearchCard { openTobacco() }
                .padding(.vertical, 6)
        }
        #endif
    }

    #if TOBACCO_SECTION
    /// The list asks for the declaration first, once per device.
    private func openTobacco() {
        isFieldFocused = false
        if cart.isAgeConfirmed {
            isTobaccoListOpen = true
        } else {
            isTobaccoDeclarationOpen = true
        }
    }

    private var tobaccoList: [Product] {
        let matched = Tobacco.matches(submitted ?? trimmedQuery, in: vm.tobaccoProducts)
        return matched.isEmpty ? vm.tobaccoProducts : matched
    }
    #endif

    // MARK: - Actions

    private func run(_ term: String) {
        let clean = term.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return }
        HapticsManager.shared.light()
        // Only searches that found something are worth offering again.
        if !ProductSearch.results(for: clean, in: vm.searchEntries).isEmpty {
            recents.record(clean)
        }
        query = clean
        submitted = clean
        isFieldFocused = false
    }
}
