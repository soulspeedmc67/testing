package com.dashit.app.data.repository

import com.dashit.app.data.model.Category
import com.dashit.app.data.model.Offer
import com.dashit.app.data.model.Product
import com.dashit.app.data.model.ProductVariant
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

    fun observeProducts(): Flow<List<Product>> = callbackFlow {
        val db = firestore
        if (db == null) {
            trySend(CatalogSeed.products)
            awaitClose { }
            return@callbackFlow
        }

        // The live catalogue comes first, with skeletons while it loads. The
        // built-in catalogue only stands in if Firestore hasn't answered in a
        // few seconds (no network and nothing cached yet) or fails outright.
        var delivered = false
        val fallback = launch {
            delay(5000)
            if (!delivered) trySend(CatalogSeed.products)
        }

        var listener: ListenerRegistration? = null
        try {
            listener = db.collection("products").addSnapshotListener { snapshot, error ->
                if (error != null) {
                    fallback.cancel()
                    if (!delivered) trySend(CatalogSeed.products)
                    return@addSnapshotListener
                }
                // An empty answer is usually an empty offline cache: keep waiting.
                if (snapshot == null || snapshot.isEmpty) return@addSnapshotListener

                val list = snapshot.documents.mapNotNull { doc ->
                    val data = doc.data ?: return@mapNotNull null
                    if (data["active"] == false) return@mapNotNull null

                    val id = (data["id"] as? String) ?: doc.id
                    val name = (data["name"] as? String) ?: (data["title"] as? String) ?: return@mapNotNull null
                    val price = (data["price"] as? Number)?.toDouble() ?: 0.0
                    val originalPrice = (data["originalPrice"] as? Number)?.toDouble() ?: (data["mrp"] as? Number)?.toDouble()
                    val unit = (data["unit"] as? String) ?: (data["weight"] as? String) ?: ""
                    val img = (data["img"] as? String) ?: (data["image"] as? String) ?: ""
                    val cat = (data["cat"] as? String) ?: (data["category"] as? String) ?: "Other"
                    val rating = (data["rating"] as? String) ?: "4.8"
                    val ratingCount = (data["ratingCount"] as? String) ?: "120"
                    val time = (data["time"] as? String) ?: "8 mins"
                    val badge = data["badge"] as? String
                    val options = data["options"] as? String
                    val inStock = (data["inStock"] as? Boolean) ?: true

                    @Suppress("UNCHECKED_CAST")
                    val variantsRaw = data["variants"] as? List<Map<String, Any>>
                    val variants = variantsRaw?.mapNotNull { v ->
                        val vid = v["id"] as? String ?: return@mapNotNull null
                        val vunit = v["unit"] as? String ?: ""
                        val vprice = (v["price"] as? Number)?.toDouble() ?: 0.0
                        val vorig = (v["originalPrice"] as? Number)?.toDouble()
                        ProductVariant(id = vid, unit = vunit, price = vprice, originalPrice = vorig)
                    }

                    Product(
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
                        inStock = inStock
                    )
                }

                if (list.isNotEmpty()) {
                    delivered = true
                    fallback.cancel()
                    trySend(list)
                }
            }
        } catch (_: Exception) {
            fallback.cancel()
            trySend(CatalogSeed.products)
        }

        awaitClose {
            fallback.cancel()
            listener?.remove()
        }
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
                    val name = (data["name"] as? String) ?: return@mapNotNull null
                    val icon = data["icon"] as? String
                    val image = data["image"] as? String
                    val sortOrder = (data["sortOrder"] as? Number)?.toInt() ?: 0
                    val itemCount = (data["itemCount"] as? Number)?.toInt()
                    Category(id = id, name = name, icon = icon, image = image, sortOrder = sortOrder, itemCount = itemCount)
                }

                if (list.isNotEmpty()) {
                    trySend(list)
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
                    val img = (data["img"] as? String) ?: ""

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
