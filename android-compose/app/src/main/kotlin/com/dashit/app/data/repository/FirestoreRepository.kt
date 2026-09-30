package com.dashit.app.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentChange
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.Source
import java.util.Date
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
     * The live catalogue, read from Firestore as little as possible. Every
     * document read is billed and the free plan allows 50,000 a day, which
     * reading all ~1,300 products on every app open used up within hours. So
     * the app shows the copy already on the phone (Firestore's own cache, free
     * to read) and only asks the server for products changed since the newest
     * change it has seen. Every product write sets `updatedAt` and removals
     * mark `active: false`. The whole list is read on the first open and then
     * once a week. Same approach as the iPhone app and the website.
     */
    fun observeProducts(): Flow<List<Product>> = callbackFlow {
        val db = firestore
        if (db == null) {
            trySend(CatalogSeed.products)
            awaitClose { }
            return@callbackFlow
        }

        val sync = CatalogueSync(
            FirebaseApp.getInstance().applicationContext.getSharedPreferences("dashit_prefs", Context.MODE_PRIVATE)
        )
        val products = db.collection("products")
        val catalogue = HashMap<String, Product>() // by document id
        var closed = false

        // The built-in catalogue only stands in if Firestore hasn't answered in
        // a few seconds (no network and nothing cached yet) or fails outright.
        var delivered = false
        val fallback = launch {
            delay(5000)
            if (!delivered) trySend(CatalogSeed.products)
        }
        var listener: ListenerRegistration? = null

        fun deliver() {
            val list = catalogue.toSortedMap().values.toList()
            if (list.isEmpty()) return
            delivered = true
            fallback.cancel()
            trySend(list)
        }

        /** Applies documents to the catalogue; returns the newest `updatedAt` among them. */
        fun apply(documents: List<DocumentSnapshot>, removed: List<String> = emptyList()): Long {
            var newest = 0L
            removed.forEach { catalogue.remove(it) }
            documents.forEach { doc ->
                val data = doc.data ?: return@forEach
                (data["updatedAt"] as? Timestamp)?.let { newest = max(newest, it.toDate().time) }
                val product = if (data["active"] == false) null else parseProduct(doc.id, data)
                if (product == null) catalogue.remove(doc.id) else catalogue[doc.id] = product
            }
            return newest
        }

        fun listenToEverything() {
            listener = products.addSnapshotListener { snapshot, error ->
                if (closed) return@addSnapshotListener
                if (error != null) {
                    fallback.cancel()
                    if (!delivered) trySend(CatalogSeed.products)
                    return@addSnapshotListener
                }
                // An empty answer is usually an empty offline cache: keep waiting.
                if (snapshot == null || snapshot.isEmpty) return@addSnapshotListener
                catalogue.clear()
                val newest = apply(snapshot.documents)
                if (!snapshot.metadata.isFromCache) sync.markFullRead(newest, catalogue.size)
                deliver()
            }
        }

        try {
            if (!sync.canFetchChangesOnly) {
                listenToEverything()
            } else {
                // 1. What this phone already has: free.
                products.get(Source.CACHE).addOnCompleteListener { task ->
                    if (closed) return@addOnCompleteListener
                    apply(if (task.isSuccessful) task.result?.documents.orEmpty() else emptyList())
                    // The phone's copy went missing (cleared storage): read it all again.
                    if (catalogue.size < sync.minimumExpectedCount) {
                        catalogue.clear()
                        listenToEverything()
                        return@addOnCompleteListener
                    }
                    deliver()
                    // 2. Then only what changed since, live.
                    listener = products
                        .whereGreaterThan("updatedAt", Timestamp(Date(sync.syncedAt)))
                        .addSnapshotListener { snapshot, error ->
                            if (closed || error != null || snapshot == null) return@addSnapshotListener
                            val changes = snapshot.documentChanges
                            if (changes.isEmpty()) return@addSnapshotListener
                            val newest = apply(
                                changes.filter { it.type != DocumentChange.Type.REMOVED }.map { it.document },
                                changes.filter { it.type == DocumentChange.Type.REMOVED }.map { it.document.id }
                            )
                            if (!snapshot.metadata.isFromCache) sync.markChanges(newest, catalogue.size)
                            deliver()
                        }
                }
            }
        } catch (_: Exception) {
            fallback.cancel()
            trySend(CatalogSeed.products)
        }

        awaitClose {
            closed = true
            fallback.cancel()
            listener?.remove()
        }
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

    fun observeCategories(): Flow<List<Category>> = callbackFlow {
        trySend(CatalogSeed.categories)

        val db = firestore
        if (db == null) {
            awaitClose { }
            return@callbackFlow
        }

        var listener: ListenerRegistration? = null
        try {
            listener = db.collection("categories").addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null || snapshot.isEmpty) {
                    trySend(CatalogSeed.categories)
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
                    trySend(CatalogSeed.categories)
                }
            }
        } catch (_: Exception) {
            trySend(CatalogSeed.categories)
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
private class CatalogueSync(private val prefs: SharedPreferences) {
    val syncedAt: Long get() = prefs.getLong(SYNCED_KEY, 0L)

    val canFetchChangesOnly: Boolean
        get() {
            val full = prefs.getLong(FULL_KEY, 0L)
            return syncedAt > 0 && full > 0 && System.currentTimeMillis() - full < FULL_READ_EVERY_MS
        }

    /** Below this many products, the phone's copy is treated as missing. */
    val minimumExpectedCount: Int get() = maxOf(1, (prefs.getInt(COUNT_KEY, 0) * 0.9).toInt())

    fun markFullRead(newest: Long, count: Int) {
        // Nothing has ever been edited: start from "now", less a margin for
        // the phone's clock being ahead of the server's.
        val synced = if (newest > 0) newest else System.currentTimeMillis() - 10 * 60 * 1000L
        prefs.edit()
            .putLong(SYNCED_KEY, synced)
            .putLong(FULL_KEY, System.currentTimeMillis())
            .putInt(COUNT_KEY, count)
            .apply()
    }

    fun markChanges(newest: Long, count: Int) {
        val editor = prefs.edit().putInt(COUNT_KEY, count)
        if (newest > syncedAt) editor.putLong(SYNCED_KEY, newest)
        editor.apply()
    }

    private companion object {
        const val SYNCED_KEY = "catalogue_synced_at"
        const val FULL_KEY = "catalogue_full_at"
        const val COUNT_KEY = "catalogue_count"
        const val FULL_READ_EVERY_MS = 7L * 24 * 60 * 60 * 1000
    }
}

/**
 * Stock pictures (Unsplash and the like) aren't the product, so they count as
 * no photo, as on the web (`isPlaceholderImage` in src/lib/productPhotoMatch.js).
 */
private fun isStockPhoto(url: String): Boolean {
    val host = runCatching { java.net.URI(url.trim()).host?.lowercase() }.getOrNull() ?: return url.contains("placeholder")
    return listOf("unsplash.com", "picsum.photos", "placeholder.com", "placehold.co", "dummyimage.com")
        .any { host == it || host.endsWith(".$it") }
}
