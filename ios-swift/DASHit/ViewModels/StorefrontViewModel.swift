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

    @Published private(set) var products: [Product] = []
    @Published private(set) var isLoading = true
    #if TOBACCO_SECTION
    /// Tobacco and other 18+ items: never browsed, only listed in the tobacco
    /// section after the declaration (see Tobacco.swift).
    @Published private(set) var tobaccoProducts: [Product] = []
    #endif
    @Published private(set) var offers: [Offer] = CatalogueStore.defaultOffers
    /// The `categories` collection, when the rules let it be read.
    @Published private var remoteCategories: [Category] = []

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

    /// Names of photos on a clean white background (see CleanPhotos.swift).
    private var cleanPhotos: Set<String> = []
    /// The catalogue as it arrived, before sorting.
    private var arrived: [Product] = []

    /// What the screens should show next, and the task working it out; see `commit()`.
    private var latestProducts: [Product] = []
    private var latestRemote: [Category] = []
    private var commitTask: Task<Void, Never>?

    private var productListener: ListenerRegistration?
    private var categoryListener: ListenerRegistration?
    private var offerListener: ListenerRegistration?

    private init() {
        // The live catalogue comes first, with skeletons while it loads. The
        // built-in catalogue only stands in if Firestore hasn't answered in a
        // few seconds (no network and nothing cached yet).
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
            guard let self, self.products.isEmpty, self.latestProducts.isEmpty else { return }
            self.latestProducts = CatalogSeed.products.filter { !$0.isAgeRestricted }
            self.commit()
        }
        startListeners()
        CleanPhotos.load { [weak self] names in
            guard let self, names != self.cleanPhotos else { return }
            self.cleanPhotos = names
            if !self.arrived.isEmpty {
                self.latestProducts = self.photoOrder(self.arrived)
                self.commit()
            }
        }
    }

    /// Items with a clean white photo first, then other photos, then none;
    /// otherwise in the order they came.
    private func photoOrder(_ list: [Product]) -> [Product] {
        let clean = cleanPhotos
        var buckets: [[Product]] = [[], [], []]
        for product in list {
            let rank: Int = CleanPhotos.rank(product.img, in: clean)
            buckets[rank].append(product)
        }
        return buckets[0] + buckets[1] + buckets[2]
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

    private static func key(_ name: String) -> String { CatalogueDerive.key(name) }

    /// Works the home feed out away from the main thread, then swaps the
    /// products and everything derived from them in at once, so a screen never
    /// sees one without the other. At launch this lands under the splash (which
    /// plays in Core Animation and can't be slowed by it), so the feed is ready
    /// when the splash lifts rather than being laid out as it does.
    private func commit() {
        let products = latestProducts
        let remote = latestRemote
        // Categories can arrive before products: keep the skeletons up until there are products.
        guard !products.isEmpty else { return }
        commitTask?.cancel()
        commitTask = Task { [weak self] in
            let derived = await Task.detached(priority: .userInitiated) {
                CatalogueDerive.derive(products: products, remote: remote)
            }.value
            guard !Task.isCancelled, let self else { return }
            self.apply(derived, products: products, remote: remote)
        }
    }

    private func apply(_ derived: CatalogueDerived, products newProducts: [Product], remote: [Category]) {
        categories = derived.categories
        categoryTiles = derived.categoryTiles
        topCategoryTiles = derived.topCategoryTiles
        departments = derived.departments
        rails = derived.rails
        searchHints = derived.searchHints
        popularProducts = derived.popularProducts
        productsByCategoryKey = derived.byCategoryKey
        cachedSearchEntries = nil
        remoteCategories = remote
        // Photos the home feed shows first, saved to the phone ahead of time (Wi-Fi only).
        ProductPhotoStore.shared.prefetch(Array(derived.feedPhotos.prefix(300)))
        // The skeletons cross-fade into the catalogue on its first arrival, when
        // that's on screen; under the splash it simply appears.
        if isLoading && AppReveal.shared.isRevealed {
            withAnimation(.easeOut(duration: 0.25)) {
                products = newProducts
                isLoading = false
            }
        } else {
            products = newProducts
            isLoading = false
        }
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
            self.arrived = fetched
            self.latestProducts = self.photoOrder(fetched)
            self.commit()
        }

        categoryListener = FirestoreService.shared.listenCategories { [weak self] fetched in
            guard let self = self else { return }
            if !fetched.isEmpty {
                self.latestRemote = fetched
                self.commit()
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
        // No animation: the product grid under it can hold thousands of items.
        if self.selectedCategory == category {
            self.selectedCategory = nil
        } else {
            self.selectedCategory = category
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
