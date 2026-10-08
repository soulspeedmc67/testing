import Foundation
import FirebaseFirestore

/// Generic Firestore real-time listener and data client
final class FirestoreService {
    static let shared = FirestoreService()
    private let db = Firestore.firestore()

    private init() {}

    // MARK: - Products & Categories

    /// Live catalogue, as the web reads it: active products only, with the
    /// document id standing in when a product has no id field. (The catalogue
    /// store then leaves out tobacco and other 18+ items.)
    ///
    /// Read from Firestore as little as possible: every document read is
    /// billed and the free plan allows 50,000 a day, which reading all ~1,300
    /// products on every app open used up within hours. So the app shows the
    /// copy already on the phone (Firestore's own cache, free to read) and
    /// only asks the server for products changed since the newest change it
    /// has seen. Every product write sets `updatedAt`, and removals mark
    /// `active: false`. The whole list is read on the first open and then once
    /// a week, to catch anything missed.
    ///
    /// Decoding runs off the main thread (thousands of documents froze
    /// scrolling there); `completion` is called on the main thread.
    func listenProducts(completion: @escaping ([Product]) -> Void) -> ListenerRegistration {
        #if !ADMIN_APP_TARGET
        // The shop app reads products from the website's catalogue file (see
        // CatalogueFile); firestore.rules keep products to staff. The admin
        // app reads Firestore, below.
        return CatalogueFile(completion: completion)
        #else
        let sync = CatalogueSync()
        let products = db.collection("products")
        let registration = DeferredListener()
        var catalogue: [String: Product] = [:] // by document id; touched on decodeQueue only

        func deliver() {
            let list = catalogue.keys.sorted().compactMap { catalogue[$0] }
            DispatchQueue.main.async {
                guard !registration.isRemoved else { return }
                completion(list)
            }
        }

        /// Applies documents to the catalogue and returns the newest `updatedAt` among them.
        func apply(_ documents: [QueryDocumentSnapshot], removed: [String] = []) -> Date? {
            let decoder = Firestore.Decoder()
            var newest: Date?
            for id in removed { catalogue[id] = nil }
            for doc in documents {
                var data = doc.data()
                if let stamp = (data["updatedAt"] as? Timestamp)?.dateValue() {
                    newest = max(newest ?? stamp, stamp)
                }
                if (data["active"] as? Bool) == false {
                    catalogue[doc.documentID] = nil
                    continue
                }
                if data["id"] == nil { data["id"] = doc.documentID }
                catalogue[doc.documentID] = try? decoder.decode(Product.self, from: data)
            }
            return newest
        }

        func listenToEverything() {
            var hasDelivered = false
            registration.inner = products.addSnapshotListener { snapshot, error in
                guard let snapshot, error == nil else {
                    DispatchQueue.main.async { completion([]) }
                    return
                }
                if hasDelivered && snapshot.documentChanges.isEmpty { return }
                let documents = snapshot.documents
                let fromServer = !snapshot.metadata.isFromCache
                Self.decodeQueue.async {
                    catalogue = [:]
                    let newest = apply(documents)
                    if fromServer {
                        sync.markFullRead(newest: newest, count: catalogue.count)
                    }
                    hasDelivered = true
                    deliver()
                }
            }
        }

        guard sync.canFetchChangesOnly else {
            listenToEverything()
            return registration
        }

        // 1. What this phone already has: free.
        products.getDocuments(source: .cache) { snapshot, _ in
            let cached = snapshot?.documents ?? []
            Self.decodeQueue.async {
                guard !registration.isRemoved else { return }
                _ = apply(cached)
                // The phone's copy went missing (cleared storage): read it all again.
                guard catalogue.count >= sync.minimumExpectedCount else {
                    catalogue = [:]
                    DispatchQueue.main.async {
                        if !registration.isRemoved { listenToEverything() }
                    }
                    return
                }
                deliver()
                // 2. Then only what changed since, live.
                DispatchQueue.main.async {
                    guard !registration.isRemoved else { return }
                    registration.inner = products
                        .whereField("updatedAt", isGreaterThan: Timestamp(date: sync.syncedAt))
                        .addSnapshotListener { snapshot, error in
                            guard let snapshot, error == nil else { return }
                            let changed = snapshot.documentChanges
                            guard !changed.isEmpty else { return }
                            let upserts = changed.filter { $0.type != .removed }.map(\.document)
                            let removals = changed.filter { $0.type == .removed }.map(\.document.documentID)
                            let fromServer = !snapshot.metadata.isFromCache
                            Self.decodeQueue.async {
                                let newest = apply(upserts, removed: removals)
                                if fromServer { sync.markChanges(newest: newest, count: catalogue.count) }
                                deliver()
                            }
                        }
                }
            }
        }
        return registration
        #endif
    }

    private static let decodeQueue = DispatchQueue(label: "dashit.catalogue.decode", qos: .userInitiated)

    /// `config/store`, which the admin console writes: open/closed, the reason
    /// shown while closed, the high-demand flag and the night delivery charge.
    func listenStoreConfig(completion: @escaping (_ isOpen: Bool, _ closeReason: String, _ highDemand: Bool, _ nightCharge: NightCharge.Settings, _ rules: ShopRules) -> Void) -> ListenerRegistration {
        return db.collection("config").document("store").addSnapshotListener { snapshot, _ in
            let data = snapshot?.data() ?? [:]
            completion(
                (data["isOpen"] as? Bool) ?? true,
                (data["closeReason"] as? String) ?? "",
                (data["highDemand"] as? Bool) ?? false,
                NightCharge.Settings(data: data),
                // Minimum order, fees and cash on delivery, as the shop has set them.
                ShopRules(data: data)
            )
        }
    }

    func listenCategories(completion: @escaping ([Category]) -> Void) -> ListenerRegistration {
        return db.collection("categories")
            .order(by: "sortOrder", descending: false)
            .addSnapshotListener { snapshot, error in
                guard let documents = snapshot?.documents, error == nil else {
                    completion([])
                    return
                }

                let decoder = Firestore.Decoder()
                let categories: [Category] = documents.compactMap { doc in
                    var data = doc.data()
                    if data["id"] == nil { data["id"] = doc.documentID }
                    return try? decoder.decode(Category.self, from: data)
                }
                completion(categories)
            }
    }

    func listenOffers(completion: @escaping ([Offer]) -> Void) -> ListenerRegistration {
        return db.collection("offers")
            .whereField("active", isEqualTo: true)
            .addSnapshotListener { snapshot, error in
                guard let documents = snapshot?.documents, error == nil else {
                    completion([])
                    return
                }

                let offers: [Offer] = documents.compactMap { doc in
                    try? doc.data(as: Offer.self)
                }
                completion(offers)
            }
    }

    // MARK: - Orders & Live Tracking

    /// Creates the order in the web app's document shape and waits for the
    /// server to accept it. `firestore.rules` only lets a customer create an
    /// order whose status is "Placed", whose createdAt is the server clock and
    /// whose driverId is null; anything else is rejected, so this mirrors
    /// `createOrder` in `src/lib/db.js` field for field.
    func createOrder(_ order: Order, customer: UserProfile, distanceKm: Double?, payment: PaymentReceipt? = nil) async throws {
        let placedAt = ISO8601DateFormatter().string(from: Date(timeIntervalSince1970: order.createdAt))
        let dateLabel = Date(timeIntervalSince1970: order.createdAt)
            .formatted(.dateTime.day().month(.abbreviated).hour().minute())
        let savings = order.items.reduce(0.0) { sum, item in
            sum + max(0, (item.originalPrice ?? item.price) - item.price) * Double(item.qty)
        } + order.discount
        let address = order.deliveryAddress
        let location: [String: Any] = [
            "address": address.formattedSummary,
            "lat": address.latitude,
            "lng": address.longitude,
            "alias": address.nickname
        ]
        let items: [[String: Any]] = order.items.map { item in
            var line: [String: Any] = [
                "id": item.id,
                "productId": item.productId,
                "name": item.name,
                "unit": item.unit,
                "price": item.price,
                "img": item.img,
                "cat": item.cat,
                "qty": item.qty
            ]
            if let original = item.originalPrice {
                line["originalPrice"] = original
            }
            return line
        }

        var payload: [String: Any] = [
            "orderId": order.id,
            "userId": order.userId,
            "status": "Placed",
            "driverId": NSNull(),
            "driverName": "",
            "statusHistory": [["status": "Placed", "at": placedAt]],
            "createdAt": FieldValue.serverTimestamp(),
            "updatedAt": FieldValue.serverTimestamp(),
            "date": dateLabel,
            "items": items,
            "subtotal": order.subtotal,
            "deliveryFee": order.deliveryFee,
            "handlingFee": CartBillBreakdown.handlingFeeAmount,
            "discount": order.discount,
            "totalAmount": order.grandTotal,
            "total": order.grandTotal,
            "finalTotal": order.grandTotal,
            "savings": savings,
            "paymentMethod": order.paymentMethod,
            "paymentStatus": order.paymentStatus,
            "location": location,
            "etaMinutes": order.etaMinutes ?? 8,
            // A number, as the web writes it; the rider types it back at the door.
            "otp": Int(order.otp ?? "") ?? Int.random(in: 1000...9999),
            "customerName": customer.name ?? "Customer",
            "mobile": customer.mobile,
            "email": customer.email ?? "",
            "platform": "ios"
        ]
        if let distanceKm {
            payload["distanceKm"] = distanceKm
        }
        // The part of deliveryFee that is the night distance charge, for the store's screens.
        if order.nightDeliveryFee > 0 {
            payload["nightDeliveryFee"] = order.nightDeliveryFee
        }
        // The part that is the shop's extra charge (rain, a rush), and its name on the bill.
        if order.extraDeliveryFee > 0 {
            payload["extraDeliveryFee"] = order.extraDeliveryFee
            payload["extraDeliveryLabel"] = ShopRules.extraChargeTitle(order.extraDeliveryLabel)
        }
        // Paid online: what Razorpay confirmed, so the store can match it up.
        if let payment {
            payload["razorpayOrderId"] = payment.razorpayOrderId
            payload["razorpayPaymentId"] = payment.razorpayPaymentId
            if let paise = payment.amountPaidPaise {
                payload["amountPaid"] = Double(paise) / 100
            }
            payload["paidAt"] = FieldValue.serverTimestamp()
        }
        if let couponCode = order.couponCode {
            payload["couponCode"] = couponCode
        }
        if let replaced = order.replacesOrderId {
            payload["replacesOrderId"] = replaced
        }
        if let windowEnd = order.modifyWindowEndsAt {
            payload["modifyWindowEndsAt"] = Timestamp(date: Date(timeIntervalSince1970: windowEnd))
        }

        let ref = db.collection("orders").document(order.id)
        let document = payload
        // Without a timeout an offline write would wait for the network forever.
        try await withThrowingTaskGroup(of: Void.self) { group in
            group.addTask {
                try await ref.setData(document)
            }
            group.addTask {
                try await Task.sleep(for: .seconds(15))
                throw OrderWriteError.timedOut
            }
            _ = try await group.next()
            group.cancelAll()
        }
    }

    func listenOrder(orderId: String, completion: @escaping (Order?) -> Void) -> ListenerRegistration {
        return db.collection("orders").document(orderId).addSnapshotListener { snapshot, error in
            guard let snapshot = snapshot, snapshot.exists, error == nil else {
                completion(nil)
                return
            }
            // .estimate fills the pending server createdAt while the write syncs.
            let order = try? snapshot.data(as: Order.self, with: .estimate)
            completion(order)
        }
    }

    /// The shopper's orders, newest first. Filtered on userId only (what the
    /// rules require) and sorted here, so no composite index is needed.
    func listenUserOrders(userId: String, completion: @escaping ([Order]) -> Void) -> ListenerRegistration {
        return db.collection("orders")
            .whereField("userId", isEqualTo: userId)
            .addSnapshotListener { snapshot, error in
                guard let documents = snapshot?.documents, error == nil else {
                    #if DEBUG
                    if let error { print("❌ [Orders] History listener: \(error.localizedDescription)") }
                    #endif
                    completion([])
                    return
                }
                let orders: [Order] = documents
                    .compactMap { try? $0.data(as: Order.self, with: .estimate) }
                    .sorted { $0.createdAt > $1.createdAt }
                completion(orders)
            }
    }

    /// One read of the shopper's orders, newest first; [] when offline.
    func fetchUserOrders(userId: String) async -> [Order] {
        guard let snapshot = try? await db.collection("orders")
            .whereField("userId", isEqualTo: userId)
            .getDocuments() else { return [] }
        return snapshot.documents
            .compactMap { try? $0.data(as: Order.self, with: .estimate) }
            .sorted { $0.createdAt > $1.createdAt }
    }

    func listenDriverTracking(orderId: String, completion: @escaping (DriverLiveTracking?) -> Void) -> ListenerRegistration {
        // Subcollection: /orders/{orderId}/tracking/live
        return db.collection("orders").document(orderId)
            .collection("tracking").document("live")
            .addSnapshotListener { snapshot, error in
                guard let snapshot = snapshot, snapshot.exists, error == nil else {
                    completion(nil)
                    return
                }
                let tracking = try? snapshot.data(as: DriverLiveTracking.self)
                completion(tracking)
            }
    }

    /// The rules let a customer cancel only a "Placed" order and change only
    /// status, statusHistory, updatedAt and cancelReason.
    func cancelOrder(orderId: String, reason: String = "Customer cancelled") async throws {
        let orderRef = db.collection("orders").document(orderId)
        try await orderRef.updateData([
            "status": "Cancelled",
            "cancelReason": reason,
            "updatedAt": FieldValue.serverTimestamp(),
            "statusHistory": FieldValue.arrayUnion([
                ["status": "Cancelled", "at": ISO8601DateFormatter().string(from: Date())]
            ])
        ])
    }

    // MARK: - User Profile

    /// Loads `users/{uid}`, creating it when missing. Always merges: a profile
    /// made on the web (with its own fields and Timestamps) is filled in, never
    /// replaced.
    /// Cancels without waiting for the server. Firestore applies queued writes
    /// in order, so this lands after any pending create of the same order.
    func withdrawOrder(orderId: String, reason: String) {
        Task {
            try? await cancelOrder(orderId: orderId, reason: reason)
        }
    }

    func ensureUserProfile(
        uid: String,
        mobile: String,
        name: String? = nil,
        email: String? = nil,
        provider: String? = nil,
        installID: String? = nil
    ) async throws -> UserProfile {
        let docRef = db.collection("users").document(uid)
        let snapshot = try await docRef.getDocument()

        var data = snapshot.data() ?? [:]
        if data["id"] == nil { data["id"] = uid }
        if snapshot.exists, var profile = try? Firestore.Decoder().decode(UserProfile.self, from: data) {
            var patch: [String: Any] = ["lastLoginAt": FieldValue.serverTimestamp()]
            Self.addDevice(to: &patch, provider: provider, installID: installID)
            if profile.mobile.isEmpty, !mobile.isEmpty {
                profile.mobile = mobile
                patch["mobile"] = mobile
            }
            if (profile.name ?? "").isEmpty, let name, !name.isEmpty {
                profile.name = name
                patch["name"] = name
            }
            if (profile.email ?? "").isEmpty, let email, !email.isEmpty {
                profile.email = email
                patch["email"] = email
            }
            try await docRef.setData(patch, merge: true)
            return profile
        }

        var fields: [String: Any] = [
            "uid": uid,
            "mobile": mobile,
            "createdAt": FieldValue.serverTimestamp(),
            "lastLoginAt": FieldValue.serverTimestamp()
        ]
        Self.addDevice(to: &fields, provider: provider, installID: installID)
        if let name, !name.isEmpty { fields["name"] = name }
        if let email, !email.isEmpty { fields["email"] = email }
        try await docRef.setData(fields, merge: true)
        return UserProfile(id: uid, mobile: mobile, name: name, email: email)
    }

    /// Notes which phone signed in: a map of random install ids (never a hardware id).
    private static func addDevice(to fields: inout [String: Any], provider: String?, installID: String?) {
        if let provider { fields["provider"] = provider }
        if let installID {
            fields["devices"] = [installID: ["platform": "ios", "lastSeenAt": FieldValue.serverTimestamp()]]
        }
    }

    func updateUserMobile(uid: String, mobile: String) async throws {
        try await db.collection("users").document(uid).setData(
            ["mobile": mobile, "mobileVerified": false, "updatedAt": FieldValue.serverTimestamp()],
            merge: true
        )
    }

    func updateUserName(uid: String, name: String) async throws {
        try await db.collection("users").document(uid).setData(
            ["name": name, "updatedAt": FieldValue.serverTimestamp()],
            merge: true
        )
    }

    func deleteUserData(uid: String) async throws {
        // App Store Guideline 5.1.1(v) compliance
        try await db.collection("users").document(uid).delete()
    }
}

enum OrderWriteError: LocalizedError {
    case timedOut

    var errorDescription: String? {
        "The store did not confirm your order in time."
    }
}

/// When the catalogue was last read in full and the newest product change
/// seen, kept on the phone so an app open only asks for what changed since.
private final class CatalogueSync {
    private static let syncedKey = "dashit_catalogue_synced_at"
    private static let fullKey = "dashit_catalogue_full_at"
    private static let countKey = "dashit_catalogue_count"
    private static let fullReadEvery: TimeInterval = 7 * 24 * 3600

    private let defaults = UserDefaults.standard

    var syncedAt: Date { Date(timeIntervalSince1970: defaults.double(forKey: Self.syncedKey)) }

    var canFetchChangesOnly: Bool {
        let synced = defaults.double(forKey: Self.syncedKey)
        let full = defaults.double(forKey: Self.fullKey)
        return synced > 0 && full > 0 && Date().timeIntervalSince1970 - full < Self.fullReadEvery
    }

    /// Below this many products, the phone's copy is treated as missing.
    var minimumExpectedCount: Int { max(1, Int(Double(defaults.integer(forKey: Self.countKey)) * 0.9)) }

    func markFullRead(newest: Date?, count: Int) {
        // Nothing has ever been edited: start from "now", less a margin for
        // the phone's clock being ahead of the server's.
        let synced = newest ?? Date().addingTimeInterval(-600)
        defaults.set(synced.timeIntervalSince1970, forKey: Self.syncedKey)
        defaults.set(Date().timeIntervalSince1970, forKey: Self.fullKey)
        defaults.set(count, forKey: Self.countKey)
    }

    func markChanges(newest: Date?, count: Int) {
        if let newest, newest.timeIntervalSince1970 > defaults.double(forKey: Self.syncedKey) {
            defaults.set(newest.timeIntervalSince1970, forKey: Self.syncedKey)
        }
        defaults.set(count, forKey: Self.countKey)
    }
}

/// A listener that can be handed back before the real one exists (it starts
/// once the phone's cached copy has loaded).
private final class DeferredListener: NSObject, ListenerRegistration {
    var inner: ListenerRegistration? {
        didSet { if isRemoved { inner?.remove() } }
    }
    private(set) var isRemoved = false

    func remove() {
        isRemoved = true
        inner?.remove()
    }
}

