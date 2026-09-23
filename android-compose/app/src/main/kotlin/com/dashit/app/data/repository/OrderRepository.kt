package com.dashit.app.data.repository

import com.dashit.app.data.model.CartBillBreakdown
import com.dashit.app.data.model.CartItem
import com.dashit.app.data.model.DeliveryAddress
import com.dashit.app.data.model.DriverLiveTracking
import com.dashit.app.data.model.Order
import com.dashit.app.data.model.OrderStatus
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID

class OrderRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    private val _orders = MutableStateFlow<List<Order>>(createSampleOrders())
    val orders: StateFlow<List<Order>> = _orders.asStateFlow()

    private val scope = CoroutineScope(Dispatchers.IO)

    init {
        listenRemoteOrders()
    }

    private fun listenRemoteOrders() {
        try {
            firestore.collection("orders")
                .limit(20)
                .addSnapshotListener { snapshot, error ->
                    if (error != null || snapshot == null) return@addSnapshotListener
                    val remoteList = snapshot.documents.mapNotNull { doc ->
                        try {
                            val itemsRaw = doc.get("items") as? List<Map<String, Any>> ?: emptyList()
                            val items = itemsRaw.map { m ->
                                CartItem(
                                    id = m["id"] as? String ?: UUID.randomUUID().toString(),
                                    productId = m["productId"] as? String ?: "",
                                    name = m["name"] as? String ?: "Item",
                                    unit = m["unit"] as? String ?: "1 unit",
                                    price = (m["price"] as? Number)?.toDouble() ?: 0.0,
                                    img = m["img"] as? String ?: "",
                                    cat = m["cat"] as? String ?: "General",
                                    qty = (m["qty"] as? Number)?.toInt() ?: 1
                                )
                            }
                            Order(
                                id = doc.id,
                                userId = doc.getString("userId") ?: "user_default",
                                items = items,
                                subtotal = doc.getDouble("subtotal") ?: 0.0,
                                deliveryFee = doc.getDouble("deliveryFee") ?: 0.0,
                                discount = doc.getDouble("discount") ?: 0.0,
                                grandTotal = doc.getDouble("grandTotal") ?: 0.0,
                                status = OrderStatus.fromString(doc.getString("status") ?: "placed"),
                                createdAt = doc.getLong("createdAt") ?: System.currentTimeMillis(),
                                paymentMethod = doc.getString("paymentMethod") ?: "cod",
                                paymentStatus = doc.getString("paymentStatus") ?: "pending",
                                etaMinutes = doc.getLong("etaMinutes")?.toInt() ?: 8
                            )
                        } catch (e: Exception) {
                            null
                        }
                    }
                    if (remoteList.isNotEmpty()) {
                        _orders.value = (remoteList + _orders.value).distinctBy { it.id }
                    }
                }
        } catch (_: Exception) {}
    }

    fun placeOrder(
        items: List<CartItem>,
        bill: CartBillBreakdown,
        address: DeliveryAddress,
        paymentMethod: String = "cod"
    ): Order {
        val newOrder = Order(
            id = "ORD-${UUID.randomUUID().toString().take(6).uppercase()}",
            userId = "user_default",
            items = items,
            subtotal = bill.subtotal,
            deliveryFee = bill.deliveryFee,
            discount = bill.couponDiscount,
            grandTotal = bill.grandTotal,
            status = OrderStatus.PLACED,
            createdAt = System.currentTimeMillis(),
            deliveryAddress = address,
            paymentMethod = paymentMethod,
            paymentStatus = if (paymentMethod == "cod") "pending" else "completed",
            etaMinutes = 8,
            tracking = DriverLiveTracking(
                lat = 33.7311,
                lng = 75.1487,
                etaMinutes = 8,
                distanceFormatted = "1.2 km",
                statusText = "Partner assigned at DASHit dark store",
                progress = 0.15
            )
        )

        // Insert at beginning of orders flow
        _orders.value = listOf(newOrder) + _orders.value

        // Sync to firestore in background
        scope.launch {
            try {
                val orderMap = hashMapOf(
                    "userId" to newOrder.userId,
                    "subtotal" to newOrder.subtotal,
                    "deliveryFee" to newOrder.deliveryFee,
                    "discount" to newOrder.discount,
                    "grandTotal" to newOrder.grandTotal,
                    "status" to newOrder.status.rawValue,
                    "createdAt" to newOrder.createdAt,
                    "paymentMethod" to newOrder.paymentMethod,
                    "paymentStatus" to newOrder.paymentStatus,
                    "etaMinutes" to newOrder.etaMinutes,
                    "items" to newOrder.items.map {
                        mapOf(
                            "id" to it.id,
                            "productId" to it.productId,
                            "name" to it.name,
                            "unit" to it.unit,
                            "price" to it.price,
                            "img" to it.img,
                            "qty" to it.qty
                        )
                    }
                )
                firestore.collection("orders").document(newOrder.id).set(orderMap)
            } catch (_: Exception) {}
        }

        return newOrder
    }

    private fun createSampleOrders(): List<Order> {
        val seed = CatalogSeed.allProducts
        val milk = seed.firstOrNull { it.id == "amul_gold_500" } ?: seed[0]
        val chips = seed.firstOrNull { it.id == "lays_classic_50" } ?: seed[1]
        val bread = seed.firstOrNull { it.id == "harvest_white_bread" } ?: seed[2]

        return listOf(
            Order(
                id = "DASH-9824",
                userId = "user_default",
                items = listOf(
                    CartItem(id = milk.id, productId = milk.id, name = milk.name, unit = milk.unit, price = milk.price, img = milk.img, cat = milk.cat, qty = 2),
                    CartItem(id = bread.id, productId = bread.id, name = bread.name, unit = bread.unit, price = bread.price, img = bread.img, cat = bread.cat, qty = 1)
                ),
                subtotal = (milk.price * 2) + bread.price,
                deliveryFee = 0.0,
                discount = 20.0,
                grandTotal = (milk.price * 2) + bread.price - 20.0,
                status = OrderStatus.DELIVERED,
                createdAt = System.currentTimeMillis() - 86400000L, // Yesterday
                deliveryAddress = DeliveryAddress(),
                paymentMethod = "cod",
                paymentStatus = "completed"
            ),
            Order(
                id = "DASH-7103",
                userId = "user_default",
                items = listOf(
                    CartItem(id = chips.id, productId = chips.id, name = chips.name, unit = chips.unit, price = chips.price, img = chips.img, cat = chips.cat, qty = 3)
                ),
                subtotal = chips.price * 3,
                deliveryFee = 25.0,
                discount = 0.0,
                grandTotal = (chips.price * 3) + 25.0,
                status = OrderStatus.DELIVERED,
                createdAt = System.currentTimeMillis() - (86400000L * 3), // 3 days ago
                deliveryAddress = DeliveryAddress(),
                paymentMethod = "cod",
                paymentStatus = "completed"
            )
        )
    }

    companion object {
        val shared = OrderRepository()
    }
}
