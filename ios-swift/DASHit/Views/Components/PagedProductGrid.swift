import SwiftUI

/// A product grid for a whole category or search, which can run to
/// thousands of items ("Others" had 2,610). It builds 60 cards, then 60 more
/// each time the last one scrolls into view, and switching to another
/// category replaces the grid instead of animating the difference between
/// two huge lists — that animation froze the app long enough for iOS to kill
/// it.
struct PagedProductGrid<Card: View>: View {
    let products: [Product]
    /// What the list is (a category name or a search); a new one starts from the top.
    let listKey: String
    let columns: [GridItem]
    let card: (Product) -> Card

    private static var pageSize: Int { 60 }
    @State private var shown = 60

    var body: some View {
        LazyVGrid(columns: columns, spacing: 10) {
            ForEach(products.prefix(shown)) { product in
                card(product)
                    .onAppear {
                        if product.id == products.prefix(shown).last?.id, shown < products.count {
                            shown += Self.pageSize
                        }
                    }
            }
        }
        .id(listKey)
        .transaction { $0.animation = nil }
        .onChange(of: listKey) { _, _ in shown = Self.pageSize }
    }
}
