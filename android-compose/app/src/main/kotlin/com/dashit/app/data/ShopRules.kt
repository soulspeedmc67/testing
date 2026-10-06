package com.dashit.app.data

import com.google.firebase.firestore.DocumentSnapshot

/**
 * The shop's order rules: the minimum order, the delivery fee by order size,
 * the handling charge, the free first orders and cash on delivery.
 *
 * The shop changes them from the staff console or the iOS admin. They are saved
 * on `config/store`, which every shop app already listens to ([StoreStatus]),
 * so a change reaches customers at once with no new build. Ported from
 * `src/lib/deliveryCharges.js` (iOS: `ShopRules.swift`): keep the three in
 * step. The values below apply until the settings arrive, and for any field
 * the shop hasn't set. Each property is also the field's name on `config/store`.
 */
data class ShopRules(
    /** The smallest items total we deliver. Fees and offers don't count towards it. */
    val minOrderValue: Double = 100.0,
    /** On every order, whatever its size. */
    val handlingFee: Double = 11.0,
    /** Orders under this pay [deliverySmallPercent] of the items total. */
    val deliverySmallBelow: Double = 180.0,
    val deliverySmallPercent: Double = 40.0,
    /** From [deliverySmallBelow] up to [deliveryLowFrom]. */
    val deliveryMidFee: Double = 35.0,
    /** From here up the fee is at its lowest. */
    val deliveryLowFrom: Double = 300.0,
    val deliveryLowFee: Double = 25.0,
    /** A customer's first orders are delivered free. 0 ends the offer. */
    val freeDeliveryOrders: Int = 5,
    /** Cash on delivery, and whether it is also taken from 8 pm to 6 am. */
    val codEnabled: Boolean = true,
    val codAtNight: Boolean = false
) {
    /** What an order with this items total pays for delivery with no offer and no code. */
    fun standardDeliveryFee(subtotal: Double): Double = when {
        subtotal <= 0 -> 0.0
        subtotal < deliverySmallBelow -> Math.round(subtotal * deliverySmallPercent / 100).toDouble()
        subtotal < deliveryLowFrom -> deliveryMidFee
        else -> deliveryLowFee
    }

    /** Whether cash on delivery can be chosen for an order placed at [nowMillis]. */
    fun allowsCash(nowMillis: Long): Boolean =
        codEnabled && (codAtNight || !NightCharge.isNightHours(nowMillis))

    /** Why cash on delivery can't be chosen at [nowMillis]; null when it can. */
    fun cashUnavailableNote(nowMillis: Long): String? = when {
        !codEnabled -> "Not available right now. Please pay online."
        !codAtNight && NightCharge.isNightHours(nowMillis) -> "Not available after 8 pm. Please pay online."
        else -> null
    }

    companion object {
        /** From the `config/store` document; anything missing keeps its default. */
        fun from(snapshot: DocumentSnapshot): ShopRules {
            val d = ShopRules()
            fun amount(key: String, fallback: Double): Double =
                (snapshot.get(key) as? Number)?.toDouble()?.takeIf { it >= 0 } ?: fallback
            return ShopRules(
                minOrderValue = amount("minOrderValue", d.minOrderValue),
                handlingFee = amount("handlingFee", d.handlingFee),
                deliverySmallBelow = amount("deliverySmallBelow", d.deliverySmallBelow),
                deliverySmallPercent = minOf(100.0, amount("deliverySmallPercent", d.deliverySmallPercent)),
                deliveryMidFee = amount("deliveryMidFee", d.deliveryMidFee),
                deliveryLowFrom = amount("deliveryLowFrom", d.deliveryLowFrom),
                deliveryLowFee = amount("deliveryLowFee", d.deliveryLowFee),
                freeDeliveryOrders = amount("freeDeliveryOrders", d.freeDeliveryOrders.toDouble()).toInt(),
                codEnabled = snapshot.get("codEnabled") as? Boolean ?: d.codEnabled,
                codAtNight = snapshot.get("codAtNight") as? Boolean ?: d.codAtNight
            )
        }

        /** "35" for 35.0, "12.5" for 12.5: amounts as the shop typed them. */
        fun whole(value: Double): String =
            if (value == Math.floor(value)) value.toLong().toString() else value.toString()
    }
}
