import Foundation
import CoreLocation

public enum OrderStatus: String, Codable, CaseIterable {
    case placed = "placed"
    case packing = "packing"
    case outForDelivery = "out_for_delivery"
    case delivered = "delivered"
    case cancelled = "cancelled"
    
    /// Orders are also written by the web admin and driver consoles, which use
    /// free-form labels ("Packed", "On the way"). Map those instead of failing
    /// to decode the whole order.
    public init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = OrderStatus(rawValue: raw) ?? OrderStatus(stage: DeliveryStage(status: raw))
    }
    
    public init(stage: DeliveryStage) {
        switch stage {
        case .placed: self = .placed
        case .packing: self = .packing
        case .onTheWay: self = .outForDelivery
        case .delivered: self = .delivered
        case .cancelled: self = .cancelled
        }
    }
    
    public var stage: DeliveryStage { DeliveryStage(status: rawValue) }
    
    public var title: String {
        switch self {
        case .placed: return "Order Placed"
        case .packing: return "Packing at Store"
        case .outForDelivery: return "Out for Delivery"
        case .delivered: return "Delivered"
        case .cancelled: return "Order Cancelled"
        }
    }
    
    public var progress: Double { stage.progress }
    
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

public struct Order: Identifiable, Hashable {
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

// MARK: - Reading orders written by any client

/// Orders are stored in the web app's shape (`src/lib/db.js` createOrder):
/// `orderId`, `total`, `location`, a server `createdAt` Timestamp and title-case
/// statuses. Older iOS builds wrote `id`, `grandTotal` and `deliveryAddress`.
/// Both decode here, so the tracker works whichever app placed the order.
extension Order: Decodable {
    private enum Keys: String, CodingKey {
        case id, orderId, userId, items
        case subtotal, deliveryFee, discount, grandTotal, total, totalAmount, finalTotal
        case status, createdAt, deliveryAddress, location
        case paymentMethod, paymentStatus
        case driverId, driverName, driverPhone, etaMinutes, tracking
    }
    
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        guard let orderId = c.flexibleString(.orderId) ?? c.flexibleString(.id) else {
            throw DecodingError.keyNotFound(
                Keys.orderId,
                DecodingError.Context(codingPath: c.codingPath, debugDescription: "Order has no orderId or id")
            )
        }
        
        let items = (try? c.decode([CartItem].self, forKey: .items)) ?? []
        let itemTotal = items.reduce(0.0) { $0 + $1.price * Double($1.qty) }
        let subtotal = c.flexibleDouble(.subtotal) ?? itemTotal
        
        let address: DeliveryAddress
        if let saved = try? c.decode(DeliveryAddress.self, forKey: .deliveryAddress) {
            address = saved
        } else if let location = try? c.decode(OrderLocation.self, forKey: .location) {
            address = location.deliveryAddress
        } else {
            address = DeliveryAddress()
        }
        
        let driverName = c.flexibleString(.driverName)
        
        self.init(
            id: orderId,
            userId: c.flexibleString(.userId) ?? "",
            items: items,
            subtotal: subtotal,
            deliveryFee: c.flexibleDouble(.deliveryFee) ?? 0,
            discount: c.flexibleDouble(.discount) ?? 0,
            grandTotal: c.flexibleDouble(.grandTotal)
                ?? c.flexibleDouble(.total)
                ?? c.flexibleDouble(.totalAmount)
                ?? c.flexibleDouble(.finalTotal)
                ?? subtotal,
            status: (try? c.decode(OrderStatus.self, forKey: .status)) ?? .placed,
            createdAt: c.flexibleTimestamp(.createdAt) ?? Date().timeIntervalSince1970,
            deliveryAddress: address,
            paymentMethod: c.flexibleString(.paymentMethod) ?? "Cash on Delivery",
            paymentStatus: c.flexibleString(.paymentStatus) ?? "pending",
            driverId: c.flexibleString(.driverId),
            driverName: (driverName?.isEmpty ?? true) ? nil : driverName,
            driverPhone: c.flexibleString(.driverPhone),
            etaMinutes: c.flexibleInt(.etaMinutes),
            tracking: try? c.decode(DriverLiveTracking.self, forKey: .tracking)
        )
    }
}

/// The web's `location` map on an order: `address`, `lat`, `lng`, plus an alias.
private struct OrderLocation: Decodable {
    let address: String?
    let lat: Double?
    let lng: Double?
    let alias: String?
    let houseNumber: String?
    let landmark: String?
    
    private enum Keys: String, CodingKey {
        case address, lat, lng, latitude, longitude, alias, label, nickname, houseNumber, houseNo, landmark
    }
    
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        address = c.flexibleString(.address)
        lat = c.flexibleDouble(.lat) ?? c.flexibleDouble(.latitude)
        lng = c.flexibleDouble(.lng) ?? c.flexibleDouble(.longitude)
        alias = c.flexibleString(.alias) ?? c.flexibleString(.label) ?? c.flexibleString(.nickname)
        houseNumber = c.flexibleString(.houseNumber) ?? c.flexibleString(.houseNo)
        landmark = c.flexibleString(.landmark)
    }
    
    var deliveryAddress: DeliveryAddress {
        DeliveryAddress(
            nickname: alias ?? "Home",
            street: address ?? "",
            houseNumber: houseNumber,
            landmark: landmark,
            latitude: lat ?? 33.7311,
            longitude: lng ?? 75.1487
        )
    }
}
