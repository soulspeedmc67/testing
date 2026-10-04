import Foundation

/// Everything the home feed shows, worked out from the catalogue in one pass:
/// category groups, tiles, rails, departments and hints. Kept off the main
/// actor so a catalogue of thousands of items never blocks the screen while it
/// is built (the launch splash used to stutter behind it).
struct CatalogueDerived {
    var byCategoryKey: [String: [Product]] = [:]
    var categories: [Category] = []
    var categoryTiles: [CategoryTile] = []
    var topCategoryTiles: [CategoryTile] = []
    var departments: [Department] = []
    var rails: [ProductRail] = []
    var searchHints: [String] = []
    var popularProducts: [Product] = []
    /// Photos the home feed shows first, to save to the phone ahead of time.
    var feedPhotos: [URL] = []
}

enum CatalogueDerive {
    static func key(_ name: String) -> String {
        name.trimmingCharacters(in: .whitespaces).lowercased()
    }

    /// Familiar aisles first, in store order; anything new follows, busiest first.
    static let preferredOrder = [
        "Dairy", "Fruits", "Fresh Fruits", "Vegetables", "Staples", "Grocery",
        "Snacks", "Biscuits", "Bakery", "Beverages", "Drinks",
        "Instant Food", "Sweets & Chocolates", "Ice Cream", "Dry Fruits", "Sauces & Spreads",
        "Spices", "Chicken", "Chicken & Fish", "Home Care", "Kitchen Care", "Personal Care",
        "Baby Care", "Health & Wellness", "Pet Care", "Stationery", "Toys & Games", "Electronics"
    ].map { $0.lowercased() }

    static func hasPhoto(_ product: Product) -> Bool {
        let img = product.img.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !img.isEmpty else { return false }
        let lower = img.lowercased()
        let placeholders = ["unsplash.com", "picsum.photos", "placeholder.com", "placehold.co", "dummyimage.com"]
        return !placeholders.contains { lower.contains($0) }
    }

    /// Group by category, then build the tiles, rails, departments and hints from the groups.
    static func derive(products: [Product], remote remoteCategories: [Category]) -> CatalogueDerived {
        var derived = CatalogueDerived()
        var groups: [String: [Product]] = [:]
        var names: [String: String] = [:]
        var firstSeen: [String] = []
        for product in products {
            let name = product.cat.trimmingCharacters(in: .whitespaces)
            guard !name.isEmpty else { continue }
            let key = name.lowercased()
            if groups[key] == nil {
                firstSeen.append(key)
                names[key] = name
            }
            groups[key, default: []].append(product)
        }
        derived.byCategoryKey = groups

        // One shelf per product category, familiar aisles first.
        func rank(_ key: String) -> Int { preferredOrder.firstIndex(of: key) ?? Int.max }
        let ordered = firstSeen.sorted { a, b in
            let (ra, rb) = (rank(a), rank(b))
            if ra != rb { return ra < rb }
            return (groups[a]?.count ?? 0) > (groups[b]?.count ?? 0)
        }
        let ownCategories: [Category] = ordered.enumerated().map { index, key in
            Category(id: key.replacingOccurrences(of: " ", with: "-"), name: names[key] ?? key, icon: nil, sortOrder: index)
        }

        /// The shelves that have products, in shelf order.
        func shelves(_ categories: [Category]) -> [(category: Category, products: [Product])] {
            categories
                .sorted { ($0.sortOrder ?? 0) < ($1.sortOrder ?? 0) }
                .compactMap { (category: Category) -> (category: Category, products: [Product])? in
                    let list = groups[key(category.name)] ?? []
                    return list.isEmpty ? nil : (category: category, products: list)
                }
        }

        derived.categories = remoteCategories.isEmpty ? ownCategories : remoteCategories
        var filled = shelves(derived.categories)
        // Shelves set in Firestore whose names match none of the products would
        // leave the Categories tab and the home feed empty: fall back to one
        // shelf per product category.
        if filled.isEmpty && !remoteCategories.isEmpty {
            derived.categories = ownCategories
            filled = shelves(ownCategories)
        }

        derived.categoryTiles = filled.map { entry in
            CategoryTile(
                id: entry.category.id,
                name: entry.category.name,
                previewImages: entry.products.prefix(4).map(\.img),
                productCount: entry.products.count
            )
        }
        derived.topCategoryTiles = Array(derived.categoryTiles.sorted { $0.productCount > $1.productCount }.prefix(6))
        derived.rails = filled.map { entry in
            ProductRail(id: entry.category.id, title: entry.category.name, products: Array(entry.products.prefix(12)))
        }
        derived.departments = departments(from: derived.categoryTiles)

        var seen = Set<String>()
        var hints: [String] = []
        for product in products where product.isAvailable && CatalogueDerive.hasPhoto(product) {
            let hint = product.name.lowercased().split(separator: " ").prefix(3).joined(separator: " ")
            if seen.insert(hint).inserted { hints.append(hint) }
            if hints.count == 8 { break }
        }
        derived.searchHints = hints

        derived.popularProducts = Array(
            products
                .filter { $0.isAvailable && CatalogueDerive.hasPhoto($0) }
                .sorted { (Int($0.ratingCount ?? "") ?? 0) > (Int($1.ratingCount ?? "") ?? 0) }
                .prefix(6)
        )

        derived.feedPhotos = (
            derived.topCategoryTiles.flatMap(\.previewImages)
                + derived.rails.flatMap { $0.products.prefix(6).map(\.img) }
                + derived.departments.flatMap { $0.tiles.compactMap(\.previewImages.first) }
        ).compactMap { URL(string: $0) }
        return derived
    }

    /// The few departments the categories sit under, same as the website
    /// (GROUPS in src/lib/shopAisles.js): a shopper picks one of five, then one
    /// of the handful of categories inside it. A category not named here goes
    /// under the last one.
    private static let departmentGroups: [(id: String, title: String, names: Set<String>)] = [
        ("fresh", "Fresh & daily", ["dairy", "bakery", "fruits", "vegetables", "chicken", "chicken & fish", "meat & fish"]),
        ("snacks", "Snacks & drinks", ["snacks", "chips", "biscuits", "beverages", "sweets & chocolates", "ice cream"]),
        ("cooking", "Cooking & pantry", ["staples", "spices", "sauces & spreads", "instant food", "dry fruits"]),
        ("care", "Personal & baby care", ["personal care", "baby care", "health & wellness"]),
        ("home", "Home & more", [])
    ]

    /// The everyday categories the home screen leads with.
    static let everyday: Set<String> = ["dairy", "bakery", "snacks", "biscuits", "beverages", "staples", "instant food"]

    private static func departments(from tiles: [CategoryTile]) -> [Department] {
        var buckets: [String: [CategoryTile]] = [:]
        for tile in tiles {
            let name = key(tile.name)
            let id = departmentGroups.first(where: { $0.names.contains(name) })?.id ?? "home"
            buckets[id, default: []].append(tile)
        }
        return departmentGroups.compactMap { group in
            guard let inside = buckets[group.id], !inside.isEmpty else { return nil }
            return Department(id: group.id, title: group.title, tiles: inside)
        }
    }
}
