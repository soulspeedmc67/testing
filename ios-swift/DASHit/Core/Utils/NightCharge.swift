import Foundation

/// The night delivery charge and the rider's petrol cost, ported from
/// `src/lib/nightCharge.js` (Android: `NightCharge.kt`): keep the three in step.
///
/// After 8 pm India time, or whenever the shop switches it on, delivery is also
/// charged by how far the address is from the store. The settings are on
/// `config/store`, which the staff console and the admin app write.
enum NightCharge {
    static let startHour = 20
    static let endHour = 6
    /// Streets run about 1.25× the straight line (same figure as `DeliveryEta`).
    static let roadFactor = 1.25

    enum Mode: String, CaseIterable, Identifiable {
        /// On during the night hours.
        case auto
        /// On now, whatever the time, until the shop changes it.
        case on
        /// Never.
        case off

        var id: String { rawValue }

        var title: String {
            switch self {
            case .auto: return "Automatic (8 pm to 6 am)"
            case .on: return "On now"
            case .off: return "Off"
            }
        }
    }

    struct Settings: Equatable {
        var mode: Mode = .auto
        /// ₹ for each km from the store. ₹6 is what the round trip costs the
        /// rider in petrol at the default figures below.
        var perKm: Double = 6
        var minFee: Double = 10
        /// ₹ a litre. Anantnag was ₹106 to ₹108 on 5 Oct 2026.
        var petrolPrice: Double = 107
        /// Km a litre for a loaded 110cc scooter in town.
        var mileage: Double = 45

        init() {}

        /// From the `config/store` document; anything missing keeps its default.
        init(data: [String: Any]) {
            if let raw = data["nightChargeMode"] as? String, let saved = Mode(rawValue: raw) {
                mode = saved
            }
            if let value = (data["nightChargePerKm"] as? NSNumber)?.doubleValue, value >= 0 {
                perKm = value
            }
            if let value = (data["nightChargeMin"] as? NSNumber)?.doubleValue, value >= 0 {
                minFee = value
            }
            if let value = (data["petrolPrice"] as? NSNumber)?.doubleValue, value > 0 {
                petrolPrice = value
            }
            if let value = (data["bikeMileage"] as? NSNumber)?.doubleValue, value > 0 {
                mileage = value
            }
        }
    }

    /// Hour of the day in India (UTC+5:30, no daylight saving), whatever zone the phone is in.
    static func istHour(_ date: Date = Date()) -> Int {
        let seconds = Int(date.timeIntervalSince1970) + 330 * 60
        return (seconds / 3600) % 24
    }

    static func isNightHours(_ date: Date = Date()) -> Bool {
        let hour = istHour(date)
        return hour >= startHour || hour < endHour
    }

    /// Whether the charge applies to an order placed at `date`.
    static func isOn(_ settings: Settings, at date: Date = Date()) -> Bool {
        switch settings.mode {
        case .on: return true
        case .off: return false
        case .auto: return isNightHours(date)
        }
    }

    /// Whole rupees for an address `distanceKm` from the store; 0 when the charge doesn't apply.
    static func fee(distanceKm: Double, settings: Settings, at date: Date = Date()) -> Double {
        guard distanceKm > 0, settings.perKm > 0, isOn(settings, at: date) else { return 0 }
        return max(settings.minFee, (distanceKm * settings.perKm).rounded())
    }

    struct FuelCost: Equatable {
        /// The road from the store to the door and back.
        let roundTripKm: Double
        /// Whole rupees of petrol for that trip.
        let rupees: Int
    }

    /// What one delivery costs the rider in petrol; nil when there is no distance.
    static func fuelCost(distanceKm: Double, settings: Settings) -> FuelCost? {
        guard distanceKm > 0, settings.mileage > 0 else { return nil }
        let roundTripKm = distanceKm * roadFactor * 2
        let rupees = Int((roundTripKm / settings.mileage * settings.petrolPrice).rounded())
        return FuelCost(roundTripKm: (roundTripKm * 10).rounded() / 10, rupees: rupees)
    }
}
