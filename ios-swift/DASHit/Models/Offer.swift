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
        createdAt: Double? = nil
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
    }
}
