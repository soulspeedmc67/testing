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
    
    /// Tobacco and other 18+ items, detected the same way as the web
    /// (`src/lib/ageGate.js`): the flag, the category, or a keyword in the name,
    /// since staff and CSV imports can add an item without the flag. The iOS
    /// app never lists these: App Store guideline 1.4.3 doesn't allow selling
    /// tobacco through an app.
    public var isAgeRestricted: Bool {
        if ageRestricted == true || (minAge ?? 0) >= 18 { return true }
        return Self.isAgeRestricted(name: name, cat: cat)
    }

    /// The category and keyword part of the check, for cart and order lines
    /// that only carry a name and category.
    public static func isAgeRestricted(name: String, cat: String) -> Bool {
        let restrictedCategories = ["tobacco", "tobacco & smoking", "smoking"]
        if restrictedCategories.contains(cat.lowercased()) { return true }
        let haystack = "\(cat) \(name)".lowercased()
        return restrictedKeywords.contains { haystack.contains($0) }
    }

    /// One name per aisle: chips and namkeen are filed under Snacks, so the
    /// shop never shows a "Snacks" and a "Chips" category side by side.
    public static func shopCategory(_ raw: String) -> String {
        let key = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        switch key {
        case "chips", "chip", "namkeen", "chips & namkeen", "chips and namkeen", "snack", "snacks & namkeen":
            return "Snacks"
        default:
            return raw.trimmingCharacters(in: .whitespacesAndNewlines)
        }
    }

    private static let restrictedKeywords = [
        "cigarette", "cigar", "tobacco", "bidi", "beedi", "hookah", "shisha", "vape",
        "e-cigarette", "nicotine", "rolling paper", "gutkha", "paan masala", "snuff", "zarda",
        // Brand names: a pack listed as just "Gold Flake Kings" is still tobacco.
        "gold flake", "goldflake", "marlboro", "navy cut", "wills classic", "classic milds",
        "classic ice burst", "classic regular", "benson & hedges", "benson and hedges", "four square", "capstan",
        "davidoff", "dunhill", "red & white", "red and white", "berkeley", "india kings",
        "flake excel", "cigarillo", "khaini", "pan masala", "rajnigandha", "pan bahar",
        "kamla pasand", "vimal pan",
    ]

    public var discountPercent: Int? {
        guard let original = originalPrice, original > price, original > 0, price >= 0 else { return nil }
        return Int(exactly: round(((original - price) / original) * 100))
    }
}

// MARK: - Reading products the admin console wrote

/// Web product documents use `image`/`category`/`mrp` as often as
/// `img`/`cat`/`originalPrice`, store ids as numbers and track `stock`.
extension Product {
    private enum DecodingKeys: String, CodingKey {
        case id, barcode, name, title, unit, weight, price, originalPrice, mrp
        case rating, ratingCount, time, options, badge, img, image, imageUrl
        case cat, category, variants, ageRestricted, minAge, inStock, nutrition, stock, distributor
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
            cat: Self.shopCategory(c.flexibleString(.cat) ?? c.flexibleString(.category) ?? "Other"),
            variants: try? c.decode([ProductVariant].self, forKey: .variants),
            ageRestricted: (try? c.decode(Bool.self, forKey: .ageRestricted)) ?? false,
            minAge: c.flexibleInt(.minAge),
            inStock: try? c.decode(Bool.self, forKey: .inStock),
            nutrition: try? c.decode([NutritionFact].self, forKey: .nutrition),
            stock: c.flexibleInt(.stock),
            distributor: c.flexibleString(.distributor)
        )
    }
}
