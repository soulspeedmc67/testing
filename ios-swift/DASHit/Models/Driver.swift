import Foundation

/// A delivery rider, as the store sees them: one `staff/{uid}` record with
/// role "driver" (the same records the website and the rider app use). The id
/// is the rider's sign-in account, which is what `orders.driverId` must hold
/// for the order to appear in their app.
public struct Driver: Identifiable, Hashable {
    public let id: String
    public let name: String
    public let phone: String
    public let vehicle: String
    /// Turned on by the owner; only approved riders can take orders.
    public let isApproved: Bool
    /// Signed up in the rider app and waiting for the owner.
    public let isWaiting: Bool
    public let photoUrl: String?

    public init(id: String, name: String, phone: String, vehicle: String = "Scooter",
                isApproved: Bool = true, isWaiting: Bool = false, photoUrl: String? = nil) {
        self.id = id
        self.name = name
        self.phone = phone
        self.vehicle = vehicle
        self.isApproved = isApproved
        self.isWaiting = isWaiting
        self.photoUrl = photoUrl
    }

    /// From a `staff/{uid}` document's fields.
    init(id: String, staff data: [String: Any]) {
        let email = data["email"] as? String ?? ""
        let name = (data["name"] as? String) ?? (data["displayName"] as? String) ?? email.components(separatedBy: "@").first
        let active = data["active"] as? Bool ?? true
        let status = (data["status"] as? String ?? "").lowercased()
        self.init(
            id: id,
            name: (name?.isEmpty == false ? name : nil) ?? "Rider",
            phone: data["phone"] as? String ?? "",
            vehicle: data["vehicle"] as? String ?? "Scooter",
            isApproved: active,
            isWaiting: !active && status == "pending",
            photoUrl: (data["photoUrl"] as? String) ?? (data["photo"] as? String)
        )
    }
}
