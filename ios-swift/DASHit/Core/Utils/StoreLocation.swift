import Foundation
import CoreLocation

/// A place the shop has saved to deliver from (Home, Dark store...), kept in
/// `storePresets` on `config/store` next to the active spot (`storeLat`,
/// `storeLng`, `storeLabel`). Same data as the staff console's "Where orders
/// are delivered from" card.
struct StorePreset: Identifiable, Equatable {
    let id: String
    var name: String
    var address: String
    var latitude: Double
    var longitude: Double

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    var fields: [String: Any] {
        ["id": id, "name": name, "address": address, "lat": latitude, "lng": longitude]
    }

    init(id: String = "place-\(Int(Date().timeIntervalSince1970 * 1000))", name: String, address: String, latitude: Double, longitude: Double) {
        self.id = id
        self.name = name
        self.address = address
        self.latitude = latitude
        self.longitude = longitude
    }

    init?(data: [String: Any], index: Int) {
        guard let lat = (data["lat"] as? NSNumber)?.doubleValue,
              let lng = (data["lng"] as? NSNumber)?.doubleValue,
              StoreLocation.isValid(lat: lat, lng: lng) else { return nil }
        id = (data["id"] as? String) ?? "place-\(index)"
        let rawName = ((data["name"] as? String) ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        name = String((rawName.isEmpty ? "Saved place" : rawName).prefix(40))
        address = String(((data["address"] as? String) ?? "").trimmingCharacters(in: .whitespacesAndNewlines).prefix(120))
        latitude = lat
        longitude = lng
    }
}

enum StoreLocation {
    static let maxPresets = 20

    static func isValid(lat: Double, lng: Double) -> Bool {
        lat.isFinite && lng.isFinite && abs(lat) <= 85 && abs(lng) <= 180 && !(lat == 0 && lng == 0)
    }

    /// The saved places on `config/store`.
    static func presets(from data: [String: Any]) -> [StorePreset] {
        let list = (data["storePresets"] as? [[String: Any]]) ?? []
        return Array(list.enumerated().compactMap { StorePreset(data: $0.element, index: $0.offset) }.prefix(maxPresets))
    }

    /// Straight-line kilometres between two spots.
    static func km(_ a: CLLocationCoordinate2D, _ b: CLLocationCoordinate2D) -> Double {
        DeliveryEta.haversineKm(from: a, to: b)
    }
}
