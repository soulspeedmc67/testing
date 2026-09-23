package com.dashit.app.data.model

data class CartItem(
    val id: String,
    val productId: String,
    val name: String,
    val unit: String,
    val price: Double,
    val originalPrice: Double? = null,
    val img: String,
    val cat: String,
    var qty: Int = 1,
    var maxQuantity: Int? = null
)

data class Coupon(
    val id: String,
    val code: String,
    val title: String,
    val description: String,
    val discount: Double,
    val minOrder: Double,
    val waivesDelivery: Boolean? = false
)

data class CartBillBreakdown(
    val subtotal: Double,
    val deliveryFee: Double,
    val couponDiscount: Double,
    val grandTotal: Double,
    val isMinOrderSatisfied: Boolean,
    val amountNeededForMinOrder: Double,
    val amountNeededForFreeDelivery: Double
) {
    companion object {
        const val MIN_ORDER_VALUE: Double = 299.0
        const val FREE_DELIVERY_THRESHOLD: Double = 199.0
        const val STANDARD_DELIVERY_FEE: Double = 25.0

        fun calculate(items: List<CartItem>, appliedCoupon: Coupon? = null): CartBillBreakdown {
            val subtotal = items.fold(0.0) { acc, item -> acc + (item.price * item.qty) }

            val isCouponValid = appliedCoupon != null && subtotal >= appliedCoupon.minOrder
            val effectiveCoupon = if (isCouponValid) appliedCoupon else null

            val deliveryFee = when {
                subtotal >= FREE_DELIVERY_THRESHOLD || effectiveCoupon?.waivesDelivery == true || effectiveCoupon?.code == "FREEDEL" -> 0.0
                subtotal > 0 -> STANDARD_DELIVERY_FEE
                else -> 0.0
            }

            val discount = if (effectiveCoupon != null) minOf(subtotal, effectiveCoupon.discount) else 0.0
            val grandTotal = maxOf(0.0, subtotal + deliveryFee - discount)

            val isMinOrder = subtotal >= MIN_ORDER_VALUE || subtotal == 0.0
            val neededForMin = maxOf(0.0, MIN_ORDER_VALUE - subtotal)
            val neededForFreeDel = maxOf(0.0, FREE_DELIVERY_THRESHOLD - subtotal)

            return CartBillBreakdown(
                subtotal = subtotal,
                deliveryFee = deliveryFee,
                couponDiscount = discount,
                grandTotal = grandTotal,
                isMinOrderSatisfied = isMinOrder,
                amountNeededForMinOrder = neededForMin,
                amountNeededForFreeDelivery = neededForFreeDel
            )
        }
    }
}
