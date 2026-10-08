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

    public var quantity: Int {
        get { qty }
        set { qty = newValue }
    }

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
    public let condition: String?
    public let active: Bool?

    public init(
        id: String,
        code: String,
        title: String,
        description: String,
        discount: Double,
        minOrder: Double,
        waivesDelivery: Bool? = false,
        condition: String? = nil,
        active: Bool? = true
    ) {
        self.id = id
        self.code = code
        self.title = title
        self.description = description
        self.discount = discount
        self.minOrder = minOrder
        self.waivesDelivery = waivesDelivery
        self.condition = condition
        self.active = active
    }
}

extension Coupon {
    /// Dynamically fetched coupons from Firestore `config/coupons`, if loaded.
    public static var dynamicCatalog: [Coupon]? = nil

    /// The offer codes shoppers can use: exactly the ones the shop has
    /// switched on in the admin (Firestore config/coupons). Until that list
    /// has arrived, and when every code in it is off, there are none. It used
    /// to fall back to the built-in three, so switching every code off in the
    /// admin left ₹30 off, ₹50 off and free delivery usable in the app.
    /// (The admin app still starts from the built-in set.)
    public static var catalog: [Coupon] {
        #if ADMIN_APP_TARGET
        return dynamicCatalog ?? defaultCatalog
        #else
        return dynamicCatalog ?? []
        #endif
    }

    /// The store's default offer codes, matching web DEFAULT_COUPONS.
    public static let defaultCatalog: [Coupon] = [
        Coupon(
            id: "c-get30",
            code: "GET30",
            title: "Up to ₹30 Off on orders of ₹199 or more",
            description: "Valid on all grocery and fresh items in Anantnag",
            discount: 30,
            minOrder: 199,
            waivesDelivery: false,
            condition: "Add non discounted item(s) to unlock",
            active: true
        ),
        Coupon(
            id: "c-dashit50",
            code: "DASHIT50",
            title: "Flat ₹50 off on orders above ₹299",
            description: "Special launch discount for Anantnag Dashit customers",
            discount: 50,
            minOrder: 299,
            waivesDelivery: false,
            condition: "Cart value must be ₹299+",
            active: true
        ),
        Coupon(
            id: "c-freedel",
            code: "FREEDEL",
            title: "100% Free Delivery on your order",
            description: "Zero delivery fee applied",
            discount: 0,
            minOrder: 99,
            waivesDelivery: true,
            condition: "No minimum required",
            active: true
        )
    ]

    static func find(code: String) -> Coupon? {
        let wanted = code.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard let coupon = catalog.first(where: { $0.code == wanted }) else { return nil }
        return (coupon.active ?? true) ? coupon : nil
    }

    /// What this code actually takes off a cart with this subtotal.
    func saving(onSubtotal subtotal: Double) -> Double {
        guard (active ?? true) && subtotal >= minOrder else { return 0 }
        if waivesDelivery == true || code == "FREEDEL" {
            guard subtotal < CartBillBreakdown.freeDeliveryThreshold else { return 0 }
            // The delivery fee this order would otherwise pay.
            return ShopRules.current.standardDeliveryFee(forSubtotal: subtotal)
        }
        return min(subtotal, discount)
    }


    /// The code that saves the most on this subtotal, if any saves anything.
    static func best(forSubtotal subtotal: Double) -> Coupon? {
        catalog
            .filter { ($0.active ?? true) && $0.saving(onSubtotal: subtotal) > 0 }
            .max { $0.saving(onSubtotal: subtotal) < $1.saving(onSubtotal: subtotal) }
    }
}

public struct CartBillBreakdown {
    public let subtotal: Double
    public let deliveryFee: Double
    public let standardDeliveryFee: Double
    /// Charged by distance after 8 pm (`NightCharge`), on top of `deliveryFee`
    /// and not waived with it: it pays for the rider's petrol.
    public let nightDeliveryFee: Double
    /// The shop's extra charge for rain, snow or a rush (`ShopRules.extraCharge`),
    /// on top of everything else and not waived by free delivery.
    public let extraDeliveryFee: Double
    public let handlingFee: Double
    public let couponDiscount: Double
    public let grandTotal: Double
    public let isMinOrderSatisfied: Bool
    public let amountNeededForMinOrder: Double
    public let amountNeededForFreeDelivery: Double
    public let isFirstFivePromo: Bool
    public let tierLabel: String

    // The shop sets these (`ShopRules`, on `config/store`); they change
    // without a new build.
    public static var minOrderValue: Double { ShopRules.current.minOrderValue }
    /// From this items total up, the delivery fee is at its lowest.
    public static var freeDeliveryThreshold: Double { ShopRules.current.deliveryLowFrom }
    public static var handlingFeeAmount: Double { ShopRules.current.handlingFee }
    /// The lowest delivery fee, shown in help text; per-order `standardDeliveryFee`
    /// on each `CartBillBreakdown` instance holds the exact amount for its size.
    public static var standardDeliveryFee: Double { ShopRules.current.deliveryLowFee }

    /// `extraDeliveryFee` is nil for a cart, which pays the extra charge the
    /// shop has on right now. A placed order being changed passes what it paid.
    public static func calculate(items: [CartItem], appliedCoupon: Coupon?, userOrdersCount: Int = 0, nightDeliveryFee: Double = 0, extraDeliveryFee: Double? = nil) -> CartBillBreakdown {
        let rules = ShopRules.current
        let subtotal = items.reduce(0.0) { $0 + ($1.price * Double($1.qty)) }
        guard subtotal > 0 else {
            return CartBillBreakdown(
                subtotal: 0,
                deliveryFee: 0,
                standardDeliveryFee: 0,
                nightDeliveryFee: 0,
                extraDeliveryFee: 0,
                handlingFee: 0,
                couponDiscount: 0,
                grandTotal: 0,
                isMinOrderSatisfied: true,
                amountNeededForMinOrder: 0,
                amountNeededForFreeDelivery: freeDeliveryThreshold,
                isFirstFivePromo: false,
                tierLabel: ""
            )
        }

        let isCouponValid = appliedCoupon != nil && subtotal >= (appliedCoupon?.minOrder ?? 0)
        let effectiveCoupon = isCouponValid ? appliedCoupon : nil

        let standardFee = rules.standardDeliveryFee(forSubtotal: subtotal)
        let tierLabel = rules.tierLabel(forSubtotal: subtotal)

        // The shopper's first orders are delivered free (`freeDeliveryOrders`).
        let isFirstFive = userOrdersCount < rules.freeDeliveryOrders
        let isWaivedByCoupon = effectiveCoupon?.waivesDelivery == true || effectiveCoupon?.code == "FREEDEL"

        let deliveryFee: Double = (isWaivedByCoupon || isFirstFive) ? 0.0 : standardFee
        let handlingFee = rules.handlingFee
        // Orders start at the shop's minimum; fees and offers don't count towards it.
        let neededForMinOrder = max(0.0, rules.minOrderValue - subtotal)
        let discount = effectiveCoupon != nil ? min(subtotal, effectiveCoupon!.discount) : 0.0
        let extraFee = extraDeliveryFee ?? rules.extraCharge
        let grandTotal = max(0.0, subtotal + deliveryFee + nightDeliveryFee + extraFee + handlingFee - discount)

        return CartBillBreakdown(
            subtotal: subtotal,
            deliveryFee: deliveryFee,
            standardDeliveryFee: standardFee,
            nightDeliveryFee: nightDeliveryFee,
            extraDeliveryFee: extraFee,
            handlingFee: handlingFee,
            couponDiscount: discount,
            grandTotal: grandTotal,
            isMinOrderSatisfied: neededForMinOrder <= 0,
            amountNeededForMinOrder: neededForMinOrder,
            amountNeededForFreeDelivery: isFirstFive ? 0.0 : max(0.0, rules.deliveryLowFrom - subtotal),
            isFirstFivePromo: isFirstFive,
            tierLabel: tierLabel
        )
    }
}
