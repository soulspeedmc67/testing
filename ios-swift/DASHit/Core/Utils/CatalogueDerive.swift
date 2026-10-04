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

        if remoteCategories.isEmpty {
            func rank(_ key: String) -> Int { preferredOrder.firstIndex(of: key) ?? Int.max }
            let ordered = firstSeen.sorted { a, b in
                let (ra, rb) = (rank(a), rank(b))
                if ra != rb { return ra < rb }
                return (groups[a]?.count ?? 0) > (groups[b]?.count ?? 0)
            }
            derived.categories = ordered.enumerated().map { index, key in
                Category(id: key.replacingOccurrences(of: " ", with: "-"), name: names[key] ?? key, icon: nil, sortOrder: index)
            }
        } else {
            derived.categories = remoteCategories
        }

        let filled: [(category: Category, products: [Product])] = derived.categories
            .sorted { ($0.sortOrder ?? 0) < ($1.sortOrder ?? 0) }
            .compactMap { (category: Category) -> (category: Category, products: [Product])? in
                let list = groups[key(category.name)] ?? []
                return list.isEmpty ? nil : (category: category, products: list)
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

    /// Categories grouped into store departments, Blinkit-style; anything that
    /// fits none of them lands in "More to explore".
    private static func departments(from tiles: [CategoryTile]) -> [Department] {
        let groups: [(title: String, keys: [String])] = [
            ("Fresh & Daily", ["dairy", "fruit", "vegetable", "egg", "chicken", "meat", "fish", "bread"]),
            ("Grocery & Kitchen", ["staple", "grocery", "atta", "rice", "dal", "oil", "spice", "masala", "instant", "kitchen"]),
            ("Snacks & Drinks", ["snack", "chip", "namkeen", "biscuit", "cookie", "bakery", "beverage", "drink", "juice", "sweet", "chocolate"]),
            ("Home & Household", ["home", "clean", "household", "care"])
        ]
        var remaining = tiles
        var result: [Department] = []
        for group in groups {
            let matched = remaining.filter { tile in
                let name = tile.name.lowercased()
                return group.keys.contains { name.contains($0) }
            }
            guard !matched.isEmpty else { continue }
            let matchedIds = Set(matched.map(\.id))
            remaining.removeAll { matchedIds.contains($0.id) }
            result.append(Department(id: group.title, title: group.title, tiles: matched))
        }
        if !remaining.isEmpty {
            result.append(Department(id: "more", title: "More to explore", tiles: remaining))
        }
        return result
    }
}
