import Foundation

public struct ProductVariant: Codable, Identifiable, Hashable {
    public let id: String
    public let unit: String
    public let price: Double
    public let originalPrice: Double?
    
    public init(id: String, unit: String, price: Double, originalPrice: Double? = nil) {
        self.id = id
        self.unit = unit
        self.price = price
        self.originalPrice = originalPrice
    }
}

public struct Product: Codable, Identifiable, Hashable {
    public let id: String
    public let name: String
    public let unit: String
    public let price: Double
    public let originalPrice: Double?
    public let rating: String?
    public let ratingCount: String?
    public let time: String?
    public let options: String?
    public let badge: String?
    public let img: String
    public let cat: String
    public let variants: [ProductVariant]?
    public let ageRestricted: Bool?
    public let minAge: Int?
    public let inStock: Bool?
    
    public init(
        id: String,
        name: String,
        unit: String,
        price: Double,
        originalPrice: Double? = nil,
        rating: String? = "4.8",
        ratingCount: String? = "120",
        time: String? = "8 mins",
        options: String? = nil,
        badge: String? = nil,
        img: String,
        cat: String,
        variants: [ProductVariant]? = nil,
        ageRestricted: Bool? = false,
        minAge: Int? = nil,
        inStock: Bool? = true
    ) {
        self.id = id
        self.name = name
        self.unit = unit
        self.price = price
        self.originalPrice = originalPrice
        self.rating = rating
        self.ratingCount = ratingCount
        self.time = time
        self.options = options
        self.badge = badge
        self.img = img
        self.cat = cat
        self.variants = variants
        self.ageRestricted = ageRestricted
        self.minAge = minAge
        self.inStock = inStock
    }
    
    public var discountPercent: Int? {
        guard let original = originalPrice, original > price else { return nil }
        return Int(round(((original - price) / original) * 100))
    }
}
