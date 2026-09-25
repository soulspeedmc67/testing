import Foundation

public struct Offer: Codable, Identifiable, Hashable {
    public let id: String
    public let code: String
    public let title: String
    public let discountPercent: Int
    public let minOrder: Double
    public let active: Bool

    public init(
        id: String = UUID().uuidString,
        code: String,
        title: String,
        discountPercent: Int = 10,
        minOrder: Double = 199.0,
        active: Bool = true
    ) {
        self.id = id
        self.code = code
        self.title = title
        self.discountPercent = discountPercent
        self.minOrder = minOrder
        self.active = active
    }

    public static let defaults: [Offer] = [
        Offer(id: "off_1", code: "DASHIT50", title: "Flat ₹50 OFF on first order above ₹249", discountPercent: 20, minOrder: 249.0, active: true),
        Offer(id: "off_2", code: "VALLEYFRESH", title: "15% OFF on Fresh Kashmiri Apples & Bakery", discountPercent: 15, minOrder: 199.0, active: true),
        Offer(id: "off_3", code: "NIGHTDELIVERY", title: "Free Priority Delivery on Late Night Snacks", discountPercent: 10, minOrder: 299.0, active: true),
        Offer(id: "off_4", code: "SUPERSTAPLES", title: "₹100 OFF on Monthly Staples above ₹999", discountPercent: 10, minOrder: 999.0, active: false)
    ]
}
