import Foundation
import FirebaseFirestore

/// Generic Firestore real-time listener and data client
final class FirestoreService {
    static let shared = FirestoreService()
    private let db = Firestore.firestore()

    private init() {}

    // MARK: - Products & Categories

    /// Live catalogue, as the web reads it: active products only, with the
    /// document id standing in when a product has no id field.
    func listenProducts(completion: @escaping ([Product]) -> Void) -> ListenerRegistration {
        return db.collection("products").addSnapshotListener { snapshot, error in
            guard let documents = snapshot?.documents, error == nil else {
                completion([])
                return
            }

            let decoder = Firestore.Decoder()
            let products: [Product] = documents.compactMap { doc in
                var data = doc.data()
                if (data["active"] as? Bool) == false { return nil }
                if data["id"] == nil { data["id"] = doc.documentID }
                return try? decoder.decode(Product.self, from: data)
            }
            completion(products)
        }
    }

    /// `config/store`, which the admin console writes: open/closed, the reason
    /// shown while closed, and the high-demand flag.
    func listenStoreConfig(completion: @escaping (_ isOpen: Bool, _ closeReason: String, _ highDemand: Bool) -> Void) -> ListenerRegistration {
        return db.collection("config").document("store").addSnapshotListener { snapshot, _ in
            let data = snapshot?.data() ?? [:]
            completion(
                (data["isOpen"] as? Bool) ?? true,
                (data["closeReason"] as? String) ?? "",
                (data["highDemand"] as? Bool) ?? false
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
    func createOrder(_ order: Order, customer: UserProfile, distanceKm: Double?) async throws {
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

    func ensureUserProfile(uid: String, mobile: String, name: String? = nil, email: String? = nil) async throws -> UserProfile {
        let docRef = db.collection("users").document(uid)
        let snapshot = try await docRef.getDocument()

        var data = snapshot.data() ?? [:]
        if data["id"] == nil { data["id"] = uid }
        if snapshot.exists, var profile = try? Firestore.Decoder().decode(UserProfile.self, from: data) {
            var patch: [String: Any] = ["lastLoginAt": FieldValue.serverTimestamp()]
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
        if let name, !name.isEmpty { fields["name"] = name }
        if let email, !email.isEmpty { fields["email"] = email }
        try await docRef.setData(fields, merge: true)
        return UserProfile(id: uid, mobile: mobile, name: name, email: email)
    }

    func updateUserMobile(uid: String, mobile: String) async throws {
        try await db.collection("users").document(uid).setData(
            ["mobile": mobile, "updatedAt": FieldValue.serverTimestamp()],
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
