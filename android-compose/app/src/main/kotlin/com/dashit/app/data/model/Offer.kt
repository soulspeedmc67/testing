package com.dashit.app.data.model

data class Offer(
    val id: String,
    val badge: String,
    val title: String,
    val subtitle: String,
    val priceTag: String,
    val category: String,
    val promoCode: String,
    val discountPercent: Int,
    val expiresIn: String,
    val img: String,
    val active: Boolean? = true,
    val createdAt: Double? = null,
    /** Epoch milliseconds; 0 means no start / no end (the shop's sales can be scheduled). */
    val startsAt: Long = 0,
    val endsAt: Long = 0
) {
    /** On screen at [now]: switched on, started and not over. Same rule as the website's `isSaleLive`. */
    fun isLive(now: Long = System.currentTimeMillis()): Boolean =
        active != false && (startsAt == 0L || now >= startsAt) && (endsAt == 0L || now < endsAt)
}
