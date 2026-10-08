package com.dashit.app.data.model

import com.dashit.app.data.ShopRules
import com.dashit.app.data.StoreStatus

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
    /** What this coupon takes off a cart of [subtotal], counting a waived delivery fee. */
    fun saving(onSubtotal: Double): Double {
        if (onSubtotal < minOrder) return 0.0
        val waived = if (waivesDelivery == true) StoreStatus.state.value.rules.standardDeliveryFee(onSubtotal) else 0.0
        return minOf(onSubtotal, discount) + waived
    }

    companion object {
        /**
         * The offer codes the shop has switched on in the admin console
         * (Firestore config/coupons), kept current by `Coupons`. Empty until
         * that list arrives and when every code is off: nothing is built in.
         * (GET30, DASHIT50 and FREEDEL used to be hard-coded here, so they
         * worked in the app even after the shop had switched them off.)
         */
        @Volatile
        var catalog: List<Coupon> = emptyList()

        fun find(code: String?): Coupon? = catalog.firstOrNull { it.code.equals(code?.trim(), ignoreCase = true) }

        /** The eligible coupon that saves the most on [subtotal], if any. */
        fun best(forSubtotal: Double): Coupon? =
            catalog.filter { forSubtotal >= it.minOrder }.maxByOrNull { it.saving(forSubtotal) }?.takeIf { it.saving(forSubtotal) > 0 }
    }
}

data class CartBillBreakdown(
    val subtotal: Double,
    val deliveryFee: Double,
    /** On every order, whatever its size ([ShopRules.handlingFee]). */
    val handlingFee: Double,
    /**
     * The shop's extra charge for rain, snow or a rush ([ShopRules.extraCharge]),
     * on top of everything else and not waived by free delivery.
     */
    val extraDeliveryFee: Double = 0.0,
    val couponDiscount: Double,
    val grandTotal: Double,
    val isMinOrderSatisfied: Boolean,
    val amountNeededForMinOrder: Double,
    val amountNeededForFreeDelivery: Double,
    /** Delivery is free because this is one of the shopper's first orders. */
    val isFirstOrdersPromo: Boolean = false
) {
    companion object {
        /**
         * The bill for a cart, by the shop's [rules] (minimum order, delivery fee
         * by order size, handling charge, free first orders): the same sums as
         * the website and the iPhone app. The shop changes the rules on
         * `config/store` and they apply here without a new build.
         *
         * [userOrdersCount] is how many orders the shopper has had; the default
         * leaves the free first orders out. [extraDeliveryFee] is the extra
         * charge the shop has on right now; a placed order being changed passes
         * what it paid.
         */
        fun calculate(
            items: List<CartItem>,
            appliedCoupon: Coupon? = null,
            userOrdersCount: Int = Int.MAX_VALUE,
            rules: ShopRules = StoreStatus.state.value.rules,
            extraDeliveryFee: Double = rules.extraCharge
        ): CartBillBreakdown {
            val subtotal = items.fold(0.0) { acc, item -> acc + (item.price * item.qty) }

            val isCouponValid = appliedCoupon != null && subtotal >= appliedCoupon.minOrder
            val effectiveCoupon = if (isCouponValid) appliedCoupon else null

            val isFirstOrdersPromo = subtotal > 0 && userOrdersCount < rules.freeDeliveryOrders
            val deliveryFee = when {
                effectiveCoupon?.waivesDelivery == true || effectiveCoupon?.code == "FREEDEL" -> 0.0
                isFirstOrdersPromo -> 0.0
                else -> rules.standardDeliveryFee(subtotal)
            }
            val handlingFee = if (subtotal > 0) rules.handlingFee else 0.0
            val extraFee = if (subtotal > 0) extraDeliveryFee else 0.0

            val discount = if (effectiveCoupon != null) minOf(subtotal, effectiveCoupon.discount) else 0.0
            val grandTotal = maxOf(0.0, subtotal + deliveryFee + extraFee + handlingFee - discount)

            // Orders start at the shop's minimum; fees and offers don't count towards it.
            val neededForMin = if (subtotal > 0) maxOf(0.0, rules.minOrderValue - subtotal) else 0.0
            val neededForFreeDel = maxOf(0.0, rules.deliveryLowFrom - subtotal)

            return CartBillBreakdown(
                subtotal = subtotal,
                deliveryFee = deliveryFee,
                handlingFee = handlingFee,
                extraDeliveryFee = extraFee,
                couponDiscount = discount,
                grandTotal = grandTotal,
                isMinOrderSatisfied = neededForMin <= 0,
                amountNeededForMinOrder = neededForMin,
                amountNeededForFreeDelivery = neededForFreeDel,
                isFirstOrdersPromo = isFirstOrdersPromo
            )
        }
    }
}
