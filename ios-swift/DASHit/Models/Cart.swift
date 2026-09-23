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
    
    public init(
        id: String,
        productId: String,
        name: String,
        unit: String,
        price: Double,
        originalPrice: Double? = nil,
        img: String,
        cat: String,
        qty: Int = 1
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
