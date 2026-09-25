import Foundation
import SwiftUI
import Combine
import FirebaseFirestore
import AudioToolbox
import AVFoundation

public enum AdminTab: String, CaseIterable, Identifiable {
    case orders = "Orders"
    case inventory = "Stock"
    case addProduct = "Add Item"
    case riders = "Riders"
    case distributors = "Distributors"
    case storeControls = "Store Settings"
    case offers = "Discounts"
    case batchInward = "Batch Inward"

    public var id: String { rawValue }

    public var iconName: String {
        switch self {
        case .orders: return "shippingbox.fill"
        case .inventory: return "square.grid.2x2.fill"
        case .addProduct: return "plus.circle.fill"
        case .riders: return "scooter"
        case .distributors: return "building.2.fill"
        case .storeControls: return "storefront.fill"
        case .offers: return "sparkles"
        case .batchInward: return "arrow.down.to.line.circle.fill"
        }
    }
}

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

    // Active Navigation Tab
    @Published public var selectedTab: AdminTab = .orders

    // Core Data Entities
    @Published public var products: [Product] = []
    @Published public var distributors: [Distributor] = Distributor.defaults
    @Published public var recentOrders: [Order] = []
    @Published public var drivers: [Driver] = Driver.defaults
    @Published public var offers: [Offer] = Offer.defaults
    @Published public var storeConfig: StoreConfig = StoreConfig.default
    @Published public var isLoading: Bool = false

    // Filters and Search
    @Published public var searchQuery: String = ""
    @Published public var selectedDistributor: String? = nil
    @Published public var selectedCategory: String = "All"
    @Published public var orderFilterStatus: String = "All"
    @Published public var sortOption: AdminSortOption = .distributorAsc
    @Published public var audioChimeEnabled: Bool = true

    // Internal State
    private let db = Firestore.firestore()
    private var productListener: ListenerRegistration?
    private var distributorListener: ListenerRegistration?
    private var orderListener: ListenerRegistration?
    private var driverListener: ListenerRegistration?
    private var offerListener: ListenerRegistration?
    private var storeConfigListener: ListenerRegistration?
    private var knownOrderIds: Set<String> = []
    private var isFirstOrderFetch: Bool = true

    public init() {
        startListeners()
    }

    deinit {
        productListener?.remove()
        distributorListener?.remove()
        orderListener?.remove()
        driverListener?.remove()
        offerListener?.remove()
        storeConfigListener?.remove()
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

    public func startListeners() {
        isLoading = true

        // 1. Products Realtime Listener
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

        // 2. Distributors Realtime Listener
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

        // 3. Orders Realtime Listener
        orderListener = db.collection("orders")
            .order(by: "createdAt", descending: true)
            .limit(to: 50)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self, let docs = snapshot?.documents, error == nil else { return }
                let decoder = Firestore.Decoder()
                let list: [Order] = docs.compactMap { doc in
                    var data = doc.data()
                    data["id"] = (data["id"] as? String) ?? doc.documentID
                    return try? decoder.decode(Order.self, from: data)
                }

                Task { @MainActor in
                    if !self.isFirstOrderFetch && self.audioChimeEnabled {
                        let newPlaced = list.first { order in
                            !self.knownOrderIds.contains(order.id) && order.status.stage == .placed
                        }
                        if newPlaced != nil {
                            self.playOrderChime()
                        }
                    }
                    self.knownOrderIds = Set(list.map { $0.id })
                    self.isFirstOrderFetch = false
                    self.recentOrders = list
                }
            }

        // 4. Delivery Fleet / Drivers Realtime Listener
        driverListener = db.collection("drivers").addSnapshotListener { [weak self] snapshot, error in
            guard let self = self, let docs = snapshot?.documents, error == nil, !docs.isEmpty else { return }
            let decoder = Firestore.Decoder()
            let list: [Driver] = docs.compactMap { doc in
                var data = doc.data()
                data["id"] = (data["id"] as? String) ?? doc.documentID
                return try? decoder.decode(Driver.self, from: data)
            }
            if !list.isEmpty {
                Task { @MainActor in
                    self.drivers = list
                }
            }
        }

        // 5. Offers Realtime Listener
        offerListener = db.collection("offers").addSnapshotListener { [weak self] snapshot, error in
            guard let self = self, let docs = snapshot?.documents, error == nil, !docs.isEmpty else { return }
            let decoder = Firestore.Decoder()
            let list: [Offer] = docs.compactMap { doc in
                var data = doc.data()
                data["id"] = (data["id"] as? String) ?? doc.documentID
                return try? decoder.decode(Offer.self, from: data)
            }
            if !list.isEmpty {
                Task { @MainActor in
                    self.offers = list
                }
            }
        }

        // 6. Store Configuration Realtime Listener
        storeConfigListener = db.collection("config").document("store").addSnapshotListener { [weak self] doc, error in
            guard let self = self, let doc = doc, doc.exists, error == nil, let data = doc.data() else { return }
            let isOpen = (data["isOpen"] as? Bool) ?? true
            let reason = (data["closeReason"] as? String) ?? "Normal Operations"
            let highDemand = (data["isHighDemand"] as? Bool) ?? false
            let maxOrders = (data["maxOrdersPerHour"] as? Int) ?? 120
            let radius = (data["deliveryRadiusKm"] as? Double) ?? 8.5

            Task { @MainActor in
                self.storeConfig = StoreConfig(
                    isOpen: isOpen,
                    closeReason: reason,
                    isHighDemand: highDemand,
                    maxOrdersPerHour: maxOrders,
                    deliveryRadiusKm: radius
                )
            }
        }
    }

    public func playOrderChime() {
        AudioServicesPlaySystemSound(1007) // iOS SMS/Notification Chime
        UINotificationFeedbackGenerator().notificationOccurred(.success)
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

    // MARK: - Filtered Views

    public var filteredProducts: [Product] {
        var result = products

        let query = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !query.isEmpty {
            result = result.filter { p in
                p.name.lowercased().contains(query) ||
                p.cat.lowercased().contains(query) ||
                (p.distributor ?? "").lowercased().contains(query)
            }
        }

        if let selected = selectedDistributor, !selected.isEmpty {
            result = result.filter { ($0.distributor ?? "Unassigned") == selected }
        }

        if selectedCategory != "All" {
            result = result.filter { $0.cat == selectedCategory }
        }

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

    public var filteredOrders: [Order] {
        var list = recentOrders
        if orderFilterStatus != "All" {
            list = list.filter { order in
                switch orderFilterStatus {
                case "Placed": return order.status.stage == .placed
                case "Packing": return order.status.stage == .packing
                case "Out for Delivery": return order.status.stage == .onTheWay
                case "Delivered": return order.status.stage == .delivered
                case "Cancelled": return order.status.stage == .cancelled
                default: return true
                }
            }
        }
        let q = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !q.isEmpty {
            list = list.filter {
                $0.id.lowercased().contains(q) ||
                $0.deliveryAddress.formattedSummary.lowercased().contains(q)
            }
        }
        return list
    }

    // MARK: - Metrics

    public var totalProductsCount: Int { products.count }
    public var totalStockUnits: Int { products.reduce(0) { $0 + ($1.stock ?? 10) } }
    public var totalStockValuation: Double { products.reduce(0.0) { $0 + (Double($1.stock ?? 10) * $1.price) } }
    public var lowStockCount: Int { products.filter { ($0.stock ?? 10) < 5 }.count }
    public var activeOrdersCount: Int { recentOrders.filter { !$0.status.stage.isFinished }.count }

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

    // MARK: - Operational Actions

    public func updateStock(productId: String, delta: Int) {
        guard let idx = products.firstIndex(where: { $0.id == productId }) else { return }
        let current = products[idx].stock ?? 10
        let newStock = max(0, current + delta)
        updateStock(productId: productId, newStock: newStock)
    }

    public func updateStock(productId: String, newStock: Int) {
        let safeStock = max(0, newStock)
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()

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
        var set = deletedProductIds
        set.insert(productId)
        deletedProductIds = set

        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
            products.removeAll { $0.id == productId }
        }

        db.collection("products").document(productId).setData([
            "active": false,
            "deletedAt": FieldValue.serverTimestamp()
        ], merge: true)
    }

    public func saveProduct(
        id: String? = nil,
        name: String,
        unit: String,
        price: Double,
        originalPrice: Double?,
        cat: String,
        distributor: String,
        img: String,
        stock: Int,
        badge: String?
    ) {
        UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        let prodId = id ?? "prod_\(Date().timeIntervalSince1970)"
        let newProduct = Product(
            id: prodId,
            name: name,
            unit: unit,
            price: price,
            originalPrice: originalPrice,
            badge: badge?.isEmpty == false ? badge : nil,
            img: img.isEmpty ? "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600" : img,
            cat: cat,
            inStock: stock > 0,
            stock: stock,
            distributor: distributor
        )

        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
            if let idx = products.firstIndex(where: { $0.id == prodId }) {
                products[idx] = newProduct
            } else {
                products.insert(newProduct, at: 0)
            }
        }

        if let data = toDict(newProduct) {
            db.collection("products").document(prodId).setData(data, merge: true)
        }
    }

    private func toDict<T: Encodable>(_ value: T) -> [String: Any]? {
        guard let data = try? JSONEncoder().encode(value),
              let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        return dict
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

    public func cancelOrder(order: Order) {
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
        db.collection("orders").document(order.id).setData([
            "status": "Cancelled",
            "cancelledAt": FieldValue.serverTimestamp()
        ], merge: true)
    }

    public func assignDriver(orderId: String, driver: Driver) {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        db.collection("orders").document(orderId).setData([
            "driverId": driver.id,
            "driverName": driver.name,
            "driverPhone": driver.phone,
            "driverVehicle": driver.vehicle,
            "status": "Out for Delivery",
            "dispatchedAt": FieldValue.serverTimestamp()
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
        if let data = toDict(newDist) {
            db.collection("distributors").document(newDist.id).setData(data)
        }
    }

    public func addDriver(name: String, phone: String, vehicle: String) {
        let newDriver = Driver(
            id: "drv_\(Date().timeIntervalSince1970)",
            name: name,
            phone: phone,
            vehicle: vehicle
        )
        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
            drivers.append(newDriver)
        }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        if let data = toDict(newDriver) {
            db.collection("drivers").document(newDriver.id).setData(data)
        }
    }

    public func toggleStore(isOpen: Bool, reason: String) {
        UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        storeConfig.isOpen = isOpen
        storeConfig.closeReason = reason

        db.collection("config").document("store").setData([
            "isOpen": isOpen,
            "closeReason": reason,
            "updatedAt": FieldValue.serverTimestamp()
        ], merge: true)
    }

    public func toggleSurgePricing(enabled: Bool) {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        storeConfig.isHighDemand = enabled

        db.collection("config").document("store").setData([
            "isHighDemand": enabled,
            "updatedAt": FieldValue.serverTimestamp()
        ], merge: true)
    }

    public func addOffer(code: String, title: String, discountPercent: Int, minOrder: Double) {
        let newOffer = Offer(
            id: "off_\(Date().timeIntervalSince1970)",
            code: code.uppercased(),
            title: title,
            discountPercent: discountPercent,
            minOrder: minOrder,
            active: true
        )
        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
            offers.append(newOffer)
        }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        if let data = toDict(newOffer) {
            db.collection("offers").document(newOffer.id).setData(data)
        }
    }

    public func toggleOffer(offerId: String, active: Bool) {
        if let idx = offers.firstIndex(where: { $0.id == offerId }) {
            let old = offers[idx]
            offers[idx] = Offer(id: old.id, code: old.code, title: old.title, discountPercent: old.discountPercent, minOrder: old.minOrder, active: active)
            db.collection("offers").document(offerId).setData(["active": active], merge: true)
        }
    }

    public func deleteOffer(offerId: String) {
        offers.removeAll { $0.id == offerId }
        db.collection("offers").document(offerId).delete()
    }

    public func processBatchInward(distributor: String, invoice: String, increments: [String: Int]) {
        UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        for (prodId, qty) in increments where qty > 0 {
            updateStock(productId: prodId, delta: qty)
        }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
}
