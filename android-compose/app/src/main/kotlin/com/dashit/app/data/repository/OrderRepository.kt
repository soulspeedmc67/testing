package com.dashit.app.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.dashit.app.data.DeliveryEta
import com.dashit.app.data.OrderNotifications
import com.dashit.app.data.auth.AuthRepository
import com.dashit.app.data.model.CartBillBreakdown
import com.dashit.app.data.model.CartItem
import com.dashit.app.data.model.Coupon
import com.dashit.app.data.model.DeliveryAddress
import com.dashit.app.data.model.DriverLiveTracking
import com.dashit.app.data.model.Order
import com.dashit.app.data.model.OrderStatus
import com.dashit.app.data.model.UserProfile
import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * The signed-in shopper's orders, read and written in the web schema
 * (`src/lib/db.js` createOrder), exactly as the iOS app does, so the store,
 * the rider app and the Firestore rules all accept them.
 */
class OrderRepository(
    private val db: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    sealed class OrderError(message: String) : Exception(message) {
        class NotSignedIn : OrderError("Please confirm your number to place orders.")
        class Network : OrderError("We couldn't reach the store. Check your connection and try again.")
        class WindowClosed : OrderError("The 60 seconds are up and the store is packing your order.")
        class NothingAdded : OrderError("Add at least one item first.")
        class StoreStartedPacking : OrderError("The store has already started packing, so this order can't be changed now.")
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var prefs: SharedPreferences? = null
    private var appContext: Context? = null

    private val _deliveredCelebration = MutableStateFlow<Order?>(null)
    /** A delivered order whose celebration the shopper hasn't seen yet. */
    val deliveredCelebration: StateFlow<Order?> = _deliveredCelebration.asStateFlow()

    private val _orders = MutableStateFlow<List<Order>>(emptyList())
    /** The shopper's own orders, newest first. Empty while signed out. */
    val orders: StateFlow<List<Order>> = _orders.asStateFlow()

    private val _ordersLoaded = MutableStateFlow(false)
    /** False until the first answer for the signed-in shopper, for the skeletons. */
    val ordersLoaded: StateFlow<Boolean> = _ordersLoaded.asStateFlow()

    private val activeOrderId = MutableStateFlow<String?>(null)
    private val _liveTracking = MutableStateFlow<DriverLiveTracking?>(null)
    /** The rider's live position for the active order, from `tracking/live`. */
    val liveTracking: StateFlow<DriverLiveTracking?> = _liveTracking.asStateFlow()

    /** The order the status pill and the live map follow. */
    val activeOrder: StateFlow<Order?> = combine(_orders, activeOrderId) { list, id ->
        id?.let { wanted -> list.firstOrNull { it.id == wanted } }
    }.stateIn(scope, SharingStarted.Eagerly, null)

    private var ordersRegistration: ListenerRegistration? = null
    private var trackingRegistration: ListenerRegistration? = null
    private var trackedOrderId: String? = null
    private var listeningUid: String? = null

    fun init(context: Context) {
        if (prefs != null) return
        prefs = context.applicationContext.getSharedPreferences("dashit_orders", Context.MODE_PRIVATE)
        appContext = context.applicationContext
        activeOrderId.value = prefs?.getString("active_order_id", null)

        scope.launch {
            AuthRepository.user.collect { profile -> listenUserOrders(profile?.id) }
        }
        scope.launch {
            activeOrder.collect { order -> listenTracking(order?.takeIf { !it.status.isFinished }?.id) }
        }
    }

    // MARK: - Active order

    private fun setActiveOrderId(id: String?) {
        activeOrderId.value = id
        prefs?.edit()?.putString("active_order_id", id)?.apply()
    }

    /** The pill's close button once an order is delivered or cancelled. */
    fun retireActiveOrder() = setActiveOrderId(null)

    // MARK: - Delivered

    /**
     * A delivered order celebrates once: straight away if the app is on screen,
     * otherwise a notification now and the celebration when the app is next opened.
     */
    fun noteDelivery() {
        val id = activeOrderId.value ?: return
        val order = _orders.value.firstOrNull { it.id == id } ?: return
        if (order.status != OrderStatus.DELIVERED || isRemembered(order.id, CELEBRATED_KEY)) return
        // Not for old orders found long after the fact.
        if (System.currentTimeMillis() - order.createdAt > 12 * 60 * 60 * 1000L) return
        if (OrderNotifications.isAppInForeground) {
            if (_deliveredCelebration.value?.id != order.id) _deliveredCelebration.value = order
        } else if (OrderNotifications.isAppInBackground && !isRemembered(order.id, NOTIFIED_KEY)) {
            // Only once the shopper has left; while starting up, onStart celebrates instead.
            remember(order.id, NOTIFIED_KEY)
            appContext?.let { OrderNotifications.notifyDelivered(it, order) }
        }
    }

    /** The celebration was seen: remember it and retire the delivered order. */
    fun finishCelebration() {
        _deliveredCelebration.value?.let { remember(it.id, CELEBRATED_KEY) }
        _deliveredCelebration.value = null
        retireActiveOrder()
    }

    private fun isRemembered(id: String, key: String): Boolean =
        prefs?.getStringSet(key, emptySet())?.contains(id) == true

    private fun remember(id: String, key: String) {
        val ids = prefs?.getStringSet(key, emptySet()).orEmpty().toMutableSet()
        ids.add(id)
        prefs?.edit()?.putStringSet(key, ids.toList().takeLast(50).toSet())?.apply()
    }

    // MARK: - Listeners

    private fun listenUserOrders(uid: String?) {
        // Signed out there is nothing to wait for, so no skeleton either.
        if (uid == null) _ordersLoaded.value = true
        if (uid == listeningUid) return
        listeningUid = uid
        ordersRegistration?.remove()
        ordersRegistration = null
        if (uid == null) {
            _orders.value = emptyList()
            _ordersLoaded.value = true
            return
        }
        _ordersLoaded.value = false
        // The rules only let a customer read their own orders, so the query must say so.
        ordersRegistration = db.collection("orders")
            .whereEqualTo("userId", uid)
            .addSnapshotListener { snapshot, _ ->
                if (snapshot == null) return@addSnapshotListener
                val list = snapshot.documents.mapNotNull { parseOrder(it) }.sortedByDescending { it.createdAt }
                _orders.value = list
                _ordersLoaded.value = true
                adoptLatestIfNeeded(list)
                noteDelivery()
            }
    }

    /** After a reinstall or on a second phone, pick up an order that is still under way. */
    private fun adoptLatestIfNeeded(list: List<Order>) {
        val current = activeOrderId.value
        if (current != null) {
            val order = list.firstOrNull { it.id == current } ?: return
            // Replaced during the change window: follow the replacement.
            if (order.status == OrderStatus.CANCELLED) {
                list.firstOrNull { it.replacesOrderId == order.id }?.let { setActiveOrderId(it.id) }
            }
            return
        }
        val threeHours = 3 * 60 * 60 * 1000L
        list.firstOrNull { !it.status.isFinished && System.currentTimeMillis() - it.createdAt < threeHours }
            ?.let { setActiveOrderId(it.id) }
    }

    private fun listenTracking(orderId: String?) {
        if (orderId == trackedOrderId) return
        trackedOrderId = orderId
        trackingRegistration?.remove()
        trackingRegistration = null
        _liveTracking.value = null
        if (orderId == null) return
        trackingRegistration = db.collection("orders").document(orderId)
            .collection("tracking").document("live")
            .addSnapshotListener { snapshot, _ ->
                if (snapshot == null || !snapshot.exists()) return@addSnapshotListener
                val lat = snapshot.getDouble("latitude") ?: snapshot.getDouble("lat") ?: return@addSnapshotListener
                val lng = snapshot.getDouble("longitude") ?: snapshot.getDouble("lng") ?: return@addSnapshotListener
                _liveTracking.value = DriverLiveTracking(
                    lat = lat,
                    lng = lng,
                    heading = snapshot.getDouble("heading"),
                    speed = snapshot.getDouble("speed"),
                    etaMinutes = snapshot.getLong("etaMinutes")?.toInt(),
                    distanceFormatted = snapshot.getString("distanceFormatted"),
                    statusText = snapshot.getString("statusText"),
                    progress = snapshot.getDouble("progress"),
                    stopsAhead = snapshot.getLong("stopsAhead")?.toInt()
                )
            }
    }

    // MARK: - Writes

    /** Writes the order in the web schema and waits for the store to have it. */
    suspend fun placeOrder(order: Order, customer: UserProfile, distanceKm: Double?) {
        writeOrder(order, customer, distanceKm)
        setActiveOrderId(order.id)
    }

    suspend fun cancelOrder(orderId: String, reason: String = "Customer cancelled") {
        try {
            withTimeout(15_000) {
                db.collection("orders").document(orderId).update(
                    mapOf(
                        "status" to "Cancelled",
                        "cancelReason" to reason,
                        "updatedAt" to FieldValue.serverTimestamp(),
                        "statusHistory" to FieldValue.arrayUnion(mapOf("status" to "Cancelled", "at" to isoNow()))
                    )
                ).await()
            }
        } catch (e: TimeoutCancellationException) {
            throw OrderError.Network()
        }
    }

    /**
     * Adds items during the 60-second window. The rules never let a customer
     * edit an order's items, only cancel a "Placed" one, so the change is made
     * as a store would record it: a full replacement order first, then the
     * original cancelled as replaced. If the original can't be cancelled any
     * more (the store started), the replacement is withdrawn again.
     */
    suspend fun addItems(additions: List<CartItem>, order: Order): Order {
        if (order.modifySecondsRemaining() <= 0) throw OrderError.WindowClosed()
        val added = additions.filter { it.qty > 0 }
        if (added.isEmpty()) throw OrderError.NothingAdded()
        val customer = AuthRepository.user.value
        if (customer == null || customer.id != order.userId) throw OrderError.NotSignedIn()

        val items = order.items.map { it.copy() }.toMutableList()
        for (addition in added) {
            val index = items.indexOfFirst { it.id == addition.id }
            if (index >= 0) items[index] = items[index].copy(qty = items[index].qty + addition.qty)
            else items.add(addition)
        }
        val bill = CartBillBreakdown.calculate(items, Coupon.find(order.couponCode))
        val replacement = Order(
            id = Order.newCode(),
            userId = customer.id,
            items = items,
            subtotal = bill.subtotal,
            deliveryFee = bill.deliveryFee,
            discount = bill.couponDiscount,
            grandTotal = bill.grandTotal,
            status = OrderStatus.PLACED,
            deliveryAddress = order.deliveryAddress,
            paymentMethod = order.paymentMethod,
            paymentStatus = order.paymentStatus,
            etaMinutes = order.etaMinutes,
            // Same code at the door, and the window keeps the original deadline.
            otp = order.otp ?: Order.newDeliveryCode(),
            couponCode = order.couponCode,
            modifyWindowEndsAt = order.modifyWindowEnd,
            replacesOrderId = order.id
        )
        val distance = DeliveryEta.quote(order.deliveryAddress.latitude, order.deliveryAddress.longitude).distanceKm

        try {
            writeOrder(replacement, customer, distance)
        } catch (e: OrderError.Network) {
            // It may still land later: make sure it can't stand next to the original.
            scope.launch { runCatching { cancelOrder(replacement.id, "Withdrawn: update did not complete") } }
            throw e
        }
        try {
            cancelOrder(order.id, "Replaced by ${replacement.id}")
        } catch (e: Exception) {
            runCatching { cancelOrder(replacement.id, "Withdrawn: original order already being packed") }
            throw OrderError.StoreStartedPacking()
        }
        setActiveOrderId(replacement.id)
        return replacement
    }

    private suspend fun writeOrder(order: Order, customer: UserProfile, distanceKm: Double?) {
        val placedAt = isoNow()
        val dateLabel = SimpleDateFormat("d MMM, h:mm a", Locale.ENGLISH).format(Date(order.createdAt))
        val savings = order.items.sumOf { maxOf(0.0, (it.originalPrice ?: it.price) - it.price) * it.qty } + order.discount
        val address = order.deliveryAddress
        val payload = hashMapOf<String, Any?>(
            "orderId" to order.id,
            "userId" to order.userId,
            "status" to "Placed",
            "driverId" to null,
            "driverName" to "",
            "statusHistory" to listOf(mapOf("status" to "Placed", "at" to placedAt)),
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp(),
            "date" to dateLabel,
            "items" to order.items.map { item ->
                buildMap {
                    put("id", item.id)
                    put("productId", item.productId)
                    put("name", item.name)
                    put("unit", item.unit)
                    put("price", item.price)
                    put("img", item.img)
                    put("cat", item.cat)
                    put("qty", item.qty)
                    item.originalPrice?.let { put("originalPrice", it) }
                }
            },
            "subtotal" to order.subtotal,
            "deliveryFee" to order.deliveryFee,
            "discount" to order.discount,
            "totalAmount" to order.grandTotal,
            "total" to order.grandTotal,
            "finalTotal" to order.grandTotal,
            "savings" to savings,
            "paymentMethod" to order.paymentMethod,
            "paymentStatus" to order.paymentStatus,
            "location" to mapOf(
                "address" to address.formattedSummary,
                "lat" to address.latitude,
                "lng" to address.longitude,
                "alias" to address.nickname
            ),
            "etaMinutes" to (order.etaMinutes ?: 8),
            // A number, as the web writes it; the rider types it back at the door.
            "otp" to (order.otp?.toIntOrNull() ?: Order.newDeliveryCode().toInt()),
            "customerName" to (customer.name ?: "Customer"),
            "mobile" to customer.mobile,
            "email" to (customer.email ?: ""),
            "platform" to "android"
        )
        distanceKm?.let { payload["distanceKm"] = it }
        order.couponCode?.let { payload["couponCode"] = it }
        order.replacesOrderId?.let { payload["replacesOrderId"] = it }
        order.modifyWindowEndsAt?.let { payload["modifyWindowEndsAt"] = Timestamp(Date(it)) }

        try {
            // Without a timeout an offline write would wait for the network forever.
            withTimeout(15_000) {
                db.collection("orders").document(order.id).set(payload).await()
            }
        } catch (e: TimeoutCancellationException) {
            throw OrderError.Network()
        } catch (e: Exception) {
            throw OrderError.Network()
        }
    }

    // MARK: - Parsing

    @Suppress("UNCHECKED_CAST")
    private fun parseOrder(doc: DocumentSnapshot): Order? = try {
        val items = (doc.get("items") as? List<Map<String, Any?>>).orEmpty().mapIndexed { index, m ->
            CartItem(
                id = (m["id"] ?: m["productId"])?.toString() ?: "line-$index",
                productId = (m["productId"] ?: m["id"])?.toString() ?: "",
                name = m["name"]?.toString() ?: "Item",
                unit = m["unit"]?.toString() ?: "",
                price = (m["price"] as? Number)?.toDouble() ?: 0.0,
                originalPrice = (m["originalPrice"] as? Number)?.toDouble() ?: (m["mrp"] as? Number)?.toDouble(),
                img = (m["img"] ?: m["image"])?.toString() ?: "",
                cat = (m["cat"] ?: m["category"])?.toString() ?: "",
                qty = (m["qty"] as? Number)?.toInt() ?: 1
            )
        }
        val location = doc.get("location") as? Map<String, Any?>
        val total = listOf("totalAmount", "total", "finalTotal", "grandTotal")
            .firstNotNullOfOrNull { (doc.get(it) as? Number)?.toDouble() } ?: 0.0
        Order(
            id = doc.id,
            userId = doc.getString("userId") ?: "",
            items = items,
            subtotal = (doc.get("subtotal") as? Number)?.toDouble() ?: items.sumOf { it.price * it.qty },
            deliveryFee = (doc.get("deliveryFee") as? Number)?.toDouble() ?: 0.0,
            discount = (doc.get("discount") as? Number)?.toDouble() ?: 0.0,
            grandTotal = total,
            status = OrderStatus.fromString(doc.getString("status") ?: "Placed"),
            createdAt = timestampMillis(doc, "createdAt") ?: System.currentTimeMillis(),
            deliveryAddress = DeliveryAddress(
                nickname = location?.get("alias")?.toString() ?: "Home",
                street = location?.get("address")?.toString() ?: "",
                latitude = (location?.get("lat") as? Number)?.toDouble() ?: DeliveryAddress().latitude,
                longitude = (location?.get("lng") as? Number)?.toDouble() ?: DeliveryAddress().longitude
            ),
            paymentMethod = doc.getString("paymentMethod") ?: "Cash on Delivery",
            paymentStatus = doc.getString("paymentStatus") ?: "pending",
            driverId = doc.getString("driverId"),
            driverName = doc.getString("driverName")?.takeIf { it.isNotBlank() },
            driverPhone = doc.getString("driverPhone"),
            etaMinutes = (doc.get("etaMinutes") as? Number)?.toInt(),
            otp = doc.get("otp")?.let { if (it is Number) it.toInt().toString() else it.toString() },
            couponCode = doc.getString("couponCode"),
            modifyWindowEndsAt = timestampMillis(doc, "modifyWindowEndsAt"),
            replacesOrderId = doc.getString("replacesOrderId")
        )
    } catch (e: Exception) {
        null
    }

    private fun timestampMillis(doc: DocumentSnapshot, field: String): Long? {
        // A just-written server timestamp reads as the local estimate until the server confirms.
        return when (val value = doc.get(field, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)) {
            is Timestamp -> value.toDate().time
            is Date -> value.time
            is Number -> value.toLong().let { if (it < 100_000_000_000L) it * 1000 else it }
            else -> null
        }
    }

    private fun isoNow(): String = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        .apply { timeZone = TimeZone.getTimeZone("UTC") }
        .format(Date())

    companion object {
        val shared = OrderRepository()
        private const val CELEBRATED_KEY = "celebrated_orders"
        private const val NOTIFIED_KEY = "delivery_notified_orders"
    }
}
