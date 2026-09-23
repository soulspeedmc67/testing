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
    val createdAt: Double? = null
)
