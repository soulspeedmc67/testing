package com.dashit.app.data.model

data class ProductVariant(
    val id: String,
    val unit: String,
    val price: Double,
    val originalPrice: Double? = null
)

data class NutritionFact(
    val label: String,
    val value: String
)

data class Product(
    val id: String,
    val name: String,
    val unit: String,
    val price: Double,
    val originalPrice: Double? = null,
    val rating: String? = "4.8",
    val ratingCount: String? = "120",
    val time: String? = "8 mins",
    val options: String? = null,
    val badge: String? = null,
    val img: String,
    val cat: String,
    val variants: List<ProductVariant>? = null,
    val ageRestricted: Boolean? = false,
    val minAge: Int? = null,
    val inStock: Boolean? = true,
    val nutrition: List<NutritionFact>? = null,
    val stock: Int? = null
) {
    val isAvailable: Boolean
        get() = inStock != false && (stock ?: 1) > 0

    val discountPercent: Int?
        get() {
            val original = originalPrice ?: return null
            if (original <= price) return null
            return Math.round(((original - price) / original) * 100).toInt()
        }

    val displayPrice: String
        get() = "₹${price.toInt()}"

    val displayOriginalPrice: String?
        get() = originalPrice?.let { "₹${it.toInt()}" }
}
