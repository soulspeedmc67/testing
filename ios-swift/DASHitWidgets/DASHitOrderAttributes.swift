import Foundation
import ActivityKit

// Compiled into both the app and the widget extension (see project.yml), so the
// ContentState the app sends is byte-for-byte the one the widget decodes.

public struct DASHitOrderAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var status: String       // OrderStatus raw value, e.g. "out_for_delivery"
        public var etaMinutes: Int      // minutes remaining when the ETA was last set
        public var driverName: String?
        public var progress: Double     // 0.0 to 1.0
        public var estimatedArrival: Date

        public init(
            status: String,
            etaMinutes: Int,
            driverName: String? = nil,
            progress: Double = 0.25,
            estimatedArrival: Date = Date().addingTimeInterval(8 * 60)
        ) {
            self.status = status
            self.etaMinutes = etaMinutes
            self.driverName = driverName
            self.progress = progress
            self.estimatedArrival = estimatedArrival
        }

        public var stage: DeliveryStage { DeliveryStage(status: status) }
    }

    public var orderId: String
    public var itemCount: Int
    public var totalAmount: Double
    public var placedAt: Date
    /// The 4-digit code the rider asks for at the door.
    public var deliveryCode: String?

    public init(orderId: String, itemCount: Int, totalAmount: Double, placedAt: Date = Date(), deliveryCode: String? = nil) {
        self.orderId = orderId
        self.itemCount = itemCount
        self.totalAmount = totalAmount
        self.placedAt = placedAt
        self.deliveryCode = deliveryCode
    }
}

/// The five customer-facing stages of an order, with the copy the web tracker
/// (`src/components/LiveOrderFloatingTracker.jsx`) shows for each.
public enum DeliveryStage: String, Codable, Hashable {
    case placed
    case packing
    case onTheWay
    case delivered
    case cancelled

    /// Normalises whatever status string the admin, driver or iOS app wrote.
    /// "out" / "way" are checked before "deliver" so "out_for_delivery" is not
    /// mistaken for a finished order.
    public init(status: String) {
        let s = status.lowercased()
        if s.contains("cancel") {
            self = .cancelled
        } else if s.contains("out") || s.contains("way") || s.contains("rider") || s.contains("dispatch") || s.contains("transit") {
            self = .onTheWay
        } else if s.contains("deliver") || s.contains("arrived") || s.contains("complete") {
            self = .delivered
        } else if s.contains("pack") || s.contains("bag") || s.contains("ready") {
            self = .packing
        } else {
            self = .placed
        }
    }

    /// Where the rail sits for each stage — the web's ORDER_PROGRESS_FLOOR
    /// (12 / 34 / 58 / 100). While riding, the driver app's distance-based
    /// progress takes over (see `progress(live:)`).
    public var progress: Double {
        switch self {
        case .placed: return 0.12
        case .packing: return 0.34
        case .onTheWay: return 0.58
        case .delivered: return 1.0
        case .cancelled: return 0.0
        }
    }

    /// Stage floor, raised by the rider's live 0–100 progress when on the way;
    /// never runs backwards below the floor.
    public func progress(live: Double?) -> Double {
        guard self == .onTheWay, let live, live > 0 else { return progress }
        return min(0.97, max(progress, live / 100))
    }

    public var isFinished: Bool { self == .delivered || self == .cancelled }

    /// SF Symbol for the marker that rides along the progress rail.
    public var symbol: String {
        switch self {
        case .placed: return "clock.fill"
        case .packing: return "shippingbox.fill"
        case .onTheWay: return "scooter"
        case .delivered: return "checkmark"
        case .cancelled: return "xmark"
        }
    }

    public func headline(riderName: String?) -> String {
        switch self {
        case .placed: return "Order placed"
        case .packing: return "Packing your order"
        case .onTheWay:
            if let name = riderName?.trimmingCharacters(in: .whitespaces), !name.isEmpty {
                return "\(name) is on the way"
            }
            return "On the way to you"
        case .delivered: return "Order delivered"
        case .cancelled: return "Order cancelled"
        }
    }

    public var badgeText: String {
        switch self {
        case .placed, .packing: return "Confirmed"
        case .onTheWay: return "On time"
        case .delivered: return "Arrived"
        case .cancelled: return "Cancelled"
        }
    }

    /// Short stage name for the admin console's order list.
    public var label: String {
        switch self {
        case .placed: return "Placed"
        case .packing: return "Packing"
        case .onTheWay: return "Out for Delivery"
        case .delivered: return "Delivered"
        case .cancelled: return "Cancelled"
        }
    }

    public func subtitle(etaMinutes: Int, itemCount: Int) -> String {
        switch self {
        case .placed:
            return "Hub is picking fresh items"
        case .packing:
            return itemCount > 0 ? "Packing \(itemCount) item\(itemCount == 1 ? "" : "s") at the hub" : "Items are packed & sealed"
        case .onTheWay:
            return etaMinutes <= 1 ? "Arriving now" : "Arriving in \(etaMinutes) mins"
        case .delivered:
            return "Handed over safely"
        case .cancelled:
            return "This order has been cancelled"
        }
    }
}
