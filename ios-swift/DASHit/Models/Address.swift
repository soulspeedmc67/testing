import Foundation
import CoreLocation

public struct DeliveryAddress: Codable, Identifiable, Hashable {
    public let id: String
    public var nickname: String // "Home", "Work", "Other"
    public var street: String
    public var houseNumber: String?
    public var landmark: String?
    public var city: String // Default "Anantnag"
    public var pincode: String // Default "192101"
    public var latitude: Double
    public var longitude: Double
    public var receiverName: String?
    public var receiverPhone: String?
    
    public init(
        id: String = UUID().uuidString,
        nickname: String = "Home",
        street: String = "",
        houseNumber: String? = nil,
        landmark: String? = nil,
        city: String = "Anantnag",
        pincode: String = "192101",
        latitude: Double = 33.7311,
        longitude: Double = 75.1487,
        receiverName: String? = nil,
        receiverPhone: String? = nil
    ) {
        self.id = id
        self.nickname = nickname
        self.street = street
        self.houseNumber = houseNumber
        self.landmark = landmark
        self.city = city
        self.pincode = pincode
        self.latitude = latitude
        self.longitude = longitude
        self.receiverName = receiverName
        self.receiverPhone = receiverPhone
    }
    
    public var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
    
    public var formattedSummary: String {
        let parts = [houseNumber, street, landmark, city].compactMap { $0 }.filter { !$0.isEmpty }
        return parts.joined(separator: ", ")
    }
}
