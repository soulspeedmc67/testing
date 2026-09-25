import Foundation
import SwiftUI
import Combine
import FirebaseFirestore

public enum AdminSortOption: String, CaseIterable, Identifiable {
    case distributorAsc = "Distributor (A → Z)"
    case distributorDesc = "Distributor (Z → A)"
    case stockAsc = "Stock (Lowest First)"
    case stockDesc = "Stock (Highest First)"
    case valueDesc = "Stock Value (Highest ₹)"
    case nameAsc = "Product Name (A → Z)"

    public var id: String { rawValue }
}

public struct SupplierStat: Identifiable {
    public var id: String { name }
    public let name: String
    public let category: String
    public let phone: String
    public let skuCount: Int
    public let totalUnits: Int
    public let totalValue: Double
    public let lowStockCount: Int
}

@MainActor
public final class AdminDashboardViewModel: ObservableObject {
    public static let shared = AdminDashboardViewModel()

    @Published public var products: [Product] = []
    @Published public var distributors: [Distributor] = Distributor.defaults
    @Published public var recentOrders: [Order] = []
    @Published public var isStoreOpen: Bool = true
    @Published public var isLoading: Bool = false

    // Filters and Search
    @Published public var searchQuery: String = ""
    @Published public var selectedDistributor: String? = nil
    @Published public var sortOption: AdminSortOption = .distributorAsc

    private let db = Firestore.firestore()
    private var productListener: ListenerRegistration?
    private var distributorListener: ListenerRegistration?
    private var orderListener: ListenerRegistration?

    public init() {
        loadDeletedProducts()
        startListeners()
    }

    deinit {
        productListener?.remove()
        distributorListener?.remove()
        orderListener?.remove()
    }

    private var deletedProductIds: Set<String> {
        get {
            let list = UserDefaults.standard.stringArray(forKey: "dashit_deleted_products") ?? []
            return Set(list)
        }
        set {
            UserDefaults.standard.set(Array(newValue), forKey: "dashit_deleted_products")
        }
    }

    private func loadDeletedProducts() {
        // Loads cached deleted IDs
    }

    public func startListeners() {
        isLoading = true

        // 1. Listen Products
        productListener = db.collection("products").addSnapshotListener { [weak self] snapshot, error in
            guard let self = self, let docs = snapshot?.documents, error == nil else { return }
            let decoder = Firestore.Decoder()
            let deleted = self.deletedProductIds

            let list: [Product] = docs.compactMap { doc in
                var data = doc.data()
                if (data["active"] as? Bool) == false { return nil }
                let id = (data["id"] as? String) ?? doc.documentID
                if deleted.contains(id) { return nil }
                data["id"] = id
                // Assign sensible default distributor if not tagged
                if data["distributor"] == nil {
                    let cat = (data["cat"] as? String) ?? ""
                    data["distributor"] = self.defaultDistributor(for: cat)
                }
                return try? decoder.decode(Product.self, from: data)
            }
            Task { @MainActor in
                self.products = list
                self.isLoading = false
            }
        }

        // 2. Listen Distributors
        distributorListener = db.collection("distributors").addSnapshotListener { [weak self] snapshot, error in
            guard let self = self, let docs = snapshot?.documents, error == nil, !docs.isEmpty else { return }
            let decoder = Firestore.Decoder()
            let list: [Distributor] = docs.compactMap { doc in
                var data = doc.data()
                data["id"] = (data["id"] as? String) ?? doc.documentID
                return try? decoder.decode(Distributor.self, from: data)
            }
            if !list.isEmpty {
                Task { @MainActor in
                    self.distributors = list
                }
            }
        }

        // 3. Listen Recent Orders
        orderListener = db.collection("orders")
            .order(by: "createdAt", descending: true)
            .limit(to: 30)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self, let docs = snapshot?.documents, error == nil else { return }
                let decoder = Firestore.Decoder()
                let list: [Order] = docs.compactMap { doc in
                    var data = doc.data()
                    data["id"] = (data["id"] as? String) ?? doc.documentID
                    return try? decoder.decode(Order.self, from: data)
                }
                Task { @MainActor in
                    self.recentOrders = list
                }
            }
    }

    private func defaultDistributor(for category: String) -> String {
        let cat = category.lowercased()
        if cat.contains("dairy") || cat.contains("milk") { return "Amul Valley Dairy Logistics" }
        if cat.contains("bakery") || cat.contains("bread") || cat.contains("kandur") { return "Local Kandur Bakeries" }
        if cat.contains("fruit") || cat.contains("apple") || cat.contains("vegetable") { return "Anantnag Fresh Farm Orchards" }
        if cat.contains("clean") || cat.contains("beauty") || cat.contains("soap") { return "Hindustan Unilever Direct" }
        if cat.contains("snack") || cat.contains("noodle") || cat.contains("biscuit") { return "ITC & Nestlé Supply Hub" }
        return "Kashmir Wholesale FMCG"
    }

    // MARK: - Filtered & Sorted Catalogue

    public var filteredProducts: [Product] {
        var result = products

        // Filter by search query
        let query = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !query.isEmpty {
            result = result.filter { p in
                p.name.lowercased().contains(query) ||
                p.cat.lowercased().contains(query) ||
                (p.distributor ?? "").lowercased().contains(query)
            }
        }

        // Filter by distributor
        if let selected = selectedDistributor, !selected.isEmpty {
            result = result.filter { ($0.distributor ?? "Unassigned") == selected }
        }

        // Sort
        switch sortOption {
        case .distributorAsc:
            result.sort { ($0.distributor ?? "") < ($1.distributor ?? "") }
        case .distributorDesc:
            result.sort { ($0.distributor ?? "") > ($1.distributor ?? "") }
        case .stockAsc:
            result.sort { ($0.stock ?? 0) < ($1.stock ?? 0) }
        case .stockDesc:
            result.sort { ($0.stock ?? 0) > ($1.stock ?? 0) }
        case .valueDesc:
            result.sort { (Double($0.stock ?? 0) * $0.price) > (Double($1.stock ?? 0) * $1.price) }
        case .nameAsc:
            result.sort { $0.name.lowercased() < $1.name.lowercased() }
        }

        return result
    }

    // MARK: - Metrics

    public var totalProductsCount: Int { products.count }

    public var totalStockUnits: Int {
        products.reduce(0) { $0 + ($1.stock ?? 10) }
    }

    public var totalStockValuation: Double {
        products.reduce(0.0) { $0 + (Double($1.stock ?? 10) * $1.price) }
    }

    public var lowStockCount: Int {
        products.filter { ($0.stock ?? 10) < 5 }.count
    }

    public var supplierStats: [SupplierStat] {
        var dict: [String: (count: Int, units: Int, val: Double, low: Int)] = [:]

        for p in products {
            let supplier = p.distributor ?? "Kashmir Wholesale FMCG"
            let units = p.stock ?? 10
            let value = Double(units) * p.price
            let low = units < 5 ? 1 : 0

            var current = dict[supplier] ?? (count: 0, units: 0, val: 0.0, low: 0)
            current.count += 1
            current.units += units
            current.val += value
            current.low += low
            dict[supplier] = current
        }

        return dict.map { (name, tuple) in
            let distObj = distributors.first { $0.name == name }
            return SupplierStat(
                name: name,
                category: distObj?.category ?? "Supplier",
                phone: distObj?.phone ?? "+91 94190 00000",
                skuCount: tuple.count,
                totalUnits: tuple.units,
                totalValue: tuple.val,
                lowStockCount: tuple.low
            )
        }.sorted { $0.totalValue > $1.totalValue }
    }

    // MARK: - Mutations

    public func updateStock(productId: String, newStock: Int) {
        let safeStock = max(0, newStock)
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()

        // Optimistic local update
        if let idx = products.firstIndex(where: { $0.id == productId }) {
            let old = products[idx]
            products[idx] = Product(
                id: old.id,
                name: old.name,
                unit: old.unit,
                price: old.price,
                originalPrice: old.originalPrice,
                rating: old.rating,
                ratingCount: old.ratingCount,
                time: old.time,
                options: old.options,
                badge: old.badge,
                img: old.img,
                cat: old.cat,
                variants: old.variants,
                ageRestricted: old.ageRestricted,
                minAge: old.minAge,
                inStock: safeStock > 0,
                nutrition: old.nutrition,
                stock: safeStock,
                distributor: old.distributor
            )
        }

        db.collection("products").document(productId).setData([
            "stock": safeStock,
            "inStock": safeStock > 0
        ], merge: true)
    }

    public func deleteProduct(productId: String) {
        UINotificationFeedbackGenerator().notificationOccurred(.warning)

        // Add to persistent deleted cache
        var set = deletedProductIds
        set.insert(productId)
        deletedProductIds = set

        // Remove from memory with spring animation
        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
            products.removeAll { $0.id == productId }
        }

        // Update Firestore
        db.collection("products").document(productId).setData([
            "active": false,
            "deletedAt": FieldValue.serverTimestamp()
        ], merge: true)
    }

    public func addDistributor(name: String, contact: String, phone: String, category: String, leadTime: String, notes: String) {
        let newDist = Distributor(
            id: "dist_\(Date().timeIntervalSince1970)",
            name: name,
            contact: contact,
            phone: phone,
            category: category.isEmpty ? "Wholesale FMCG" : category,
            leadTime: leadTime.isEmpty ? "1 day" : leadTime,
            notes: notes
        )

        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
            distributors.append(newDist)
        }

        UINotificationFeedbackGenerator().notificationOccurred(.success)

        if let data = try? Firestore.Encoder().encode(newDist) {
            db.collection("distributors").document(newDist.id).setData(data)
        }
    }

    public func advanceOrderStatus(order: Order) {
        UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        let nextStatus: String
        switch order.status.stage {
        case .placed: nextStatus = "Packing at Store"
        case .packing: nextStatus = "Out for Delivery"
        case .onTheWay: nextStatus = "Delivered"
        default: return
        }

        db.collection("orders").document(order.id).setData([
            "status": nextStatus,
            "updatedAt": FieldValue.serverTimestamp()
        ], merge: true)
    }
}
