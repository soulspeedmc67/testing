import Foundation
import SwiftUI
import FirebaseFirestore

@MainActor
final class StorefrontViewModel: ObservableObject {
    @Published var products: [Product] = []
    @Published var categories: [Category] = []
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
        withAnimation(.easeInOut(duration: 0.2)) {
            if self.selectedCategory == category {
                self.selectedCategory = nil
            } else {
                self.selectedCategory = category
            }
        }
        HapticsManager.shared.selection()
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
        
        // Fallback default categories matching DASHit inventory
        self.categories = [
            Category(id: "dairy", name: "Dairy", icon: "cup.and.saucer.fill", sortOrder: 1),
            Category(id: "snacks", name: "Snacks", icon: "bag.fill", sortOrder: 2),
            Category(id: "grocery", name: "Grocery", icon: "cart.fill", sortOrder: 3),
            Category(id: "bakery", name: "Bakery", icon: "birthday.cake.fill", sortOrder: 4),
            Category(id: "drinks", name: "Drinks", icon: "waterbottle.fill", sortOrder: 5),
            Category(id: "fruits", name: "Fresh Fruits", icon: "leaf.fill", sortOrder: 6),
            Category(id: "vegetables", name: "Vegetables", icon: "carrot.fill", sortOrder: 7),
            Category(id: "chicken", name: "Chicken", icon: "fork.knife", sortOrder: 8),
            Category(id: "home", name: "Home Care", icon: "house.fill", sortOrder: 9),
            Category(id: "kitchen", name: "Kitchen Care", icon: "wrench.and.screwdriver.fill", sortOrder: 10)
        ]
        
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
                self.categories = fetched
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
