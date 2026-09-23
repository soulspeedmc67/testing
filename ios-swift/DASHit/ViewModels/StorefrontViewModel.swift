import Foundation
import SwiftUI
import FirebaseFirestore

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

@MainActor
final class StorefrontViewModel: ObservableObject {
    @Published var products: [Product] = []
    /// The `categories` collection, when the rules let it be read.
    @Published private var remoteCategories: [Category] = []

    /// Categories to show. The live catalogue files products under whatever
    /// names the admin uses ("Staples", "Beverages", "Instant Food"…), and the
    /// `categories` collection is not readable by customers, so the list is
    /// built from the products themselves unless that collection is available.
    var categories: [Category] {
        remoteCategories.isEmpty ? Self.categories(from: products) : remoteCategories
    }

    /// Familiar aisles first, in store order; anything new follows, busiest first.
    private static let preferredOrder = [
        "Dairy", "Fruits", "Fresh Fruits", "Vegetables", "Staples", "Grocery",
        "Snacks", "Chips", "Biscuits", "Bakery", "Beverages", "Drinks",
        "Instant Food", "Spices", "Chicken", "Home Care", "Kitchen Care"
    ]

    static func categories(from products: [Product]) -> [Category] {
        var counts: [String: Int] = [:]
        var names: [String] = []
        for product in products {
            let name = product.cat.trimmingCharacters(in: .whitespaces)
            guard !name.isEmpty else { continue }
            if counts[name] == nil { names.append(name) }
            counts[name, default: 0] += 1
        }
        func rank(_ name: String) -> Int {
            preferredOrder.firstIndex { $0.caseInsensitiveCompare(name) == .orderedSame } ?? Int.max
        }
        let ordered = names.sorted { a, b in
            let (ra, rb) = (rank(a), rank(b))
            if ra != rb { return ra < rb }
            return counts[a, default: 0] > counts[b, default: 0]
        }
        return ordered.enumerated().map { index, name in
            Category(
                id: name.lowercased().replacingOccurrences(of: " ", with: "-"),
                name: name,
                icon: nil,
                sortOrder: index
            )
        }
    }
    @Published var offers: [Offer] = []
    @Published var selectedCategory: String? = nil
    @Published var searchQuery: String = ""
    @Published var isLoading: Bool = true

    private var productListener: ListenerRegistration?
    private var categoryListener: ListenerRegistration?
    private var offerListener: ListenerRegistration?

    init() {
        loadInitialData()
        startRealtimeListeners()
    }

    deinit {
        productListener?.remove()
        categoryListener?.remove()
        offerListener?.remove()
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

    /// Categories in display order, each with the products filed under it.
    private var productsByCategory: [(category: Category, products: [Product])] {
        categories
            .sorted { ($0.sortOrder ?? 0) < ($1.sortOrder ?? 0) }
            .map { (category: Category) -> (category: Category, products: [Product]) in
                (category: category, products: products.filter { $0.cat.caseInsensitiveCompare(category.name) == .orderedSame })
            }
            .filter { !$0.products.isEmpty }
    }

    var categoryTiles: [CategoryTile] {
        productsByCategory.map { entry in
            CategoryTile(
                id: entry.category.id,
                name: entry.category.name,
                previewImages: entry.products.prefix(4).map(\.img),
                productCount: entry.products.count
            )
        }
    }

    /// The busiest categories, shown as collage tiles at the top of the feed.
    var topCategoryTiles: [CategoryTile] {
        Array(categoryTiles.sorted { $0.productCount > $1.productCount }.prefix(6))
    }

    /// Categories grouped into store departments, Blinkit-style; anything that
    /// fits none of them lands in "More to explore".
    var departments: [Department] {
        let groups: [(title: String, keys: [String])] = [
            ("Fresh & Daily", ["dairy", "fruit", "vegetable", "egg", "chicken", "meat", "fish", "bread"]),
            ("Grocery & Kitchen", ["staple", "grocery", "atta", "rice", "dal", "oil", "spice", "masala", "instant", "kitchen"]),
            ("Snacks & Drinks", ["snack", "chip", "namkeen", "biscuit", "cookie", "bakery", "beverage", "drink", "juice", "sweet", "chocolate"]),
            ("Home & Household", ["home", "clean", "household", "care"])
        ]
        var remaining = categoryTiles
        var result: [Department] = []
        for group in groups {
            let matched = remaining.filter { tile in
                let name = tile.name.lowercased()
                return group.keys.contains { name.contains($0) }
            }
            guard !matched.isEmpty else { continue }
            remaining.removeAll { tile in matched.contains { $0.id == tile.id } }
            result.append(Department(id: group.title, title: group.title, tiles: matched))
        }
        if !remaining.isEmpty {
            result.append(Department(id: "more", title: "More to explore", tiles: remaining))
        }
        return result
    }

    var rails: [ProductRail] {
        productsByCategory.map { entry in
            ProductRail(id: entry.category.id, title: entry.category.name, products: Array(entry.products.prefix(12)))
        }
    }

    var filteredProducts: [Product] {
        var list = products

        if let cat = selectedCategory, !cat.isEmpty {
            list = list.filter { $0.cat.lowercased() == cat.lowercased() }
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

    private func loadInitialData() {
        // Instant offline catalog seed
        self.products = CatalogSeed.products

        // Categories are derived from the products (see `categories`).

        // Fallback featured offer
        self.offers = [
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
            )
        ]
    }

    private func startRealtimeListeners() {
        // Real-time products
        productListener = FirestoreService.shared.listenProducts { [weak self] fetched in
            guard let self = self else { return }
            if !fetched.isEmpty {
                self.products = fetched
            }
            self.isLoading = false
        }

        // Real-time categories
        categoryListener = FirestoreService.shared.listenCategories { [weak self] fetched in
            guard let self = self else { return }
            if !fetched.isEmpty {
                self.remoteCategories = fetched
            }
        }

        // Real-time offers
        offerListener = FirestoreService.shared.listenOffers { [weak self] fetched in
            guard let self = self else { return }
            if !fetched.isEmpty {
                self.offers = fetched
            }
        }
    }
}
