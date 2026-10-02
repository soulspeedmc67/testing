package com.dashit.app.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentChange
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.Source
import java.util.Date
import java.util.concurrent.Executors
import kotlin.math.max
import com.dashit.app.data.model.Category
import com.dashit.app.data.model.Offer
import com.dashit.app.data.model.Product
import com.dashit.app.data.model.ProductVariant
import com.dashit.app.data.model.productImageUrl
import com.dashit.app.data.model.shopCategory
import com.google.firebase.FirebaseApp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow

class FirestoreRepository {
    private val firestore: FirebaseFirestore? by lazy {
        try {
            if (FirebaseApp.getApps(FirebaseApp.getInstance().applicationContext).isNotEmpty()) {
                FirebaseFirestore.getInstance()
            } else null
        } catch (_: Exception) {
            null
        }
    }

    /**
     * The live catalogue, from one file on the website rather than Firestore
     * (see [CatalogueFile] and public/api/catalog/): the copy on the phone at
     * once, then the file if it changed, then what changed since, asked every
     * 30 seconds while the app is on screen. Price and stock edits show up
     * within about a minute, and Firestore isn't read for products at all
     * (firestore.rules keep products to staff).
     */
    fun observeProducts(): Flow<List<Product>> = callbackFlow {
        val context = runCatching { FirebaseApp.getInstance().applicationContext }.getOrNull()
        if (context == null) {
            trySend(CatalogSeed.products)
            awaitClose { }
            return@callbackFlow
        }
        val file = CatalogueFile(context)
        var delivered = false

        fun deliver() {
            val list = file.shown().toSortedMap().mapNotNull { (id, entry) -> parseProduct(id, entry.toPlainMap()) }
            if (list.isEmpty()) return
            delivered = true
            trySend(list)
        }

        val work = launch(kotlinx.coroutines.Dispatchers.IO) {
            // 1. The copy on the phone: at once, no network.
            if (file.loadSaved()) deliver()
            // 2. The file, if it changed (otherwise the website answers "not modified").
            var retry = 0
            while (true) {
                if (file.download() || (!delivered && file.shown().isNotEmpty())) deliver()
                if (delivered) break
                // Nothing on the phone and no file yet: the built-in list stands in
                // after a few seconds, and the file is asked for again.
                if (retry == 1) trySend(CatalogSeed.products)
                delay(minOf(30_000L, 5_000L * (1 shl retry++)))
            }
            // 3. What changed since, while the app is on screen.
            while (true) {
                delay(30_000)
                if (com.dashit.app.data.OrderNotifications.isAppInForeground && file.fetchChanges()) deliver()
            }
        }

        awaitClose { work.cancel() }
    }

    /** One product document as the storefront shows it, or null if it can't be read. */
    private fun parseProduct(docId: String, data: Map<String, Any>): Product? {
        val id = (data["id"] as? String) ?: docId
        val name = (data["name"] as? String) ?: (data["title"] as? String) ?: return null
        val price = (data["price"] as? Number)?.toDouble() ?: 0.0
        val originalPrice = (data["originalPrice"] as? Number)?.toDouble() ?: (data["mrp"] as? Number)?.toDouble()
        val unit = (data["unit"] as? String) ?: (data["weight"] as? String) ?: ""
        val cat = shopCategory((data["cat"] as? String) ?: (data["category"] as? String) ?: "Other")
        val rawImg = (data["img"] as? String) ?: (data["image"] as? String) ?: ""
        // No photo shows the card's plain tile: a guessed photo could be a
        // different product, and shoppers order what they see.
        val img = if (rawImg.isNotBlank() && !isStockPhoto(rawImg)) productImageUrl(rawImg) else ""
        val rating = (data["rating"] as? String) ?: "4.8"
        val ratingCount = (data["ratingCount"] as? String) ?: "120"
        val time = (data["time"] as? String) ?: "8 mins"
        val badge = data["badge"] as? String
        val options = data["options"] as? String
        val inStock = (data["inStock"] as? Boolean) ?: true
        val ageRestricted = (data["ageRestricted"] as? Boolean) ?: false
        val minAge = (data["minAge"] as? Number)?.toInt()

        @Suppress("UNCHECKED_CAST")
        val variantsRaw = data["variants"] as? List<Map<String, Any>>
        val variants = variantsRaw?.mapNotNull { v ->
            val vid = v["id"] as? String ?: return@mapNotNull null
            val vunit = v["unit"] as? String ?: ""
            val vprice = (v["price"] as? Number)?.toDouble() ?: 0.0
            val vorig = (v["originalPrice"] as? Number)?.toDouble()
            ProductVariant(id = vid, unit = vunit, price = vprice, originalPrice = vorig)
        }

        return Product(
            id = id,
            name = name,
            unit = unit,
            price = price,
            originalPrice = originalPrice,
            rating = rating,
            ratingCount = ratingCount,
            time = time,
            options = options,
            badge = badge,
            img = img,
            cat = cat,
            variants = variants,
            ageRestricted = ageRestricted,
            minAge = minAge,
            inStock = inStock
        )
    }

    /** Shelves set in Firestore's `categories`; empty when there are none (the store then makes one per product category). */
    fun observeCategories(): Flow<List<Category>> = callbackFlow {
        trySend(emptyList())

        val db = firestore
        if (db == null) {
            awaitClose { }
            return@callbackFlow
        }

        var listener: ListenerRegistration? = null
        try {
            listener = db.collection("categories").addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null || snapshot.isEmpty) {
                    trySend(emptyList())
                    return@addSnapshotListener
                }

                val list = snapshot.documents.mapNotNull { doc ->
                    val data = doc.data ?: return@mapNotNull null
                    val id = (data["id"] as? String) ?: doc.id
                    val name = (data["name"] as? String)?.let { shopCategory(it) } ?: return@mapNotNull null
                    val icon = data["icon"] as? String
                    val image = data["image"] as? String
                    val sortOrder = (data["sortOrder"] as? Number)?.toInt() ?: 0
                    val itemCount = (data["itemCount"] as? Number)?.toInt()
                    Category(id = id, name = name, icon = icon, image = image, sortOrder = sortOrder, itemCount = itemCount)
                }

                if (list.isNotEmpty()) {
                    // "Chips" and "Snacks" both become Snacks: show it once.
                    trySend(list.distinctBy { it.name.lowercase() })
                } else {
                    trySend(emptyList())
                }
            }
        } catch (_: Exception) {
            trySend(emptyList())
        }

        awaitClose { listener?.remove() }
    }

    fun observeOffers(): Flow<List<Offer>> = callbackFlow {
        trySend(CatalogSeed.offers)

        val db = firestore
        if (db == null) {
            awaitClose { }
            return@callbackFlow
        }

        var listener: ListenerRegistration? = null
        try {
            listener = db.collection("offers").addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null || snapshot.isEmpty) {
                    trySend(CatalogSeed.offers)
                    return@addSnapshotListener
                }

                val list = snapshot.documents.mapNotNull { doc ->
                    val data = doc.data ?: return@mapNotNull null
                    if (data["active"] == false) return@mapNotNull null
                    val id = (data["id"] as? String) ?: doc.id
                    val badge = (data["badge"] as? String) ?: "DASHIT EXCLUSIVE"
                    val title = (data["title"] as? String) ?: return@mapNotNull null
                    val subtitle = (data["subtitle"] as? String) ?: ""
                    val priceTag = (data["priceTag"] as? String) ?: ""
                    val category = (data["category"] as? String) ?: "Snacks"
                    val promoCode = (data["promoCode"] as? String) ?: ""
                    val discountPercent = (data["discountPercent"] as? Number)?.toInt() ?: 0
                    val expiresIn = (data["expiresIn"] as? String) ?: "Valid today"
                    val img = productImageUrl((data["img"] as? String) ?: "")

                    Offer(
                        id = id,
                        badge = badge,
                        title = title,
                        subtitle = subtitle,
                        priceTag = priceTag,
                        category = category,
                        promoCode = promoCode,
                        discountPercent = discountPercent,
                        expiresIn = expiresIn,
                        img = img
                    )
                }

                if (list.isNotEmpty()) {
                    trySend(list)
                } else {
                    trySend(CatalogSeed.offers)
                }
            }
        } catch (_: Exception) {
            trySend(CatalogSeed.offers)
        }

        awaitClose { listener?.remove() }
    }
}

/**
 * When the catalogue was last read in full and the newest product change
 * seen, kept on the phone so an app open only asks for what changed since.
 */
/**
 * Stock pictures (Unsplash and the like) aren't the product, so they count as
 * no photo, as on the web (`isPlaceholderImage` in src/lib/productPhotoMatch.js).
 */
private fun isStockPhoto(url: String): Boolean {
    val host = runCatching { java.net.URI(url.trim()).host?.lowercase() }.getOrNull() ?: return url.contains("placeholder")
    return listOf("unsplash.com", "picsum.photos", "placeholder.com", "placehold.co", "dummyimage.com")
        .any { host == it || host.endsWith(".$it") }
}
