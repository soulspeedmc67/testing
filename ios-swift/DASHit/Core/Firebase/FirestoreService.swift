import Foundation
import FirebaseFirestore

/// Generic Firestore real-time listener and data client
final class FirestoreService {
    static let shared = FirestoreService()
    private let db = Firestore.firestore()
    
    private init() {}
    
    // MARK: - Products & Categories
    
    func listenProducts(completion: @escaping ([Product]) -> Void) -> ListenerRegistration {
        return db.collection("products").addSnapshotListener { snapshot, error in
            guard let documents = snapshot?.documents, error == nil else {
                completion([])
                return
            }
            
            let products: [Product] = documents.compactMap { doc in
                try? doc.data(as: Product.self)
            }
            completion(products)
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
                
                let categories: [Category] = documents.compactMap { doc in
                    try? doc.data(as: Category.self)
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
    
    func placeOrder(_ order: Order) async throws -> String {
        let orderRef = db.collection("orders").document(order.id)
        try orderRef.setData(from: order)
        return order.id
    }
    
    func listenOrder(orderId: String, completion: @escaping (Order?) -> Void) -> ListenerRegistration {
        return db.collection("orders").document(orderId).addSnapshotListener { snapshot, error in
            guard let snapshot = snapshot, snapshot.exists, error == nil else {
                completion(nil)
                return
            }
            let order = try? snapshot.data(as: Order.self)
            completion(order)
        }
    }
    
    func listenUserOrders(userId: String, completion: @escaping ([Order]) -> Void) -> ListenerRegistration {
        return db.collection("orders")
            .whereField("userId", isEqualTo: userId)
            .order(by: "createdAt", descending: true)
            .addSnapshotListener { snapshot, error in
                guard let documents = snapshot?.documents, error == nil else {
                    completion([])
                    return
                }
                let orders: [Order] = documents.compactMap { try? $0.data(as: Order.self) }
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
    
    func cancelOrder(orderId: String, reason: String = "Customer cancelled") async throws {
        let orderRef = db.collection("orders").document(orderId)
        try await orderRef.updateData([
            "status": OrderStatus.cancelled.rawValue,
            "cancellationReason": reason,
            "cancelledAt": Date().timeIntervalSince1970
        ])
    }
    
    // MARK: - User Profile
    
    func ensureUserProfile(uid: String, mobile: String, name: String? = nil) async throws -> UserProfile {
        let docRef = db.collection("users").document(uid)
        let snapshot = try await docRef.getDocument()
        
        if snapshot.exists, let profile = try? snapshot.data(as: UserProfile.self) {
            return profile
        }
        
        let newProfile = UserProfile(id: uid, mobile: mobile, name: name)
        try docRef.setData(from: newProfile)
        return newProfile
    }
    
    func deleteUserData(uid: String) async throws {
        // App Store Guideline 5.1.1(v) compliance
        try await db.collection("users").document(uid).delete()
    }
}
