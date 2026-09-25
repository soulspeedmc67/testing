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

/// One line of the pack's nutrition panel, e.g. ("Protein", "3.2 g"). Optional in
/// Firestore; the product sheet only shows callouts for products that carry them.
public struct NutritionFact: Codable, Hashable {
    public let label: String
    public let value: String
    
    public init(label: String, value: String) {
        self.label = label
        self.value = value
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
    public let nutrition: [NutritionFact]?
    /// Units on hand, as the admin console maintains it; nil when not tracked.
    public let stock: Int?
    /// Wholesale supplier or partner shopkeeper attributing this inventory stock.
    public let distributor: String?
    
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
        inStock: Bool? = true,
        nutrition: [NutritionFact]? = nil,
        stock: Int? = nil,
        distributor: String? = nil
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
        self.nutrition = nutrition
        self.stock = stock
        self.distributor = distributor
    }
    
    /// Out of stock when the admin marks it so or the stock count hits zero.
    public var isAvailable: Bool { inStock != false && (stock ?? 1) > 0 }
    
    public var discountPercent: Int? {
        guard let original = originalPrice, original > price else { return nil }
        return Int(round(((original - price) / original) * 100))
    }
}

// MARK: - Reading products the admin console wrote

/// Web product documents use `image`/`category`/`mrp` as often as
/// `img`/`cat`/`originalPrice`, store ids as numbers and track `stock`.
extension Product {
    private enum DecodingKeys: String, CodingKey {
        case id, barcode, name, title, unit, weight, price, originalPrice, mrp
        case rating, ratingCount, time, options, badge, img, image, imageUrl
        case cat, category, variants, ageRestricted, minAge, inStock, nutrition, stock
    }
    
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: DecodingKeys.self)
        guard let id = c.flexibleString(.id) ?? c.flexibleString(.barcode),
              let name = c.flexibleString(.name) ?? c.flexibleString(.title),
              let price = c.flexibleDouble(.price) else {
            throw DecodingError.dataCorrupted(
                DecodingError.Context(codingPath: c.codingPath, debugDescription: "Product needs an id, a name and a price")
            )
        }
        self.init(
            id: id,
            name: name,
            unit: c.flexibleString(.unit) ?? c.flexibleString(.weight) ?? "",
            price: price,
            originalPrice: c.flexibleDouble(.originalPrice) ?? c.flexibleDouble(.mrp),
            rating: c.flexibleString(.rating),
            ratingCount: c.flexibleString(.ratingCount),
            time: c.flexibleString(.time) ?? "8 mins",
            options: c.flexibleString(.options),
            badge: c.flexibleString(.badge),
            img: c.flexibleString(.img) ?? c.flexibleString(.image) ?? c.flexibleString(.imageUrl) ?? "",
            cat: c.flexibleString(.cat) ?? c.flexibleString(.category) ?? "Other",
            variants: try? c.decode([ProductVariant].self, forKey: .variants),
            ageRestricted: (try? c.decode(Bool.self, forKey: .ageRestricted)) ?? false,
            minAge: c.flexibleInt(.minAge),
            inStock: try? c.decode(Bool.self, forKey: .inStock),
            nutrition: try? c.decode([NutritionFact].self, forKey: .nutrition),
            stock: c.flexibleInt(.stock)
        )
    }
}
