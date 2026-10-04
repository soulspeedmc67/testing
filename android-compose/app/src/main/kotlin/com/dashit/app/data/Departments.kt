package com.dashit.app.data

import com.dashit.app.data.model.CategoryTile

/**
 * The few departments the shop's categories sit under, same as the website
 * (GROUPS in src/lib/shopAisles.js): a shopper picks one of five, then one of
 * the handful of categories inside it. A category not named here goes under
 * the last one.
 */
data class Department(val id: String, val name: String, val tiles: List<CategoryTile>)

object Departments {
    private val groups = listOf(
        Triple("fresh", "Fresh & daily", setOf("dairy", "bakery", "fruits", "vegetables", "chicken", "chicken & fish", "meat & fish")),
        Triple("snacks", "Snacks & drinks", setOf("snacks", "chips", "biscuits", "beverages", "sweets & chocolates", "ice cream")),
        Triple("cooking", "Cooking & pantry", setOf("staples", "spices", "sauces & spreads", "instant food", "dry fruits")),
        Triple("care", "Personal & baby care", setOf("personal care", "baby care", "health & wellness")),
        Triple("home", "Home & more", emptySet())
    )

    /** The everyday categories the home screen leads with. */
    private val everyday = listOf("dairy", "bakery", "snacks", "biscuits", "beverages", "staples", "instant food")

    fun of(tiles: List<CategoryTile>): List<Department> {
        val last = groups.last().first
        val byGroup = tiles.groupBy { tile ->
            val key = tile.name.trim().lowercase()
            groups.firstOrNull { key in it.third }?.first ?: last
        }
        return groups.mapNotNull { (id, name, _) ->
            byGroup[id]?.takeIf { it.isNotEmpty() }?.let { Department(id, name, it) }
        }
    }

    /** Whether a category is one of the few the home screen shows. */
    fun isEveryday(categoryName: String): Boolean = categoryName.trim().lowercase() in everyday
}
