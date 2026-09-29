import Foundation
import SwiftUI
import FirebaseFirestore
import Combine

/// A "shop by category" tile: up to four product photos and the category size.
struct CategoryTile: Identifiable {
    let id: String
    let name: String
    let previewImages: [String]
    let productCount: Int
}

/// A department on the home feed ("Grocery & Kitchen"), grouping categories.
struct Department: Identifiable {
    let id: String
    let title: String
    let tiles: [CategoryTile]
}

/// One "everyday" rail on the home feed: a category and its first few products.
struct ProductRail: Identifiable {
    let id: String
    let title: String
    let products: [Product]
}

/// The shop's catalogue, shared by every screen that shows products. There is
/// one live listener for it, and everything the screens show (categories,
/// tiles, rails, search index) is worked out once when the catalogue changes,
/// not again on every redraw: with thousands of items, doing it per redraw was
/// what made the app slow.
@MainActor
final class CatalogueStore: ObservableObject {
    static let shared = CatalogueStore()

    @Published private(set) var products: [Product] = [] {
        didSet { rebuild() }
    }
    @Published private(set) var isLoading = true
    #if TOBACCO_SECTION
    /// Tobacco and other 18+ items: never browsed, only listed in the tobacco
    /// section after the declaration (see Tobacco.swift).
    @Published private(set) var tobaccoProducts: [Product] = []
    #endif
    @Published private(set) var offers: [Offer] = CatalogueStore.defaultOffers
    /// The `categories` collection, when the rules let it be read.
    @Published private var remoteCategories: [Category] = [] {
        didSet { rebuild() }
    }

    private(set) var categories: [Category] = []
    private(set) var categoryTiles: [CategoryTile] = []
    private(set) var topCategoryTiles: [CategoryTile] = []
    private(set) var departments: [Department] = []
    private(set) var rails: [ProductRail] = []
    private(set) var searchHints: [String] = []
    /// In-stock items shoppers rate most, for the search page.
    private(set) var popularProducts: [Product] = []
    private var productsByCategoryKey: [String: [Product]] = [:]
    private var cachedSearchEntries: [ProductSearch.Entry]?

    private var productListener: ListenerRegistration?
    private var categoryListener: ListenerRegistration?
    private var offerListener: ListenerRegistration?

    private init() {
        // The live catalogue comes first, with skeletons while it loads. The
        // built-in catalogue only stands in if Firestore hasn't answered in a
        // few seconds (no network and nothing cached yet).
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
            guard let self, self.products.isEmpty else { return }
            withAnimation(.easeOut(duration: 0.25)) {
                self.products = CatalogSeed.products.filter { !$0.isAgeRestricted }
                self.isLoading = false
            }
        }
        startListeners()
    }

    /// Products filed under a category, looked up instead of searched for.
    func products(inCategory name: String) -> [Product] {
        productsByCategoryKey[Self.key(name)] ?? []
    }

    /// Everything search needs, prepared once per catalogue and only when
    /// someone actually searches.
    var searchEntries: [ProductSearch.Entry] {
        if let cachedSearchEntries { return cachedSearchEntries }
        let entries = ProductSearch.entries(for: products)
        cachedSearchEntries = entries
        return entries
    }

    private static func key(_ name: String) -> String {
        name.trimmingCharacters(in: .whitespaces).lowercased()
    }

    /// Familiar aisles first, in store order; anything new follows, busiest first.
    private static let preferredOrder = [
        "Dairy", "Fruits", "Fresh Fruits", "Vegetables", "Staples", "Grocery",
        "Snacks", "Biscuits", "Bakery", "Beverages", "Drinks",
        "Instant Food", "Spices", "Chicken", "Home Care", "Kitchen Care"
    ].map { $0.lowercased() }

    /// One pass over the catalogue: group by category, then build the tiles,
    /// rails, departments and hints from the groups.
    private func rebuild() {
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
        productsByCategoryKey = groups
        cachedSearchEntries = nil

        if remoteCategories.isEmpty {
            func rank(_ key: String) -> Int { Self.preferredOrder.firstIndex(of: key) ?? Int.max }
            let ordered = firstSeen.sorted { a, b in
                let (ra, rb) = (rank(a), rank(b))
                if ra != rb { return ra < rb }
                return (groups[a]?.count ?? 0) > (groups[b]?.count ?? 0)
            }
            categories = ordered.enumerated().map { index, key in
                Category(id: key.replacingOccurrences(of: " ", with: "-"), name: names[key] ?? key, icon: nil, sortOrder: index)
            }
        } else {
            categories = remoteCategories
        }

        let filled: [(category: Category, products: [Product])] = categories
            .sorted { ($0.sortOrder ?? 0) < ($1.sortOrder ?? 0) }
            .compactMap { (category: Category) -> (category: Category, products: [Product])? in
                let list = groups[Self.key(category.name)] ?? []
                return list.isEmpty ? nil : (category: category, products: list)
            }

        categoryTiles = filled.map { entry in
            CategoryTile(
                id: entry.category.id,
                name: entry.category.name,
                previewImages: entry.products.prefix(4).map(\.img),
                productCount: entry.products.count
            )
        }
        topCategoryTiles = Array(categoryTiles.sorted { $0.productCount > $1.productCount }.prefix(6))
        rails = filled.map { entry in
            ProductRail(id: entry.category.id, title: entry.category.name, products: Array(entry.products.prefix(12)))
        }
        departments = Self.departments(from: categoryTiles)

        var seen = Set<String>()
        var hints: [String] = []
        for product in products where product.isAvailable {
            let hint = product.name.lowercased().split(separator: " ").prefix(3).joined(separator: " ")
            if seen.insert(hint).inserted { hints.append(hint) }
            if hints.count == 8 { break }
        }
        searchHints = hints

        popularProducts = Array(
            products
                .filter(\.isAvailable)
                .sorted { (Int($0.ratingCount ?? "") ?? 0) > (Int($1.ratingCount ?? "") ?? 0) }
                .prefix(6)
        )

        // Photos the home feed shows first, saved to the phone ahead of time
        // (Wi-Fi only) so they appear instantly.
        let feedPhotos = topCategoryTiles.flatMap(\.previewImages)
            + rails.flatMap { $0.products.prefix(6).map(\.img) }
            + departments.flatMap { $0.tiles.compactMap(\.previewImages.first) }
        ProductPhotoStore.shared.prefetch(Array(feedPhotos.compactMap { URL(string: $0) }.prefix(300)))
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

    private func startListeners() {
        productListener = FirestoreService.shared.listenProducts { [weak self] everything in
            guard let self = self else { return }
            // Tobacco and other 18+ items are never browsed in the iPhone app
            // (App Store guideline 1.4.3). Only a build with the cigarette
            // section switched on keeps them, for that section alone.
            #if TOBACCO_SECTION
            self.tobaccoProducts = everything.filter { $0.isAgeRestricted }
            #endif
            let fetched = everything.filter { !$0.isAgeRestricted }
            // An empty answer is usually an empty offline cache: keep the
            // skeletons up until real products (or the fallback) arrive.
            guard !fetched.isEmpty else { return }
            // The skeletons cross-fade into the catalogue on its first arrival.
            if self.isLoading {
                withAnimation(.easeOut(duration: 0.25)) {
                    self.products = fetched
                    self.isLoading = false
                }
            } else {
                self.products = fetched
            }
        }

        categoryListener = FirestoreService.shared.listenCategories { [weak self] fetched in
            guard let self = self else { return }
            if !fetched.isEmpty {
                self.remoteCategories = fetched
            }
        }

        offerListener = FirestoreService.shared.listenOffers { [weak self] fetched in
            guard let self = self else { return }
            if !fetched.isEmpty {
                self.offers = fetched
            }
        }
    }

    /// The web's built-in deals (`DEFAULT_OFFERS` in src/lib/offers.js), shown
    /// until the admin publishes offers in Firestore.
    private static let defaultOffers: [Offer] = [
        Offer(
            id: "offer-snacks-01",
            badge: "DASHIT EXCLUSIVE",
            title: "Gourmet Snacks & Chilled Sips",
            subtitle: "Artisanal crisps, premium chocolates & chilled sodas with fastest delivery.",
            priceTag: "Starting ₹20",
            category: "Snacks",
            promoCode: "CRISP20",
            discountPercent: 20,
            expiresIn: "Ends in 3 hours",
            img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80"
        ),
        Offer(
            id: "offer-bakery-02",
            badge: "FRESH FROM OVEN",
            title: "Artisan Breads & Morning Bakes",
            subtitle: "Authentic Kashmiri lavas, soft croissants & golden rolls delivered warm.",
            priceTag: "Starting ₹30",
            category: "Bakery",
            promoCode: "BAKE15",
            discountPercent: 15,
            expiresIn: "Ends at 12:00 PM",
            img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600&auto=format&fit=crop&q=80"
        ),
        Offer(
            id: "offer-dairy-03",
            badge: "FARM TO DOORSTEP",
            title: "Fresh Milk, Butter & Kashmiri Apples",
            subtitle: "Chilled Amul dairy, creamy butter & crisp valley apples in minutes.",
            priceTag: "Save up to 25%",
            category: "Dairy",
            promoCode: "FRESH25",
            discountPercent: 25,
            expiresIn: "Active Today",
            img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80"
        )
    ]
}

/// One screen's view of the shared catalogue: its own picked category and
/// search text on top of `CatalogueStore`.
@MainActor
final class StorefrontViewModel: ObservableObject {
    private let store = CatalogueStore.shared
    private var storeChanges: AnyCancellable?

    @Published var selectedCategory: String? = nil
    @Published var searchQuery: String = ""

    init() {
        storeChanges = store.objectWillChange.sink { [weak self] _ in
            self?.objectWillChange.send()
        }
    }

    var products: [Product] { store.products }
    var isLoading: Bool { store.isLoading }
    var offers: [Offer] { store.offers }
    var categories: [Category] { store.categories }
    var categoryTiles: [CategoryTile] { store.categoryTiles }
    /// The busiest categories, shown as collage tiles at the top of the feed.
    var topCategoryTiles: [CategoryTile] { store.topCategoryTiles }
    var departments: [Department] { store.departments }
    var rails: [ProductRail] { store.rails }
    /// Rotating search hints drawn from what the store actually sells.
    var searchHints: [String] { store.searchHints }
    var popularProducts: [Product] { store.popularProducts }
    var searchEntries: [ProductSearch.Entry] { store.searchEntries }
    #if TOBACCO_SECTION
    var tobaccoProducts: [Product] { store.tobaccoProducts }
    #endif

    func products(inCategory name: String) -> [Product] {
        store.products(inCategory: name)
    }

    func selectCategory(_ category: String?) {
        withAnimation(.dashitSpring) {
            if self.selectedCategory == category {
                self.selectedCategory = nil
            } else {
                self.selectedCategory = category
            }
        }
        HapticsManager.shared.selection()
    }

    /// No category picked and no search typed: show the spotlight and rails.
    var isBrowsing: Bool {
        selectedCategory == nil && searchQuery.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var filteredProducts: [Product] {
        var list: [Product]
        if let cat = selectedCategory, !cat.isEmpty {
            list = store.products(inCategory: cat)
        } else {
            list = store.products
        }

        if !searchQuery.trimmingCharacters(in: .whitespaces).isEmpty {
            let q = searchQuery.lowercased()
            list = list.filter {
                $0.name.lowercased().contains(q) ||
                $0.cat.lowercased().contains(q) ||
                ($0.badge?.lowercased().contains(q) ?? false)
            }
        }

        return list
    }
}
