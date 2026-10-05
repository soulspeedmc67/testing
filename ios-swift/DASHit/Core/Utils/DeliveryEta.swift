import Foundation
import CoreLocation

/// Delivery ETA and serviceability, ported from `src/lib/deliveryEta.js` so the
/// iOS app promises the same times and the same 8 km area as web and Android.
enum DeliveryEta {
    /// Anantnag Central Dark Store Hub.
    static let hub = CLLocationCoordinate2D(latitude: 33.748413, longitude: 75.150839)
    static let hubName = "DASHit Express Hub · Anantnag"
    static let maxRadiusKm = 8.0

    struct Quote: Equatable {
        let etaMinutes: Int?
        /// Straight line from the store: the distance the 8 km area is measured by.
        let distanceKm: Double
        let isDeliverable: Bool

        var distanceText: String {
            "\(shortDistanceText) away"
        }

        var shortDistanceText: String {
            distanceKm < 1 ? "\(Int((distanceKm * 1000).rounded())) m" : String(format: "%.1f km", distanceKm)
        }
    }

    static func haversineKm(from a: CLLocationCoordinate2D, to b: CLLocationCoordinate2D) -> Double {
        let radius = 6371.0
        let dLat = (b.latitude - a.latitude) * .pi / 180
        let dLon = (b.longitude - a.longitude) * .pi / 180
        let h = sin(dLat / 2) * sin(dLat / 2)
            + cos(a.latitude * .pi / 180) * cos(b.latitude * .pi / 180) * sin(dLon / 2) * sin(dLon / 2)
        return radius * 2 * atan2(sqrt(h), sqrt(1 - h))
    }

    /// Hub → customer: 3 min packing + ride at ~18 km/h on roads 1.25× the
    /// straight line + 3 min buffer, never under 8 minutes.
    static func quote(for destination: CLLocationCoordinate2D) -> Quote {
        let straightKm = haversineKm(from: hub, to: destination)
        // Shown and saved as measured (straight line), so the shopper, the order and
        // the staff console agree on which side of 8 km it is. The 1.25× road
        // figure only sets the time.
        let distanceKm = (straightKm * 10).rounded() / 10
        let roadKm = max(0.4, straightKm * 1.25)
        let ridingMinutes = roadKm / 18 * 60
        let total = max(8, Int((3 + ridingMinutes + 3).rounded()))
        return Quote(etaMinutes: total, distanceKm: distanceKm, isDeliverable: distanceKm <= maxRadiusKm)
    }
}
