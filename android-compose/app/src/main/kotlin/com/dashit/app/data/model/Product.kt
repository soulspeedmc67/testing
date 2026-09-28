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

    /**
     * Tobacco and other 18+ items, detected the same way as the web
     * (`src/lib/ageGate.js`): the flag, the category, or a keyword in the name,
     * since staff and CSV imports can add an item without the flag. They are
     * kept out of browsing and only listed in the tobacco section, which Google
     * Play allows in grocery delivery apps with an age check (see `Tobacco`).
     */
    val isAgeRestricted: Boolean
        get() = ageRestricted == true || (minAge ?: 0) >= 18 || isAgeRestricted(name, cat)

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

/** One name per aisle: chips and namkeen are filed under Snacks, as on iOS. */
fun shopCategory(raw: String): String = when (raw.trim().lowercase()) {
    "chips", "chip", "namkeen", "chips & namkeen", "chips and namkeen", "snack", "snacks & namkeen" -> "Snacks"
    else -> raw.trim()
}

/** The category and keyword part of the check, for cart lines that only carry a name and category. */
fun isAgeRestricted(name: String, cat: String): Boolean {
    if (cat.lowercase() in RESTRICTED_CATEGORIES) return true
    val haystack = "$cat $name".lowercase()
    return RESTRICTED_KEYWORDS.any { haystack.contains(it) }
}

private val RESTRICTED_CATEGORIES = setOf("tobacco", "tobacco & smoking", "smoking")

private val RESTRICTED_KEYWORDS = listOf(
    "cigarette", "cigar", "tobacco", "bidi", "beedi", "hookah", "shisha", "vape",
    "e-cigarette", "nicotine", "rolling paper", "gutkha", "paan masala", "snuff", "zarda",
    // Brand names: a pack listed as just "Gold Flake Kings" is still tobacco.
    "gold flake", "goldflake", "marlboro", "navy cut", "wills classic", "classic milds",
    "classic ice burst", "classic regular", "benson & hedges", "benson and hedges", "four square", "capstan",
    "davidoff", "dunhill", "red & white", "red and white", "berkeley", "india kings",
    "flake excel", "cigarillo", "khaini", "pan masala", "rajnigandha", "pan bahar",
    "kamla pasand", "vimal pan"
)
