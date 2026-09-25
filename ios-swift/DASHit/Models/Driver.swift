import Foundation

public struct Driver: Codable, Identifiable, Hashable {
    public let id: String
    public let name: String
    public let phone: String
    public let vehicle: String
    public let status: String // "available", "delivering", "offline"
    public let activeDeliveries: Int
    public let rating: Double

    public init(
        id: String = UUID().uuidString,
        name: String,
        phone: String,
        vehicle: String = "Scooter",
        status: String = "available",
        activeDeliveries: Int = 0,
        rating: Double = 4.9
    ) {
        self.id = id
        self.name = name
        self.phone = phone
        self.vehicle = vehicle
        self.status = status
        self.activeDeliveries = activeDeliveries
        self.rating = rating
    }

    public static let defaults: [Driver] = [
        Driver(id: "drv_1", name: "Zahid Ahmad", phone: "+91 94191 11222", vehicle: "Hero Electric Scooter", status: "available", activeDeliveries: 0, rating: 4.95),
        Driver(id: "drv_2", name: "Bilal Dar", phone: "+91 97972 33444", vehicle: "TVS Jupiter", status: "delivering", activeDeliveries: 1, rating: 4.88),
        Driver(id: "drv_3", name: "Irfan Lone", phone: "+91 99063 55666", vehicle: "Bajaj Chetak EV", status: "available", activeDeliveries: 0, rating: 4.92),
        Driver(id: "drv_4", name: "Umer Farooq", phone: "+91 96224 77888", vehicle: "Honda Activa 6G", status: "offline", activeDeliveries: 0, rating: 4.85)
    ]
}
