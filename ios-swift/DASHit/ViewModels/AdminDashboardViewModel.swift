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
    case batchInward = "Add Many"
    case importCSV = "Import CSV"

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
        case .importCSV: return "doc.text.fill"
        }
    }
}

public enum AdminSortOption: String, CaseIterable, Identifiable {
    case distributorAsc = "Distributor (A → Z)"
    case distributorDesc = "Distributor (Z → A)"
    case stockAsc = "Lowest stock first"
    case stockDesc = "Highest stock first"
    case valueDesc = "Highest value first"
    case nameAsc = "Name (A → Z)"

    public var id: String { rawValue }
}

/// One distributor's lines in an order, for picking one shelf at a time.
public struct OrderItemGroup: Identifiable {
    public var id: String { distributor }
    public let distributor: String
    public let items: [CartItem]
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
    /// Always starts with "Myself".
    @Published public var distributors: [Distributor] = [Distributor.myself]
    @Published public var recentOrders: [Order] = []
    @Published public var drivers: [Driver] = Driver.defaults
    @Published public var offers: [Offer] = Offer.defaults
    @Published public var storeConfig: StoreConfig = StoreConfig.default
    @Published public var isLoading: Bool = false
    /// Set when the database refuses a change; the dashboard shows it as an alert.
    @Published public var saveError: String? = nil

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

    /// Stops every live listener, e.g. when the owner signs out.
    public func stopListeners() {
        productListener?.remove()
        distributorListener?.remove()
        orderListener?.remove()
        driverListener?.remove()
        offerListener?.remove()
        storeConfigListener?.remove()
        productListener = nil
        distributorListener = nil
        orderListener = nil
        driverListener = nil
        offerListener = nil
        storeConfigListener = nil
    }

    /// Listens again from scratch, after the owner signs in: listeners opened
    /// before that were refused by the database rules.
    public func restartListeners() {
        stopListeners()
        knownOrderIds = []
        isFirstOrderFetch = true
        startListeners()
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
                data["distributor"] = Distributor.resolvedName(data["distributor"] as? String)
                return try? decoder.decode(Product.self, from: data)
            }
            Task { @MainActor in
                self.products = list
                self.isLoading = false
            }
        }

        // 2. Distributors Realtime Listener
        distributorListener = db.collection("distributors").addSnapshotListener { [weak self] snapshot, error in
            guard let self = self, let docs = snapshot?.documents, error == nil else { return }
            let decoder = Firestore.Decoder()
            let list: [Distributor] = docs.compactMap { doc in
                var data = doc.data()
                data["id"] = (data["id"] as? String) ?? doc.documentID
                return try? decoder.decode(Distributor.self, from: data)
            }
            .filter { $0.isReal }
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            Task { @MainActor in
                self.distributors = [Distributor.myself] + list
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
            result = result.filter { Distributor.resolvedName($0.distributor) == selected }
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
            let supplier = Distributor.resolvedName(p.distributor)
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
                category: distObj?.category ?? "",
                phone: distObj?.phone ?? "",
                skuCount: tuple.count,
                totalUnits: tuple.units,
                totalValue: tuple.val,
                lowStockCount: tuple.low
            )
        }.sorted { $0.totalValue > $1.totalValue }
    }

    // MARK: - Operational Actions

    /// Completion for a database write. Every change shows on screen straight
    /// away; if the database refuses it, `undo` puts the screen back and the
    /// owner sees why instead of a change that silently never saved.
    private func saveResult(_ what: String, undo: (@MainActor () -> Void)? = nil) -> (Error?) -> Void {
        return { [weak self] error in
            guard let error else { return }
            Task { @MainActor in
                guard let self else { return }
                undo?()
                UINotificationFeedbackGenerator().notificationOccurred(.error)
                let nsError = error as NSError
                let denied = nsError.domain == FirestoreErrorDomain
                    && nsError.code == FirestoreErrorCode.Code.permissionDenied.rawValue
                self.saveError = denied
                    ? "\(what) wasn't saved. This account isn't allowed to make changes. Sign out and sign in with the owner account."
                    : "\(what) wasn't saved. Check the internet connection and try again."
            }
        }
    }

    private func replaceProduct(_ product: Product) {
        if let idx = products.firstIndex(where: { $0.id == product.id }) {
            products[idx] = product
        }
    }

    /// Items the web console added without a count have no stock number; they
    /// start from 0 here rather than from a made-up amount.
    public func updateStock(productId: String, delta: Int) {
        guard let idx = products.firstIndex(where: { $0.id == productId }) else { return }
        let current = products[idx].stock ?? 0
        let newStock = max(0, current + delta)
        updateStock(productId: productId, newStock: newStock)
    }

    public func updateStock(productId: String, newStock: Int) {
        let safeStock = max(0, newStock)
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()

        var previous: Product? = nil
        if let idx = products.firstIndex(where: { $0.id == productId }) {
            let old = products[idx]
            previous = old
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
        ], merge: true, completion: saveResult("The stock change") { [weak self] in
            if let previous { self?.replaceProduct(previous) }
        })
    }

    public func deleteProduct(productId: String) {
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
        var set = deletedProductIds
        set.insert(productId)
        deletedProductIds = set

        let removed = products.firstIndex(where: { $0.id == productId }).map { ($0, products[$0]) }
        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
            products.removeAll { $0.id == productId }
        }

        db.collection("products").document(productId).setData([
            "active": false,
            "deletedAt": FieldValue.serverTimestamp()
        ], merge: true, completion: saveResult("Deleting the item") { [weak self] in
            guard let self else { return }
            var set = self.deletedProductIds
            set.remove(productId)
            self.deletedProductIds = set
            if let removed, !self.products.contains(where: { $0.id == productId }) {
                self.products.insert(removed.1, at: min(removed.0, self.products.count))
            }
        })
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
        stock: Int?,
        badge: String?
    ) {
        UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        let prodId = id ?? "prod_\(Date().timeIntervalSince1970)"
        let existing = products.first(where: { $0.id == prodId })
        let cleanBadge = badge?.isEmpty == false ? badge : nil
        let image = img.isEmpty ? "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600" : img

        // An edit keeps what the form doesn't show (rating, variants, nutrition,
        // age limit); only a brand-new item takes the defaults.
        let newProduct = Product(
            id: prodId,
            name: name,
            unit: unit,
            price: price,
            originalPrice: originalPrice,
            rating: existing?.rating ?? "4.8",
            ratingCount: existing?.ratingCount ?? "120",
            time: existing?.time ?? "8 mins",
            options: existing?.options,
            badge: cleanBadge,
            img: image,
            cat: cat,
            variants: existing?.variants,
            ageRestricted: existing?.ageRestricted ?? false,
            minAge: existing?.minAge,
            inStock: stock.map { $0 > 0 } ?? existing?.inStock ?? true,
            nutrition: existing?.nutrition,
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

        let data: [String: Any]
        if existing != nil {
            // Only the fields the form edits, so nothing else on the item is overwritten.
            var edited: [String: Any] = [
                "name": name,
                "unit": unit,
                "price": price,
                "originalPrice": originalPrice.map { $0 as Any } ?? FieldValue.delete(),
                "badge": cleanBadge.map { $0 as Any } ?? FieldValue.delete(),
                "img": image,
                "cat": cat,
                "distributor": distributor,
                "active": true,
                "updatedAt": FieldValue.serverTimestamp()
            ]
            if let stock {
                edited["stock"] = stock
                edited["inStock"] = stock > 0
            }
            data = edited
        } else {
            var fresh = toDict(newProduct) ?? [:]
            fresh["active"] = true
            fresh["createdAt"] = FieldValue.serverTimestamp()
            data = fresh
        }

        db.collection("products").document(prodId).setData(data, merge: true, completion: saveResult("The item") { [weak self] in
            guard let self else { return }
            if let existing {
                self.replaceProduct(existing)
            } else {
                self.products.removeAll { $0.id == prodId }
            }
        })
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
        case .packing:
            // Leaving the store is done by assigning a rider, so the customer
            // and the driver app always know who is bringing the order.
            guard order.driverId?.isEmpty == false else {
                UINotificationFeedbackGenerator().notificationOccurred(.error)
                saveError = "Assign a rider before sending this order out."
                return
            }
            nextStatus = "Out for Delivery"
        case .onTheWay: nextStatus = "Delivered"
        default: return
        }

        db.collection("orders").document(order.id).setData([
            "status": nextStatus,
            "updatedAt": FieldValue.serverTimestamp()
        ], merge: true, completion: saveResult("The order update"))
    }

    public func cancelOrder(order: Order) {
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
        db.collection("orders").document(order.id).setData([
            "status": "Cancelled",
            "cancelledAt": FieldValue.serverTimestamp()
        ], merge: true, completion: saveResult("Cancelling the order"))
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
        ], merge: true, completion: saveResult("Assigning the rider"))
    }

    /// Saves a distributor and returns the name to use. A name that's already on
    /// the list (or "Myself") reuses that one instead of adding a copy.
    @discardableResult
    public func addDistributor(name: String, phone: String = "", address: String = "", notes: String = "") -> String {
        let clean = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return Distributor.selfName }
        if let existing = distributors.first(where: { $0.name.caseInsensitiveCompare(clean) == .orderedSame }) {
            return existing.name
        }
        let newDist = Distributor(
            id: "DIST-\(Int(Date().timeIntervalSince1970 * 1000))",
            name: clean,
            phone: phone.trimmingCharacters(in: .whitespacesAndNewlines),
            address: address.trimmingCharacters(in: .whitespacesAndNewlines),
            notes: notes.trimmingCharacters(in: .whitespacesAndNewlines)
        )
        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
            distributors.append(newDist)
        }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        // Same fields the web console writes, so both show the same list.
        db.collection("distributors").document(newDist.id).setData([
            "name": newDist.name,
            "phone": newDist.phone,
            "address": newDist.address,
            "notes": newDist.notes,
            "active": true,
            "updatedAt": FieldValue.serverTimestamp()
        ], merge: true, completion: saveResult("The new distributor") { [weak self] in
            self?.distributors.removeAll { $0.id == newDist.id }
        })
        return newDist.name
    }

    /// Takes a distributor off the list. Their items stay in stock.
    public func removeDistributor(_ distributor: Distributor) {
        guard !distributor.isSelf else { return }
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
            distributors.removeAll { $0.id == distributor.id }
        }
        db.collection("distributors").document(distributor.id).delete(completion: saveResult("Removing \(distributor.name)") { [weak self] in
            guard let self, !self.distributors.contains(where: { $0.id == distributor.id }) else { return }
            let others = self.distributors.filter { !$0.isSelf } + [distributor]
            self.distributors = [Distributor.myself]
                + others.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        })
    }

    // MARK: - Picking

    static let unknownDistributorLabel = "Not in the item list"

    /// The order's lines grouped by who supplied the stock: the owner's own
    /// first, then each distributor A→Z, then lines no longer in the item list.
    /// Same grouping as `groupOrderItemsByDistributor` on the web console.
    public func itemsByDistributor(_ order: Order) -> [OrderItemGroup] {
        var byId: [String: Product] = [:]
        var byName: [String: Product] = [:]
        for product in products {
            byId[product.id.lowercased()] = product
            byName[product.name.lowercased()] = product
        }
        func product(for item: CartItem) -> Product? {
            for key in [item.productId, item.id].map({ $0.lowercased() }) where !key.isEmpty {
                if let match = byId[key] { return match }
                // A size variant ("54-6pcs") belongs to its product ("54").
                if let parent = key.split(separator: "-").first, let match = byId[String(parent)] { return match }
            }
            return byName[item.name.lowercased()]
        }

        var labels: [String] = []
        var groups: [String: [CartItem]] = [:]
        for item in order.items {
            let label = product(for: item).map { Distributor.resolvedName($0.distributor) }
                ?? Self.unknownDistributorLabel
            if groups[label] == nil { labels.append(label) }
            groups[label, default: []].append(item)
        }
        func rank(_ label: String) -> Int {
            label == Distributor.selfName ? 0 : label == Self.unknownDistributorLabel ? 2 : 1
        }
        return labels
            .sorted { a, b in
                rank(a) != rank(b) ? rank(a) < rank(b) : a.localizedCaseInsensitiveCompare(b) == .orderedAscending
            }
            .map { OrderItemGroup(distributor: $0, items: groups[$0] ?? []) }
    }

    // MARK: - CSV import

    /// Saves the checked lines of a CSV file, all marked as from `distributor`.
    /// Returns how many items were saved.
    public func applyCSVImport(_ items: [CSVStockImport.Item], mode: CSVStockImport.Mode, distributor: String) async throws -> Int {
        let chosen = items.filter { $0.include && $0.problem == nil && CSVStockImport.isValidDocumentID($0.id) }
        guard !chosen.isEmpty else { return 0 }
        UIImpactFeedbackGenerator(style: .heavy).impactOccurred()

        // Firestore takes up to 500 writes per batch.
        var start = 0
        while start < chosen.count {
            let chunk = chosen[start..<min(start + 400, chosen.count)]
            let batch = db.batch()
            for item in chunk {
                let ref = db.collection("products").document(item.id)
                if let existing = item.existing {
                    var data: [String: Any] = [
                        "distributor": distributor,
                        "active": true,
                        "updatedAt": FieldValue.serverTimestamp()
                    ]
                    switch mode {
                    case .add:
                        data["stock"] = FieldValue.increment(Int64(item.qty))
                        if item.qty > 0 { data["inStock"] = true }
                    case .set:
                        data["stock"] = item.qty
                        data["inStock"] = item.qty > 0
                    }
                    if let price = item.price, price != existing.price { data["price"] = price }
                    if let mrp = item.mrp { data["originalPrice"] = mrp }
                    if item.hasNewPhoto { data["img"] = item.img }
                    batch.setData(data, forDocument: ref, merge: true)
                } else {
                    let price = item.price ?? 0
                    let product = Product(
                        id: item.id,
                        name: item.name,
                        unit: item.unit.isEmpty ? "1 pc" : item.unit,
                        price: price,
                        originalPrice: item.mrp ?? price,
                        img: item.img,
                        cat: item.category.isEmpty ? "Grocery" : item.category,
                        inStock: item.qty > 0,
                        stock: item.qty,
                        distributor: distributor
                    )
                    var data = toDict(product) ?? [:]
                    data["active"] = true
                    data["createdAt"] = FieldValue.serverTimestamp()
                    if !item.brand.isEmpty { data["brand"] = item.brand }
                    batch.setData(data, forDocument: ref, merge: true)
                }
            }
            try await batch.commit()
            start += chunk.count
        }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        return chosen.count
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
            db.collection("drivers").document(newDriver.id).setData(data, completion: saveResult("The new rider") { [weak self] in
                self?.drivers.removeAll { $0.id == newDriver.id }
            })
        }
    }

    public func toggleStore(isOpen: Bool, reason: String) {
        UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        let previous = storeConfig
        storeConfig.isOpen = isOpen
        storeConfig.closeReason = reason

        db.collection("config").document("store").setData([
            "isOpen": isOpen,
            "closeReason": reason,
            "updatedAt": FieldValue.serverTimestamp()
        ], merge: true, completion: saveResult(isOpen ? "Opening the store" : "Closing the store") { [weak self] in
            self?.storeConfig.isOpen = previous.isOpen
            self?.storeConfig.closeReason = previous.closeReason
        })
    }

    public func toggleSurgePricing(enabled: Bool) {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        let previous = storeConfig.isHighDemand
        storeConfig.isHighDemand = enabled

        db.collection("config").document("store").setData([
            "isHighDemand": enabled,
            "updatedAt": FieldValue.serverTimestamp()
        ], merge: true, completion: saveResult("The busy-hours setting") { [weak self] in
            self?.storeConfig.isHighDemand = previous
        })
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
            db.collection("offers").document(newOffer.id).setData(data, completion: saveResult("The new discount") { [weak self] in
                self?.offers.removeAll { $0.id == newOffer.id }
            })
        }
    }

    public func toggleOffer(offerId: String, active: Bool) {
        if let idx = offers.firstIndex(where: { $0.id == offerId }) {
            let old = offers[idx]
            offers[idx] = Offer(id: old.id, code: old.code, title: old.title, discountPercent: old.discountPercent, minOrder: old.minOrder ?? 199.0, active: active)
            db.collection("offers").document(offerId).setData(["active": active], merge: true, completion: saveResult(active ? "Turning the discount on" : "Turning the discount off") { [weak self] in
                guard let self, let i = self.offers.firstIndex(where: { $0.id == offerId }) else { return }
                self.offers[i] = old
            })
        }
    }

    public func deleteOffer(offerId: String) {
        guard let idx = offers.firstIndex(where: { $0.id == offerId }) else { return }
        let removed = offers.remove(at: idx)
        db.collection("offers").document(offerId).delete(completion: saveResult("Deleting the discount") { [weak self] in
            guard let self, !self.offers.contains(where: { $0.id == offerId }) else { return }
            self.offers.insert(removed, at: min(idx, self.offers.count))
        })
    }

    public func processBatchInward(distributor: String, invoice: String, increments: [String: Int]) {
        UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        for (prodId, qty) in increments where qty > 0 {
            updateStock(productId: prodId, delta: qty)
        }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
}
