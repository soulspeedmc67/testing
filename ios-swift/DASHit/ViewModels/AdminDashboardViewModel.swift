import Foundation
import SwiftUI
import Combine
import FirebaseFirestore
import FirebaseAuth
import AudioToolbox
import AVFoundation

/// The admin's sections, named and grouped as on the web console's sidebar:
/// what the day needs up front, everything else under "More".
public enum AdminTab: String, CaseIterable, Identifiable {
    case home = "Home"
    case orders = "Orders"
    case inventory = "Stock"
    case riders = "Riders"
    case notify = "Notify customers"
    case addProduct = "Add an item"
    case distributors = "Distributors"
    case offers = "Discounts"
    case storeControls = "Shop settings"
    case batchInward = "Add many at once"
    case importCSV = "Import CSV"

    public enum NavGroup: String, CaseIterable, Identifiable {
        case everyDay = "Every day"
        case more = "More"
        public var id: String { rawValue }
    }

    public var id: String { rawValue }

    public var group: NavGroup {
        switch self {
        case .home, .orders, .inventory, .riders, .notify: return .everyDay
        case .addProduct, .distributors, .offers, .storeControls, .batchInward, .importCSV: return .more
        }
    }

    /// One plain line under the title, saying what the page is for.
    public var explanation: String {
        switch self {
        case .home: return "How the shop is doing today, and what needs doing now."
        case .orders: return "New orders show up here. Pack them, then give them to a rider."
        case .inventory: return "How many of each item you have. Tap − or + to change the number."
        case .addProduct: return "Put a new item in the shop."
        case .riders: return "The people who deliver your orders."
        case .notify: return "Send one notification to every customer with the app: offers, new items, shop news."
        case .distributors: return "The people and companies you buy stock from."
        case .offers: return "Coupon codes your customers can use."
        case .storeControls: return "Open or close the shop, and turn busy-hours pricing on or off."
        case .batchInward: return "Got a delivery of stock? Add it for many items at once."
        case .importCSV: return "Add or update many items from a file."
        }
    }

    public var iconName: String {
        switch self {
        case .home: return "house.fill"
        case .orders: return "shippingbox.fill"
        case .inventory: return "square.grid.2x2.fill"
        case .addProduct: return "plus.circle.fill"
        case .riders: return "scooter"
        case .notify: return "megaphone.fill"
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
    @Published public var selectedTab: AdminTab = .home

    // Core Data Entities
    @Published public var products: [Product] = []
    /// Always starts with "Myself".
    @Published public var distributors: [Distributor] = [Distributor.myself]
    @Published public var recentOrders: [Order] = []
    /// Every order from the last seven days, for the Home page's numbers and charts.
    @Published public var weekOrders: [Order] = []
    /// Every rider account, live: approved, waiting for approval, and turned off.
    @Published public var drivers: [Driver] = []
    /// Approved riders, the ones an order can go to.
    public var approvedDrivers: [Driver] { drivers.filter(\.isApproved) }
    /// Orders a rider is carrying right now (assigned and not finished).
    public func activeOrderCount(for driver: Driver) -> Int {
        recentOrders.filter { $0.driverId == driver.id && !$0.status.stage.isFinished }.count
    }

    /// Signed up in the rider app, waiting for the owner to approve them.
    public var waitingDrivers: [Driver] { drivers.filter(\.isWaiting) }
    @Published public var offers: [Offer] = Offer.defaults
    @Published public var coupons: [Coupon] = Coupon.defaultCatalog
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
    private var couponListener: ListenerRegistration?
    private var storeConfigListener: ListenerRegistration?
    private var weekOrderListener: ListenerRegistration?
    private var knownOrderIds: Set<String> = []
    private var isFirstOrderFetch: Bool = true

    public init() {
        startListeners()
    }

    deinit {
        weekOrderListener?.remove()
        productListener?.remove()
        distributorListener?.remove()
        orderListener?.remove()
        driverListener?.remove()
        offerListener?.remove()
        couponListener?.remove()
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
        couponListener?.remove()
        storeConfigListener?.remove()
        weekOrderListener?.remove()
        weekOrderListener = nil
        productListener = nil
        distributorListener = nil
        orderListener = nil
        driverListener = nil
        offerListener = nil
        couponListener = nil
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

        // 1. Products: the same change-only sync as the shop (FirestoreService),
        // so opening the dashboard doesn't re-read every item from the server.
        productListener = FirestoreService.shared.listenProducts { [weak self] fetched in
            // Empty means the read failed (or nothing is cached yet): keep what's shown.
            guard let self = self, !fetched.isEmpty else { return }
            let deleted = self.deletedProductIds
            self.products = fetched
                .filter { !deleted.contains($0.id) }
                .map { $0.withDistributor(Distributor.resolvedName($0.distributor)) }
            self.isLoading = false
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
        // Only orders with a real date: Firestore sorts other types (old
        // orders saved the date as text) above every date, which pushed new
        // orders down the "All" list and out of the newest 50.
        orderListener = db.collection("orders")
            .whereField("createdAt", isGreaterThan: Timestamp(seconds: 0, nanoseconds: 0))
            .order(by: "createdAt", descending: true)
            .limit(to: 100)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self, let docs = snapshot?.documents, error == nil else { return }
                let decoder = Firestore.Decoder()
                let list: [Order] = docs.compactMap { doc in
                    var data = doc.data()
                    // The document's own id: every change (pack, assign a rider,
                    // deliver) is written to orders/{order.id}, and Order prefers
                    // an orderId field, which must never point somewhere else.
                    data["id"] = doc.documentID
                    data["orderId"] = doc.documentID
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
                    self.recentOrders = list.sorted { $0.createdAt > $1.createdAt }
                    self.coverWeek(with: self.recentOrders, reachedLimit: docs.count >= 100)
                }
            }

        // 4. Riders, live: the staff records with role "driver", the same ones the
        // website and the rider app use (drivers/ only holds their GPS).
        driverListener = db.collection("staff").whereField("role", isEqualTo: "driver")
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self, let docs = snapshot?.documents, error == nil else { return }
                let list = docs.map { Driver(id: $0.documentID, staff: $0.data()) }
                    .sorted { ($0.isWaiting ? 0 : $0.isApproved ? 1 : 2, $0.name) < ($1.isWaiting ? 0 : $1.isApproved ? 1 : 2, $1.name) }
                Task { @MainActor in
                    self.drivers = list
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

        // 7. Checkout Coupons Realtime Listener (config/coupons)
        couponListener = db.collection("config").document("coupons").addSnapshotListener { [weak self] doc, error in
            guard let self = self, let doc = doc, doc.exists, error == nil, let data = doc.data() else { return }
            if let list = data["list"] as? [[String: Any]] {
                let decoded = list.compactMap { item -> Coupon? in
                    let code = (item["code"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines).uppercased() ?? ""
                    guard !code.isEmpty else { return nil }
                    let title = item["title"] as? String ?? ""
                    let desc = item["description"] as? String ?? ""
                    let discount = (item["discount"] as? Double) ?? Double(item["discount"] as? Int ?? 0)
                    let minOrder = (item["minOrder"] as? Double) ?? Double(item["minOrder"] as? Int ?? 0)
                    let waives = (item["waivesDelivery"] as? Bool) ?? (code == "FREEDEL")
                    let cond = item["condition"] as? String ?? ""
                    let active = item["active"] as? Bool ?? true
                    return Coupon(
                        id: code,
                        code: code,
                        title: title,
                        description: desc,
                        discount: discount,
                        minOrder: minOrder,
                        waivesDelivery: waives,
                        condition: cond,
                        active: active
                    )
                }
                Task { @MainActor in
                    let resolved = decoded.isEmpty ? Coupon.defaultCatalog : decoded
                    self.coupons = resolved
                    Coupon.dynamicCatalog = resolved
                }
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

    // MARK: - Home page numbers

    /// Orders that count as sales: everything but cancelled ones.
    /// The Home charts need the last seven days of orders. When the newest 100
    /// (already being listened to) reach back a whole week, they are worked out
    /// from those, at no extra reads; only a busier week opens a second
    /// listener for the rest.
    private func coverWeek(with recent: [Order], reachedLimit: Bool) {
        let weekStart = Calendar.current.date(byAdding: .day, value: -6, to: Calendar.current.startOfDay(for: Date())) ?? Date()
        let start = weekStart.timeIntervalSince1970
        let oldest = recent.last?.createdAt ?? .infinity
        if !reachedLimit || oldest < start {
            weekOrderListener?.remove()
            weekOrderListener = nil
            weekOrders = recent.filter { $0.createdAt >= start }
            return
        }
        guard weekOrderListener == nil else { return }
        weekOrderListener = db.collection("orders")
            .whereField("createdAt", isGreaterThanOrEqualTo: Timestamp(date: weekStart))
            .order(by: "createdAt", descending: true)
            .limit(to: 1000)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self, let docs = snapshot?.documents, error == nil else { return }
                let decoder = Firestore.Decoder()
                let list: [Order] = docs.compactMap { doc in
                    var data = doc.data()
                    data["id"] = (data["id"] as? String) ?? doc.documentID
                    return try? decoder.decode(Order.self, from: data)
                }
                Task { @MainActor in
                    self.weekOrders = list
                }
            }
    }

    private var weekSales: [Order] { weekOrders.filter { $0.status.stage != .cancelled } }

    private func orders(on day: Date) -> [Order] {
        let start = Calendar.current.startOfDay(for: day).timeIntervalSince1970
        let end = start + 86_400
        return weekSales.filter { $0.createdAt >= start && $0.createdAt < end }
    }

    public var todaySales: Double { orders(on: Date()).reduce(0) { $0 + $1.grandTotal } }
    public var yesterdaySales: Double {
        orders(on: Date().addingTimeInterval(-86_400)).reduce(0) { $0 + $1.grandTotal }
    }
    public var todayOrderCount: Int { orders(on: Date()).count }
    public var yesterdayOrderCount: Int { orders(on: Date().addingTimeInterval(-86_400)).count }
    public var todayItemsSold: Int {
        orders(on: Date()).reduce(0) { total, order in total + order.items.reduce(0) { $0 + $1.qty } }
    }
    public var todayAverageOrder: Double {
        todayOrderCount == 0 ? 0 : todaySales / Double(todayOrderCount)
    }
    /// Orders waiting for the shop: just placed or being packed.
    public var ordersToPack: Int {
        recentOrders.filter { $0.status.stage == .placed || $0.status.stage == .packing }.count
    }
    public var ordersOnTheWay: Int { recentOrders.filter { $0.status.stage == .onTheWay }.count }

    public struct DaySales: Identifiable {
        public var id: Date { day }
        public let day: Date
        public let sales: Double
        public let orders: Int
        public var isToday: Bool { Calendar.current.isDateInToday(day) }
    }

    /// Sales for each of the last seven days, oldest first; days without orders show as 0.
    public var salesByDay: [DaySales] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        return (0..<7).reversed().compactMap { back -> DaySales? in
            guard let day = calendar.date(byAdding: .day, value: -back, to: today) else { return nil }
            let list = orders(on: day)
            return DaySales(day: day, sales: list.reduce(0) { $0 + $1.grandTotal }, orders: list.count)
        }
    }

    public struct HourCount: Identifiable {
        public var id: Int { hour }
        public let hour: Int
        public let orders: Int
    }

    /// Today's orders by the hour they came in, from 7 am (or the first order) to now.
    public var ordersByHourToday: [HourCount] {
        let calendar = Calendar.current
        let hours = orders(on: Date()).map { calendar.component(.hour, from: Date(timeIntervalSince1970: $0.createdAt)) }
        let now = calendar.component(.hour, from: Date())
        let first = min(7, hours.min() ?? 7)
        guard first <= now else { return [] }
        return (first...now).map { hour in HourCount(hour: hour, orders: hours.filter { $0 == hour }.count) }
    }

    public struct ItemSales: Identifiable {
        public var id: String { name }
        public let name: String
        public let units: Int
    }

    /// The items sold most this week, by pieces.
    public var bestSellers: [ItemSales] {
        var units: [String: Int] = [:]
        for order in weekSales {
            for item in order.items { units[item.name, default: 0] += item.qty }
        }
        return units
            .sorted { $0.value != $1.value ? $0.value > $1.value : $0.key < $1.key }
            .prefix(5)
            .map { ItemSales(name: $0.key, units: $0.value) }
    }

    public struct DistributorStock: Identifiable {
        public var id: String { name }
        public let name: String
        public let units: Int
    }

    /// Pieces in stock from each distributor; the smallest ones are put together as "Others".
    public var stockByDistributor: [DistributorStock] {
        var units: [String: Int] = [:]
        for product in products {
            units[Distributor.resolvedName(product.distributor), default: 0] += max(0, product.stock ?? 0)
        }
        let sorted = units.filter { $0.value > 0 }.sorted { $0.value > $1.value }
        var result = sorted.prefix(5).map { DistributorStock(name: $0.key, units: $0.value) }
        let rest = sorted.dropFirst(5).reduce(0) { $0 + $1.value }
        if rest > 0 { result.append(DistributorStock(name: "Others", units: rest)) }
        return result
    }

    /// Items with fewer than 5 left, fewest first.
    public var runningOut: [Product] {
        products
            .filter { ($0.stock ?? 10) < 5 }
            .sorted { ($0.stock ?? 0) < ($1.stock ?? 0) }
    }

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
    /// As `saveResult`, and once saved, the shopper gets the push for the new status.
    private func saveThenNotify(_ what: String, orderId: String) -> (Error?) -> Void {
        let report = saveResult(what)
        return { error in
            report(error)
            if error == nil { Push.shared.orderChanged(orderId) }
        }
    }

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

        // updatedAt on every product change: the shop apps only download
        // items changed since their last visit.
        db.collection("products").document(productId).setData([
            "stock": safeStock,
            "inStock": safeStock > 0,
            "updatedAt": FieldValue.serverTimestamp()
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
            "deletedAt": FieldValue.serverTimestamp(),
            "updatedAt": FieldValue.serverTimestamp()
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
        // Never a stock picture: an item without a photo stays without one (it shows its first letter).
        let image = img.trimmingCharacters(in: .whitespacesAndNewlines)

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
            fresh["updatedAt"] = FieldValue.serverTimestamp()
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
        case .placed: nextStatus = "Packed"
        case .packing:
            // Normally the rider sends it out ("Start delivery" in the rider
            // app); doing it here still needs a rider, so the customer and the
            // rider app always know who is bringing the order.
            guard order.driverId?.isEmpty == false else {
                UINotificationFeedbackGenerator().notificationOccurred(.error)
                saveError = "Assign a rider before sending this order out."
                return
            }
            nextStatus = "Out for Delivery"
        case .onTheWay: nextStatus = "Delivered"
        default: return
        }

        // Optimistically update recentOrders
        if let idx = recentOrders.firstIndex(where: { $0.id == order.id }) {
            recentOrders[idx].status = OrderStatus(stage: DeliveryStage(status: nextStatus))
        }

        db.collection("orders").document(order.id).setData([
            "status": nextStatus,
            "updatedAt": FieldValue.serverTimestamp()
        ], merge: true, completion: saveThenNotify("The order update", orderId: order.id))
    }

    public func cancelOrder(order: Order) {
        rejectOrder(order: order, reason: "Customer cancelled")
    }

    public func rejectOrder(order: Order, reason: String) {
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
        if let idx = recentOrders.firstIndex(where: { $0.id == order.id }) {
            recentOrders[idx].status = .cancelled
            recentOrders[idx].rejectionReason = reason
        }
        db.collection("orders").document(order.id).setData([
            "status": "Cancelled",
            "rejectionReason": reason,
            "cancelledReason": reason,
            "cancelledAt": FieldValue.serverTimestamp(),
            "updatedAt": FieldValue.serverTimestamp()
        ], merge: true, completion: saveThenNotify("Rejecting the order", orderId: order.id))
    }

    public func assignDriver(orderId: String, driver: Driver) {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()

        // Optimistically update locally on MainActor so the driver immediately attaches
        if let idx = recentOrders.firstIndex(where: { $0.id == orderId }) {
            recentOrders[idx].driverId = driver.id
            recentOrders[idx].driverName = driver.name
            recentOrders[idx].driverPhone = driver.phone
        }

        var updatePayload: [String: Any] = [
            "driverId": driver.id,
            "driverName": driver.name,
            "driverPhone": driver.phone,
            "driverVehicle": driver.vehicle,
            "assignedAt": FieldValue.serverTimestamp(),
            "updatedAt": FieldValue.serverTimestamp()
        ]

        // Ensure order is in standard "Packed" status so the driver app and query catch it immediately
        if let current = recentOrders.first(where: { $0.id == orderId }),
           current.status.stage == .packing {
            updatePayload["status"] = "Packed"
        }

        db.collection("orders").document(orderId).setData(
            updatePayload,
            merge: true,
            completion: saveThenNotify("Assigning the rider", orderId: orderId)
        )
        seedRiderPosition(orderId: orderId, driverId: driver.id)
    }

    /// Puts the rider's last known position (from the last few minutes) on the
    /// order, so the customer's map starts at the rider instead of drawing the
    /// route from the store until the rider app's next GPS write. Same as the
    /// web console: one read, one write.
    private func seedRiderPosition(orderId: String, driverId: String) {
        let db = self.db
        db.collection("drivers").document(driverId).collection("telemetry").document("live").getDocument { snap, _ in
            guard let t = snap?.data(),
                  let lat = t["latitude"] as? Double, let lng = t["longitude"] as? Double,
                  let at = (t["updatedAt"] as? Timestamp)?.dateValue(),
                  Date().timeIntervalSince(at) < 180 else { return }
            db.collection("orders").document(orderId).collection("tracking").document("live").setData([
                "latitude": lat,
                "longitude": lng,
                "heading": t["heading"] as? Double ?? 0,
                "speed": t["speed"] as? Double ?? 0,
                "accuracy": t["accuracy"] as? Double ?? 0,
                "driverId": driverId,
                "updatedAt": FieldValue.serverTimestamp()
            ], merge: true)
        }
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

    /// "Delete all" for one distributor: removes every item whose stock came
    /// from them ("Myself" covers items with no distributor). The distributor
    /// stays on the list. Returns how many items were deleted.
    @discardableResult
    public func deleteAllProducts(from distributorName: String) -> Int {
        let removed = products.filter { Distributor.resolvedName($0.distributor) == distributorName }
        guard !removed.isEmpty else { return 0 }
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
        let ids = Set(removed.map(\.id))
        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
            products.removeAll { ids.contains($0.id) }
        }

        let all = removed.map(\.id)
        var start = 0
        while start < all.count {
            let chunk = all[start..<min(start + 400, all.count)]
            let batch = db.batch()
            // Marked removed rather than erased, so shop apps that only fetch
            // changes also learn the items are gone.
            chunk.forEach {
                batch.setData([
                    "active": false,
                    "deletedAt": FieldValue.serverTimestamp(),
                    "updatedAt": FieldValue.serverTimestamp()
                ], forDocument: db.collection("products").document($0), merge: true)
            }
            let restore = removed.filter { chunk.contains($0.id) }
            batch.commit(completion: saveResult("Deleting \(distributorName)'s items") { [weak self] in
                guard let self else { return }
                let missing = restore.filter { p in !self.products.contains { $0.id == p.id } }
                self.products.append(contentsOf: missing)
            })
            start += chunk.count
        }
        return removed.count
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
                    data["updatedAt"] = FieldValue.serverTimestamp()
                    if !item.brand.isEmpty { data["brand"] = item.brand }
                    batch.setData(data, forDocument: ref, merge: true)
                }
            }
            try await batch.commit()
            start += chunk.count
        }
        // Items stocked again come back even if they were deleted on this iPad before.
        let restocked = Set(chosen.map(\.id))
        let deleted = deletedProductIds
        if !deleted.isDisjoint(with: restocked) { deletedProductIds = deleted.subtracting(restocked) }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        return chosen.count
    }

    /// Rider accounts are made and switched on or off by the server
    /// (public/api/staff/add-driver.php), which can create sign-ins; the app
    /// can't. Returns an error message, or nil when it worked.
    public func riderAction(_ body: [String: Any]) async -> String? {
        guard let user = Auth.auth().currentUser, let token = try? await user.getIDToken() else {
            return "Please sign in again."
        }
        var payload = body
        payload["id_token"] = token
        var request = URLRequest(url: URL(string: "https://dashit.co.in/api/staff/add-driver.php")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        request.timeoutInterval = 25
        guard let (data, response) = try? await URLSession.shared.data(for: request) else {
            return "No internet. Try again."
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if (200..<300).contains(status) {
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return nil
        }
        UINotificationFeedbackGenerator().notificationOccurred(.error)
        let message = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String
        return message ?? "That didn't work. Try again."
    }

    /// A new rider: they sign in to the rider app with this phone number and 4-digit PIN.
    public func addDriver(name: String, phone: String, pin: String) async -> String? {
        await riderAction(["action": "create", "name": name, "phone": phone, "pin": pin])
    }

    /// Approves a waiting rider, or turns a rider on or off.
    public func setDriver(_ driver: Driver, approved: Bool) async -> String? {
        await riderAction(["action": "toggle-active", "uid": driver.id, "active": approved])
    }

    /// A new 4-digit PIN for a rider who forgot theirs.
    public func resetPin(_ driver: Driver, pin: String) async -> String? {
        await riderAction(["action": "reset-pin", "uid": driver.id, "pin": pin])
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

    // MARK: - Checkout Coupons Management (config/coupons)

    public func saveCoupon(_ coupon: Coupon, editingCode: String? = nil) {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        var current = coupons
        let cleanCode = coupon.code.trimmingCharacters(in: .whitespacesAndNewlines).uppercased().replacingOccurrences(of: " ", with: "")
        guard !cleanCode.isEmpty else { return }

        let normalized = Coupon(
            id: cleanCode,
            code: cleanCode,
            title: coupon.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? (coupon.waivesDelivery == true ? "100% Free Delivery on your order" : "₹\(Int(coupon.discount)) Off on orders of ₹\(Int(coupon.minOrder))+")
                : coupon.title.trimmingCharacters(in: .whitespacesAndNewlines),
            description: coupon.description.trimmingCharacters(in: .whitespacesAndNewlines),
            discount: coupon.waivesDelivery == true ? 0 : max(0, coupon.discount),
            minOrder: max(0, coupon.minOrder),
            waivesDelivery: coupon.waivesDelivery ?? (cleanCode == "FREEDEL"),
            condition: coupon.condition?.trimmingCharacters(in: .whitespacesAndNewlines),
            active: coupon.active ?? true
        )

        let targetCode = (editingCode?.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()) ?? cleanCode
        if let idx = current.firstIndex(where: { $0.code.uppercased() == targetCode }) {
            current[idx] = normalized
        } else if let idx = current.firstIndex(where: { $0.code.uppercased() == cleanCode }) {
            current[idx] = normalized
        } else {
            current.insert(normalized, at: 0)
        }

        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
            coupons = current
            Coupon.dynamicCatalog = current
        }

        persistCoupons(current, title: "Saving offer code \(cleanCode)")
    }

    public func deleteCoupon(code: String) {
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
        let cleanCode = code.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        var current = coupons
        current.removeAll { $0.code.uppercased() == cleanCode }

        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
            coupons = current
            Coupon.dynamicCatalog = current
        }

        persistCoupons(current, title: "Removing offer code \(cleanCode)")
    }

    public func toggleCouponActive(code: String, active: Bool) {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        let cleanCode = code.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        var current = coupons
        if let idx = current.firstIndex(where: { $0.code.uppercased() == cleanCode }) {
            let old = current[idx]
            current[idx] = Coupon(
                id: old.id,
                code: old.code,
                title: old.title,
                description: old.description,
                discount: old.discount,
                minOrder: old.minOrder,
                waivesDelivery: old.waivesDelivery,
                condition: old.condition,
                active: active
            )
        }

        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
            coupons = current
            Coupon.dynamicCatalog = current
        }

        persistCoupons(current, title: active ? "Activating \(cleanCode)" : "Deactivating \(cleanCode)")
    }

    public func resetDefaultCoupons() {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        let defaults = Coupon.defaultCatalog
        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
            coupons = defaults
            Coupon.dynamicCatalog = defaults
        }
        persistCoupons(defaults, title: "Resetting offer codes to defaults")
    }

    private func persistCoupons(_ list: [Coupon], title: String) {
        let serialized: [[String: Any]] = list.map { c in
            [
                "code": c.code,
                "title": c.title,
                "description": c.description,
                "discount": c.discount,
                "minOrder": c.minOrder,
                "waivesDelivery": c.waivesDelivery ?? (c.code == "FREEDEL"),
                "condition": c.condition ?? "",
                "active": c.active ?? true
            ]
        }

        db.collection("config").document("coupons").setData([
            "list": serialized,
            "updatedAt": FieldValue.serverTimestamp()
        ], merge: true, completion: saveResult(title))
    }

    public func processBatchInward(distributor: String, invoice: String, increments: [String: Int]) {
        UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        for (prodId, qty) in increments where qty > 0 {
            updateStock(productId: prodId, delta: qty)
        }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
}

#if DEBUG
// MARK: - Sample shop (simulator screenshots only)

extension AdminDashboardViewModel {
    /// Fills the dashboard with a believable week of orders and stock, so the
    /// simulator-screenshot job can show every page without the owner's
    /// sign-in. Debug builds only; the App Store build never has this.
    func loadDemoData() {
        stopListeners()
        let suppliers = ["Zahoor Traders", "Kashmir Dairy Co", "Valley Snacks", "Lone Wholesale"]
        distributors = [Distributor.myself] + suppliers.enumerated().map { Distributor(id: "D\($0.offset)", name: $0.element) }

        let stockPattern = [42, 3, 18, 0, 26, 7, 55, 2, 14, 31, 9, 4, 60, 22, 11]
        products = CatalogSeed.products.enumerated().map { index, seed in
            let stock = stockPattern[index % stockPattern.count]
            let supplier = index % 5 == 0 ? Distributor.selfName : suppliers[index % suppliers.count]
            return Product(
                id: seed.id, name: seed.name, unit: seed.unit, price: seed.price,
                originalPrice: seed.originalPrice, rating: seed.rating, ratingCount: seed.ratingCount,
                img: seed.img, cat: seed.cat, inStock: stock > 0, stock: stock, distributor: supplier
            )
        }

        func item(_ product: Product, _ qty: Int) -> CartItem {
            CartItem(id: product.id, productId: product.id, name: product.name, unit: product.unit,
                     price: product.price, originalPrice: product.originalPrice, img: product.img,
                     cat: product.cat, qty: qty)
        }
        func order(_ number: Int, at time: Date, status: OrderStatus, driver: String? = nil) -> Order {
            let picks = (0..<(2 + number % 4)).map { item(products[(number * 7 + $0 * 3) % products.count], 1 + ($0 + number) % 3) }
            let subtotal = picks.reduce(0) { $0 + $1.price * Double($1.qty) }
            let fee: Double = subtotal >= 299 ? 0 : 25
            return Order(
                id: "DSH-\(48_213_000 + number)", userId: "demo", items: picks,
                subtotal: subtotal, deliveryFee: fee, discount: 0, grandTotal: subtotal + fee,
                status: status, createdAt: time.timeIntervalSince1970,
                deliveryAddress: DeliveryAddress(street: ["Court Road, Lal Chowk", "KP Road", "Sherbagh", "Janglat Mandi"][number % 4]),
                driverName: driver, otp: "48\(10 + number % 90)"
            )
        }

        let calendar = Calendar.current
        let now = Date()
        let today = calendar.startOfDay(for: now)
        var week: [Order] = []
        var number = 1
        // Earlier days: orders spread from 8 am to 10 pm.
        for (back, count) in [(6, 9), (5, 12), (4, 8), (3, 14), (2, 11), (1, 16)] {
            let day = calendar.date(byAdding: .day, value: -back, to: today) ?? today
            for i in 0..<count {
                let time = day.addingTimeInterval(Double(8 * 3600 + (i * 14 * 3600) / count + (i * 7 % 50) * 60))
                week.append(order(number, at: time, status: i == 3 ? .cancelled : .delivered))
                number += 1
            }
        }
        // Today: the last few hours, newest first in the list.
        let statuses: [(OrderStatus, String?)] = [(.placed, nil), (.placed, nil), (.packing, nil), (.outForDelivery, "Aamir"),
                                                  (.delivered, "Bilal"), (.delivered, "Aamir"), (.delivered, "Bilal"), (.delivered, "Aamir")]
        var todays: [Order] = []
        for (i, entry) in statuses.enumerated() {
            let time = max(today.addingTimeInterval(60), now.addingTimeInterval(-Double(i) * 38 * 60 - 120))
            todays.append(order(number, at: time, status: entry.0, driver: entry.1))
            number += 1
        }
        recentOrders = todays
        weekOrders = todays + week.reversed()
        drivers = []
        offers = Offer.defaults
        storeConfig = StoreConfig.default
        isLoading = false
    }
}
#endif
