import Foundation
import CoreLocation

public enum OrderStatus: String, Codable, CaseIterable {
    case placed = "placed"
    case packing = "packing"
    case outForDelivery = "out_for_delivery"
    case delivered = "delivered"
    case cancelled = "cancelled"
    
    public var title: String {
        switch self {
        case .placed: return "Order Placed"
        case .packing: return "Packing at Store"
        case .outForDelivery: return "Out for Delivery"
        case .delivered: return "Delivered"
        case .cancelled: return "Order Cancelled"
        }
    }
    
    public var progress: Double {
        switch self {
        case .placed: return 0.25
        case .packing: return 0.50
        case .outForDelivery: return 0.80
        case .delivered: return 1.0
        case .cancelled: return 0.0
        }
    }
    
    public var iconName: String {
        switch self {
        case .placed: return "checkmark.circle.fill"
        case .packing: return "shippingbox.fill"
        case .outForDelivery: return "scooter"
        case .delivered: return "house.fill"
        case .cancelled: return "xmark.circle.fill"
        }
    }
}

public struct DriverLiveTracking: Codable, Hashable {
    public let lat: Double
    public let lng: Double
    public let heading: Double?
    public let speed: Double?
    public let updatedAt: Double?
    
    public var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: lat, longitude: lng)
    }
}

public struct Order: Codable, Identifiable, Hashable {
    public let id: String
    public let userId: String
    public let items: [CartItem]
    public let subtotal: Double
    public let deliveryFee: Double
    public let discount: Double
    public let grandTotal: Double
    public var status: OrderStatus
    public let createdAt: Double
    public let deliveryAddress: DeliveryAddress
    public let paymentMethod: String // "cod", "apple_pay"
    public let paymentStatus: String // "pending", "completed"
    public var driverId: String?
    public var driverName: String?
    public var driverPhone: String?
    public var etaMinutes: Int?
    public var tracking: DriverLiveTracking?
    
    public init(
        id: String,
        userId: String,
        items: [CartItem],
        subtotal: Double,
        deliveryFee: Double,
        discount: Double,
        grandTotal: Double,
        status: OrderStatus = .placed,
        createdAt: Double = Date().timeIntervalSince1970,
        deliveryAddress: DeliveryAddress,
        paymentMethod: String = "cod",
        paymentStatus: String = "pending",
        driverId: String? = nil,
        driverName: String? = nil,
        driverPhone: String? = nil,
        etaMinutes: Int? = 8,
        tracking: DriverLiveTracking? = nil
    ) {
        self.id = id
        self.userId = userId
        self.items = items
        self.subtotal = subtotal
        self.deliveryFee = deliveryFee
        self.discount = discount
        self.grandTotal = grandTotal
        self.status = status
        self.createdAt = createdAt
        self.deliveryAddress = deliveryAddress
        self.paymentMethod = paymentMethod
        self.paymentStatus = paymentStatus
        self.driverId = driverId
        self.driverName = driverName
        self.driverPhone = driverPhone
        self.etaMinutes = etaMinutes
        self.tracking = tracking
    }
}
