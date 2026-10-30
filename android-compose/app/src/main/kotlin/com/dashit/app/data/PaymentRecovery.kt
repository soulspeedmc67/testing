package com.dashit.app.data

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.dashit.app.data.auth.AuthRepository
import com.dashit.app.data.model.CartItem
import com.dashit.app.data.model.DeliveryAddress
import com.dashit.app.data.model.Order
import com.dashit.app.data.model.UserProfile
import com.dashit.app.data.repository.OrderRepository
import com.dashit.app.viewmodel.CartViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

/**
 * An online payment that was started but whose order isn't placed yet. It is
 * saved on the phone the moment Razorpay's order exists, with everything the
 * order needs, so a payment the app couldn't confirm in time (a UPI app that
 * settles a minute late, a dropped connection, the app closed) still ends in
 * an order: [PaymentRecovery] keeps asking the server until it is paid.
 *
 * Same as the iPhone app (`PaymentRecovery.swift`).
 */
data class PendingPayment(
    val razorpayOrderId: String,
    val customer: UserProfile,
    val order: Order,
    val distanceKm: Double?,
    /** Epoch milliseconds. */
    val startedAt: Long = System.currentTimeMillis()
) {
    val orderCode: String get() = order.id

    fun toJson(): JSONObject {
        val a = order.deliveryAddress
        return JSONObject()
            .put("razorpayOrderId", razorpayOrderId)
            .put("startedAt", startedAt)
            .put("distanceKm", distanceKm ?: JSONObject.NULL)
            .put("customer", JSONObject()
                .put("id", customer.id).put("mobile", customer.mobile)
                .put("name", customer.name ?: JSONObject.NULL).put("email", customer.email ?: JSONObject.NULL))
            .put("order", JSONObject()
                .put("id", order.id).put("userId", order.userId)
                .put("subtotal", order.subtotal).put("deliveryFee", order.deliveryFee)
                .put("discount", order.discount).put("grandTotal", order.grandTotal)
                .put("nightDeliveryFee", order.nightDeliveryFee)
                .put("extraDeliveryFee", order.extraDeliveryFee)
                .put("extraDeliveryLabel", order.extraDeliveryLabel ?: JSONObject.NULL)
                .put("etaMinutes", order.etaMinutes ?: JSONObject.NULL)
                .put("otp", order.otp ?: JSONObject.NULL)
                .put("couponCode", order.couponCode ?: JSONObject.NULL)
                .put("walletUsed", order.walletUsed)
                .put("items", JSONArray(order.items.map { i ->
                    JSONObject()
                        .put("id", i.id).put("productId", i.productId).put("name", i.name)
                        .put("unit", i.unit).put("price", i.price)
                        .put("originalPrice", i.originalPrice ?: JSONObject.NULL)
                        .put("img", i.img).put("cat", i.cat).put("qty", i.qty)
                }))
                .put("address", JSONObject()
                    .put("id", a.id).put("nickname", a.nickname).put("street", a.street)
                    .put("houseNumber", a.houseNumber ?: JSONObject.NULL)
                    .put("landmark", a.landmark ?: JSONObject.NULL)
                    .put("city", a.city).put("pincode", a.pincode)
                    .put("latitude", a.latitude).put("longitude", a.longitude)
                    .put("receiverName", a.receiverName ?: JSONObject.NULL)
                    .put("receiverPhone", a.receiverPhone ?: JSONObject.NULL)))
    }

    companion object {
        private fun JSONObject.str(key: String): String? = if (isNull(key)) null else optString(key)
        private fun JSONObject.num(key: String): Double? = if (isNull(key)) null else optDouble(key)

        fun fromJson(j: JSONObject): PendingPayment {
            val o = j.getJSONObject("order")
            val a = o.getJSONObject("address")
            val c = j.getJSONObject("customer")
            val items = o.getJSONArray("items").let { arr ->
                (0 until arr.length()).map { arr.getJSONObject(it) }.map { i ->
                    CartItem(
                        id = i.getString("id"), productId = i.getString("productId"), name = i.getString("name"),
                        unit = i.getString("unit"), price = i.getDouble("price"), originalPrice = i.num("originalPrice"),
                        img = i.getString("img"), cat = i.getString("cat"), qty = i.getInt("qty")
                    )
                }
            }
            val address = DeliveryAddress(
                id = a.getString("id"), nickname = a.getString("nickname"), street = a.getString("street"),
                houseNumber = a.str("houseNumber"), landmark = a.str("landmark"), city = a.getString("city"),
                pincode = a.getString("pincode"), latitude = a.getDouble("latitude"), longitude = a.getDouble("longitude"),
                receiverName = a.str("receiverName"), receiverPhone = a.str("receiverPhone")
            )
            val startedAt = j.getLong("startedAt")
            return PendingPayment(
                razorpayOrderId = j.getString("razorpayOrderId"),
                customer = UserProfile(id = c.getString("id"), mobile = c.getString("mobile"), name = c.str("name"), email = c.str("email")),
                order = Order(
                    id = o.getString("id"), userId = o.getString("userId"), items = items,
                    subtotal = o.getDouble("subtotal"), deliveryFee = o.getDouble("deliveryFee"),
                    discount = o.getDouble("discount"), grandTotal = o.getDouble("grandTotal"),
                    nightDeliveryFee = o.getDouble("nightDeliveryFee"), extraDeliveryFee = o.getDouble("extraDeliveryFee"),
                    extraDeliveryLabel = o.str("extraDeliveryLabel"), createdAt = startedAt,
                    deliveryAddress = address, paymentMethod = "Paid online", paymentStatus = "paid",
                    etaMinutes = if (o.isNull("etaMinutes")) null else o.getInt("etaMinutes"),
                    otp = o.str("otp"), couponCode = o.str("couponCode"), walletUsed = o.getInt("walletUsed")
                ),
                distanceKm = j.num("distanceKm"),
                startedAt = startedAt
            )
        }
    }
}

/**
 * Places the order for every saved payment that Razorpay took money for.
 *
 * A payment that was never paid (the shopper backed out) is forgotten after
 * [UNPAID_LIFETIME_MS]; one that was paid stays until its order is placed,
 * however long that takes, so money taken always ends in an order.
 */
object PaymentRecovery {
    private const val TAG = "DASHitPayRecovery"
    private const val KEY = "pending_payments"
    /** How long an unpaid payment keeps being checked: a slow UPI app can still settle. */
    private const val UNPAID_LIFETIME_MS = 45 * 60_000L
    private const val PAUSE_MS = 20_000L
    /** About half an hour of checking per start; coming back to the app starts it again. */
    private const val ROUNDS = 90

    private var prefs: SharedPreferences? = null
    private val held = mutableSetOf<String>()
    private var loop: Job? = null
    private var checking = false

    fun init(context: Context) {
        if (prefs == null) prefs = context.applicationContext.getSharedPreferences("dashit_payments", Context.MODE_PRIVATE)
    }

    // MARK: - Saved payments

    @Synchronized
    fun all(): List<PendingPayment> {
        val raw = prefs?.getString(KEY, null) ?: return emptyList()
        return runCatching {
            val arr = JSONArray(raw)
            (0 until arr.length()).map { PendingPayment.fromJson(arr.getJSONObject(it)) }
        }.getOrDefault(emptyList())
    }

    @Synchronized
    fun add(payment: PendingPayment) = save(all().filter { it.orderCode != payment.orderCode } + payment)

    @Synchronized
    fun remove(orderCode: String) = save(all().filter { it.orderCode != orderCode })

    private fun save(list: List<PendingPayment>) {
        prefs?.edit()?.putString(KEY, JSONArray(list.map { it.toJson() }).toString())?.apply()
    }

    // MARK: - Recovery

    /** The checkout is handling this order itself right now; leave it alone. */
    @Synchronized fun hold(orderCode: String) { held.add(orderCode) }
    @Synchronized fun release(orderCode: String) { held.remove(orderCode) }
    @Synchronized private fun isHeld(orderCode: String) = orderCode in held

    /** Starts checking in the background if any payment is waiting. Safe to call often. */
    fun start() {
        if (loop?.isActive == true || all().isEmpty()) return
        loop = OnlinePayment.scope.launch {
            repeat(ROUNDS) {
                checkAll()
                if (all().isEmpty()) return@launch
                delay(PAUSE_MS)
            }
        }
    }

    private suspend fun checkAll() {
        if (checking) return
        checking = true
        try {
            // The order is written as the signed-in shopper who paid.
            val uid = AuthRepository.user.value?.id ?: return
            all().filter { it.order.userId == uid && !isHeld(it.orderCode) }.forEach { recover(it) }
        } finally {
            checking = false
        }
    }

    private suspend fun recover(payment: PendingPayment) {
        // Already placed (by the checkout, or an earlier round whose answer got lost).
        if (OrderRepository.shared.orders.value.any { it.id == payment.orderCode }) {
            remove(payment.orderCode)
            return
        }
        val receipt = OnlinePayment.paidReceipt(payment.razorpayOrderId, attempts = 1)
        if (receipt == null) {
            if (System.currentTimeMillis() - payment.startedAt > UNPAID_LIFETIME_MS) remove(payment.orderCode)
            return
        }
        // The checkout may have taken over while the server was answering.
        if (isHeld(payment.orderCode)) return
        try {
            OrderRepository.shared.placeOrder(payment.order, payment.customer, payment.distanceKm, receipt)
        } catch (e: Exception) {
            Log.w(TAG, "Order write failed for ${payment.orderCode}", e)
            return // paid, so it stays and is tried again next round
        }
        remove(payment.orderCode)
        // The cart still holds this order's items if the checkout never finished.
        val cart = CartViewModel.shared
        if (cart.items.value.map { it.id }.sorted() == payment.order.items.map { it.id }.sorted()) cart.clear()
    }
}
