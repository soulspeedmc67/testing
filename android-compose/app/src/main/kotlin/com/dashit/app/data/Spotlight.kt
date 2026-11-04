package com.dashit.app.data

import com.dashit.app.data.model.Product
import com.dashit.app.data.model.productImageUrl

/**
 * The spotlight: the shop's one special, gold tab in the home screen's
 * category strip, with the owner's groups and items. Stored on
 * `config/spotlight`; the website (`src/lib/spotlight.js`) and the iPhone app
 * (`Spotlight.swift`) read the same fields:
 *
 *     enabled, tabLabel, title, subtitle,
 *     items: [{ id, name, img, price, mrp, unit }]    items on their own, no group needed
 *     sections: [{ id, name, img, items: [same] }]    optional groups, each a photo tile
 *
 * Every item is a real product (`id` is its products/{id}); the copy kept on
 * the item shows until the product file has it.
 */
data class Spotlight(
    val enabled: Boolean = false,
    val tabLabel: String = "Specials",
    val title: String = "Festive Specials",
    val subtitle: String = "",
    /** Items on their own, in no group. */
    val items: List<Item> = emptyList(),
    val sections: List<Section> = emptyList()
) {
    data class Item(val id: String, val name: String, val img: String, val price: Double, val mrp: Double, val unit: String)
    data class Section(val id: String, val name: String, val img: String, val items: List<Item>)
    /** A group as shoppers see it: its items as live shop products. */
    data class ShownSection(val id: String, val name: String, val img: String, val products: List<Product>)

    /** The groups shoppers see: only those with items, each item live from the catalogue when it's there. */
    fun shownSections(byId: Map<String, Product>): List<ShownSection> {
        if (!enabled) return emptyList()
        return sections.mapNotNull { section ->
            val products = resolve(section.items, section.name, byId)
            if (products.isEmpty()) null else ShownSection(section.id, section.name, section.img, products)
        }
    }

    /** The items on their own, as shoppers see them. */
    fun shownItems(byId: Map<String, Product>): List<Product> =
        if (!enabled) emptyList() else resolve(items, tabLabel, byId)

    private fun resolve(list: List<Item>, cat: String, byId: Map<String, Product>): List<Product> =
        list.mapNotNull { item ->
            byId[item.id] ?: if (item.name.isNotBlank() && item.price > 0) Product(
                id = item.id,
                name = item.name,
                unit = item.unit,
                price = item.price,
                originalPrice = item.mrp.takeIf { it > item.price },
                img = item.img,
                cat = cat
            ) else null
        }.filterNot { it.isAgeRestricted }

    companion object {
        /** What `selectedCategory` holds while the spotlight tab is picked. Never a real category name. */
        const val TAB_ID = "__spotlight"

        private fun clean(value: Any?, max: Int): String? =
            (value as? String)?.trim()?.split(Regex("\\s+"))?.joinToString(" ")?.take(max)?.ifBlank { null }

        private fun number(value: Any?): Double = when (value) {
            is Number -> value.toDouble().coerceAtLeast(0.0)
            is String -> value.toDoubleOrNull()?.coerceAtLeast(0.0) ?: 0.0
            else -> 0.0
        }

        /** A list of items as saved: tidy, each once, at most 40. */
        private fun parseItems(value: Any?): List<Item> {
            val seen = HashSet<String>()
            return (value as? List<*>).orEmpty().mapNotNull { rawItem ->
                    val item = rawItem as? Map<*, *> ?: return@mapNotNull null
                    val itemId = when (val v = item["id"]) {
                        is String -> v.takeIf { it.isNotBlank() }
                        is Number -> v.toLong().toString()
                        else -> null
                    } ?: return@mapNotNull null
                    if (!seen.add(itemId)) return@mapNotNull null
                    val price = number(item["price"])
                    val mrp = number(item["mrp"])
                    Item(
                        id = itemId,
                        name = clean(item["name"], 90) ?: "",
                        img = productImageUrl((item["img"] as? String)?.trim() ?: ""),
                        price = price,
                        mrp = if (mrp > price) mrp else 0.0,
                        unit = clean(item["unit"], 24) ?: ""
                    )
                }.take(40)
        }

        fun from(data: Map<String, Any?>): Spotlight {
            val sections = (data["sections"] as? List<*>).orEmpty().take(12).mapNotNull { raw ->
                val s = raw as? Map<*, *> ?: return@mapNotNull null
                val id = (s["id"] as? String)?.takeIf { it.isNotBlank() } ?: return@mapNotNull null
                Section(id, clean(s["name"], 32) ?: "", productImageUrl((s["img"] as? String)?.trim() ?: ""), parseItems(s["items"]))
            }
            return Spotlight(
                enabled = data["enabled"] == true,
                tabLabel = clean(data["tabLabel"], 14) ?: "Specials",
                title = clean(data["title"], 40) ?: "Festive Specials",
                subtitle = clean(data["subtitle"], 80) ?: "",
                items = parseItems(data["items"]),
                sections = sections
            )
        }
    }
}
