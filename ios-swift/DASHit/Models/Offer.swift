import Foundation

public struct Offer: Codable, Identifiable, Hashable {
    public let id: String
    public let badge: String
    public let title: String
    public let subtitle: String
    public let priceTag: String
    public let category: String
    public let promoCode: String
    public let discountPercent: Int
    public let expiresIn: String
    public let img: String
    public let active: Bool?
    public let createdAt: Double?
    public let minOrder: Double?

    public init(
        id: String,
        badge: String,
        title: String,
        subtitle: String,
        priceTag: String,
        category: String,
        promoCode: String,
        discountPercent: Int,
        expiresIn: String,
        img: String,
        active: Bool? = true,
        createdAt: Double? = nil,
        minOrder: Double? = 199.0
    ) {
        self.id = id
        self.badge = badge
        self.title = title
        self.subtitle = subtitle
        self.priceTag = priceTag
        self.category = category
        self.promoCode = promoCode
        self.discountPercent = discountPercent
        self.expiresIn = expiresIn
        self.img = img
        self.active = active
        self.createdAt = createdAt
        self.minOrder = minOrder
    }

    // Convenience initializer for Admin Discount Coupon creation
    public init(
        id: String = UUID().uuidString,
        code: String,
        title: String,
        discountPercent: Int = 10,
        minOrder: Double = 199.0,
        active: Bool = true
    ) {
        self.id = id
        self.badge = "DISCOUNT"
        self.title = title
        self.subtitle = "Flat \(discountPercent)% OFF on orders above ₹\(Int(minOrder))"
        self.priceTag = "₹\(Int(minOrder)) min"
        self.category = "Deals"
        self.promoCode = code
        self.discountPercent = discountPercent
        self.expiresIn = "Active"
        self.img = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600"
        self.active = active
        self.createdAt = Date().timeIntervalSince1970
        self.minOrder = minOrder
    }

    public var code: String { promoCode }

    public static let defaults: [Offer] = [
        Offer(id: "off_1", code: "DASHIT50", title: "Flat ₹50 OFF on first order above ₹249", discountPercent: 20, minOrder: 249.0, active: true),
        Offer(id: "off_2", code: "VALLEYFRESH", title: "15% OFF on Fresh Kashmiri Apples & Bakery", discountPercent: 15, minOrder: 199.0, active: true),
        Offer(id: "off_3", code: "NIGHTDELIVERY", title: "Free Priority Delivery on Late Night Snacks", discountPercent: 10, minOrder: 299.0, active: true),
        Offer(id: "off_4", code: "SUPERSTAPLES", title: "₹100 OFF on Monthly Staples above ₹999", discountPercent: 10, minOrder: 999.0, active: false)
    ]
}
