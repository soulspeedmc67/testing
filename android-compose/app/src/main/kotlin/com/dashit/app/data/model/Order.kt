package com.dashit.app.data.model

import kotlin.math.ceil
import kotlin.math.max
import kotlin.random.Random

/**
 * Where an order is, normalised from whatever status string the admin, driver,
 * web or iOS app wrote. Same stages, progress floors and copy as the iOS app's
 * `DeliveryStage`, so both apps describe an order the same way.
 */
enum class OrderStatus(val title: String, val rawValue: String) {
    PLACED("Order Placed", "Placed"),
    PACKING("Packing at Store", "Packing"),
    OUT_FOR_DELIVERY("Out for Delivery", "Out for Delivery"),
    DELIVERED("Delivered", "Delivered"),
    CANCELLED("Order Cancelled", "Cancelled");

    /** The web tracker's ORDER_PROGRESS_FLOOR: 12 / 34 / 58 / 100. */
    val floor: Double
        get() = when (this) {
            PLACED -> 0.12
            PACKING -> 0.34
            OUT_FOR_DELIVERY -> 0.58
            DELIVERED -> 1.0
            CANCELLED -> 0.0
        }

    val isFinished: Boolean get() = this == DELIVERED || this == CANCELLED

    /** Stage floor, raised by the rider's live 0–100 progress while riding. */
    fun progress(live: Double?): Double {
        if (this != OUT_FOR_DELIVERY || live == null || live <= 0) return floor
        return minOf(0.97, max(floor, live / 100))
    }

    fun headline(riderName: String?): String = when (this) {
        PLACED -> "Order placed"
        PACKING -> "Packing your order"
        OUT_FOR_DELIVERY -> riderName?.trim()?.takeIf { it.isNotEmpty() }?.let { "$it is on the way" } ?: "On the way to you"
        DELIVERED -> "Order delivered"
        CANCELLED -> "Order cancelled"
    }

    /** Short, for the order pill: no names, nothing that gets cut off. */
    val pillHeadline: String
        get() = when (this) {
            PLACED -> "Order placed"
            PACKING -> "Packing your order"
            OUT_FOR_DELIVERY -> "On the way"
            DELIVERED -> "Delivered"
            CANCELLED -> "Cancelled"
        }

    fun subtitle(etaMinutes: Int, itemCount: Int): String = when (this) {
        PLACED -> "Hub is picking fresh items"
        PACKING -> if (itemCount > 0) "Packing $itemCount item${if (itemCount == 1) "" else "s"} at the hub" else "Items are packed & sealed"
        OUT_FOR_DELIVERY -> if (etaMinutes <= 1) "Arriving now" else "Arriving in $etaMinutes mins"
        DELIVERED -> "Handed over safely"
        CANCELLED -> "This order has been cancelled"
    }

    companion object {
        /** "out" / "way" are checked before "deliver" so "out_for_delivery" is not read as delivered. */
        fun fromString(value: String): OrderStatus {
            val s = value.lowercase()
            return when {
                "cancel" in s -> CANCELLED
                listOf("out", "way", "rider", "dispatch", "transit").any { it in s } -> OUT_FOR_DELIVERY
                listOf("deliver", "arrived", "complete").any { it in s } -> DELIVERED
                listOf("pack", "bag", "ready").any { it in s } -> PACKING
                else -> PLACED
            }
        }
    }
}

/** The rider's live telemetry, `orders/{id}/tracking/live`, written by the driver app. */
data class DriverLiveTracking(
    val lat: Double,
    val lng: Double,
    val heading: Double? = null,
    val speed: Double? = null,
    val etaMinutes: Int? = null,
    val distanceFormatted: String? = null,
    val statusText: String? = null,
    /** 0–100, as the driver app writes it. */
    val progress: Double? = null,
    val stopsAhead: Int? = null
)

data class Order(
    val id: String,
    val userId: String,
    val items: List<CartItem>,
    val subtotal: Double,
    val deliveryFee: Double,
    val discount: Double,
    val grandTotal: Double,
    /** The distance charge inside [deliveryFee] (after 8 pm); 0 when there was none. */
    val nightDeliveryFee: Double = 0.0,
    val status: OrderStatus = OrderStatus.PLACED,
    /** Epoch milliseconds. */
    val createdAt: Long = System.currentTimeMillis(),
    val deliveryAddress: DeliveryAddress = DeliveryAddress(),
    val paymentMethod: String = "Cash on Delivery",
    val paymentStatus: String = "pending",
    val driverId: String? = null,
    val driverName: String? = null,
    val driverPhone: String? = null,
    val etaMinutes: Int? = 8,
    val tracking: DriverLiveTracking? = null,
    /** The 4-digit code the rider asks for at the door. */
    val otp: String? = null,
    val couponCode: String? = null,
    /** Epoch milliseconds; set on replacement orders so the window keeps its deadline. */
    val modifyWindowEndsAt: Long? = null,
    val replacesOrderId: String? = null,
    val rejectionReason: String? = null
) {
    /** Why the store cancelled the order; null when the customer cancelled it or replaced it by adding items. */
    val storeCancelReason: String?
        get() = rejectionReason?.trim()?.takeIf {
            it.isNotEmpty() && !it.startsWith("customer cancelled", ignoreCase = true) && !it.startsWith("replaced by", ignoreCase = true)
        }

    /**
     * A rider has the order but hasn't collected it from the store yet: it goes
     * out for delivery when they tap "Start delivery" in the rider app.
     */
    val isAwaitingPickup: Boolean
        get() = (status == OrderStatus.PLACED || status == OrderStatus.PACKING) && !driverId.isNullOrBlank()

    val itemCount: Int get() = items.sumOf { it.qty }

    /**
     * Paid before delivery, which the store and rider screens read as "collect
     * nothing at the door". Items can't be added to it: nobody would pay for them.
     */
    val isPaidOnline: Boolean
        get() = Regex("online|upi|card|prepaid", RegexOption.IGNORE_CASE).containsMatchIn(paymentMethod) ||
            paymentStatus.lowercase() in setOf("paid", "completed", "captured")

    val modifyWindowEnd: Long get() = modifyWindowEndsAt ?: (createdAt + MODIFY_WINDOW_MS)

    /** Seconds left to add items or cancel: only while the store hasn't started. */
    fun modifySecondsRemaining(now: Long = System.currentTimeMillis()): Int {
        if (status != OrderStatus.PLACED) return 0
        return max(0, ceil((modifyWindowEnd - now) / 1000.0).toInt())
    }

    companion object {
        const val MODIFY_WINDOW_MS = 30_000L

        /** "DSH-" + clock digits + random digits, the same shape as the iOS order codes. */
        fun newCode(): String {
            val clock = (System.currentTimeMillis() / 1000) % 10_000
            return "DSH-%04d%d".format(clock, Random.nextInt(1000, 10000))
        }

        fun newDeliveryCode(): String = Random.nextInt(1000, 10000).toString()
    }
}
