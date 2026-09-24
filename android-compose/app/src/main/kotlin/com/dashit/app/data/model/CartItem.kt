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
) {
    /** What this coupon takes off a cart of [subtotal], counting a waived ₹25 fee. */
    fun saving(onSubtotal: Double): Double {
        if (onSubtotal < minOrder) return 0.0
        val waived = if (waivesDelivery == true && onSubtotal < CartBillBreakdown.FREE_DELIVERY_THRESHOLD) {
            CartBillBreakdown.STANDARD_DELIVERY_FEE
        } else 0.0
        return minOf(onSubtotal, discount) + waived
    }

    companion object {
        /** The web's coupon drawer (`src/components/CouponsDrawer.jsx`), so a code works everywhere. */
        val catalog = listOf(
            Coupon("get30", "GET30", "₹30 off on orders of ₹199 or more", "Valid on all grocery and fresh items in Anantnag", 30.0, 199.0),
            Coupon("dashit50", "DASHIT50", "Flat ₹50 off on orders above ₹299", "Launch offer for DASHit customers in Anantnag", 50.0, 299.0),
            Coupon("freedel", "FREEDEL", "Free delivery on your order", "The ₹25 delivery fee is waived", 0.0, 99.0, waivesDelivery = true)
        )

        fun find(code: String?): Coupon? = catalog.firstOrNull { it.code.equals(code?.trim(), ignoreCase = true) }

        /** The eligible coupon that saves the most on [subtotal], if any. */
        fun best(forSubtotal: Double): Coupon? =
            catalog.filter { forSubtotal >= it.minOrder }.maxByOrNull { it.saving(forSubtotal) }?.takeIf { it.saving(forSubtotal) > 0 }
    }
}

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
        const val MIN_ORDER_VALUE: Double = 0.0
        const val FREE_DELIVERY_THRESHOLD: Double = 299.0
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

            val isMinOrder = true
            val neededForMin = 0.0
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
