import Foundation

public struct CartItem: Codable, Identifiable, Hashable {
    public let id: String
    public let productId: String
    public let name: String
    public let unit: String
    public var price: Double
    public let originalPrice: Double?
    public let img: String
    public let cat: String
    public var qty: Int
    /// Stock on hand when the line was added; the stepper stops here.
    public var maxQuantity: Int?

    public init(
        id: String,
        productId: String,
        name: String,
        unit: String,
        price: Double,
        originalPrice: Double? = nil,
        img: String,
        cat: String,
        qty: Int = 1,
        maxQuantity: Int? = nil
    ) {
        self.id = id
        self.productId = productId
        self.name = name
        self.unit = unit
        self.price = price
        self.originalPrice = originalPrice
        self.img = img
        self.cat = cat
        self.qty = qty
        self.maxQuantity = maxQuantity
    }
}

/// Cart lines arrive from local storage (this app) and from order documents the
/// web wrote, where ids can be numbers and quantity may be `quantity`.
extension CartItem {
    private enum DecodingKeys: String, CodingKey {
        case id, productId, barcode, name, unit, price, originalPrice, mrp, img, image, cat, category, qty, quantity, maxQuantity
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: DecodingKeys.self)
        let id = c.flexibleString(.id) ?? c.flexibleString(.barcode) ?? UUID().uuidString
        self.init(
            id: id,
            productId: c.flexibleString(.productId) ?? id,
            name: c.flexibleString(.name) ?? "Item",
            unit: c.flexibleString(.unit) ?? "",
            price: c.flexibleDouble(.price) ?? 0,
            originalPrice: c.flexibleDouble(.originalPrice) ?? c.flexibleDouble(.mrp),
            img: c.flexibleString(.img) ?? c.flexibleString(.image) ?? "",
            cat: c.flexibleString(.cat) ?? c.flexibleString(.category) ?? "",
            qty: c.flexibleInt(.qty) ?? c.flexibleInt(.quantity) ?? 1,
            maxQuantity: c.flexibleInt(.maxQuantity)
        )
    }
}

public struct Coupon: Codable, Identifiable, Hashable {
    public let id: String
    public let code: String
    public let title: String
    public let description: String
    public let discount: Double
    public let minOrder: Double
    public let waivesDelivery: Bool?

    public init(
        id: String,
        code: String,
        title: String,
        description: String,
        discount: Double,
        minOrder: Double,
        waivesDelivery: Bool? = false
    ) {
        self.id = id
        self.code = code
        self.title = title
        self.description = description
        self.discount = discount
        self.minOrder = minOrder
        self.waivesDelivery = waivesDelivery
    }
}

extension Coupon {
    /// The store's offer codes, exactly as the web checkout honours them
    /// (`AVAILABLE_COUPONS` in `src/components/CouponsDrawer.jsx`). Any other
    /// code is refused. FREEDEL waives the delivery fee only; it carries no cash
    /// discount, or it would pay out twice.
    static let catalog: [Coupon] = [
        Coupon(
            id: "c-get30",
            code: "GET30",
            title: "₹30 off on orders of ₹199 or more",
            description: "Valid on all grocery and fresh items in Anantnag",
            discount: 30,
            minOrder: 199
        ),
        Coupon(
            id: "c-dashit50",
            code: "DASHIT50",
            title: "Flat ₹50 off on orders above ₹299",
            description: "Launch offer for DASHit customers in Anantnag",
            discount: 50,
            minOrder: 299
        ),
        Coupon(
            id: "c-freedel",
            code: "FREEDEL",
            title: "Free delivery on your order",
            description: "The ₹25 delivery fee is waived",
            discount: 0,
            minOrder: 99,
            waivesDelivery: true
        )
    ]

    static func find(code: String) -> Coupon? {
        let wanted = code.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        return catalog.first { $0.code == wanted }
    }

    /// What this code actually takes off a cart with this subtotal.
    func saving(onSubtotal subtotal: Double) -> Double {
        guard subtotal >= minOrder else { return 0 }
        if waivesDelivery == true {
            return subtotal >= CartBillBreakdown.freeDeliveryThreshold ? 0 : CartBillBreakdown.standardDeliveryFee
        }
        return min(subtotal, discount)
    }

    /// The code that saves the most on this subtotal, if any saves anything.
    static func best(forSubtotal subtotal: Double) -> Coupon? {
        catalog
            .filter { $0.saving(onSubtotal: subtotal) > 0 }
            .max { $0.saving(onSubtotal: subtotal) < $1.saving(onSubtotal: subtotal) }
    }
}

public struct CartBillBreakdown {
    public let subtotal: Double
    public let deliveryFee: Double
    public let couponDiscount: Double
    public let grandTotal: Double
    public let isMinOrderSatisfied: Bool
    public let amountNeededForMinOrder: Double
    public let amountNeededForFreeDelivery: Double

    public static let minOrderValue: Double = 299.0
    public static let freeDeliveryThreshold: Double = 199.0
    public static let standardDeliveryFee: Double = 25.0

    public static func calculate(items: [CartItem], appliedCoupon: Coupon?) -> CartBillBreakdown {
        let subtotal = items.reduce(0.0) { $0 + ($1.price * Double($1.qty)) }

        let isCouponValid = appliedCoupon != nil && subtotal >= (appliedCoupon?.minOrder ?? 0)
        let effectiveCoupon = isCouponValid ? appliedCoupon : nil

        let deliveryFee: Double = {
            if subtotal >= freeDeliveryThreshold || effectiveCoupon?.waivesDelivery == true || effectiveCoupon?.code == "FREEDEL" {
                return 0.0
            }
            return subtotal > 0 ? standardDeliveryFee : 0.0
        }()

        let discount = effectiveCoupon != nil ? min(subtotal, effectiveCoupon!.discount) : 0.0
        let grandTotal = max(0.0, subtotal + deliveryFee - discount)

        let isMinOrder = subtotal >= minOrderValue || subtotal == 0
        let neededForMin = max(0.0, minOrderValue - subtotal)
        let neededForFreeDel = max(0.0, freeDeliveryThreshold - subtotal)

        return CartBillBreakdown(
            subtotal: subtotal,
            deliveryFee: deliveryFee,
            couponDiscount: discount,
            grandTotal: grandTotal,
            isMinOrderSatisfied: isMinOrder,
            amountNeededForMinOrder: neededForMin,
            amountNeededForFreeDelivery: neededForFreeDel
        )
    }
}
