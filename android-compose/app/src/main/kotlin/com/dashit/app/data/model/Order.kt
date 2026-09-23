package com.dashit.app.data.model

enum class OrderStatus(val title: String, val rawValue: String) {
    PLACED("Order Placed", "placed"),
    PACKING("Packing at Store", "packing"),
    OUT_FOR_DELIVERY("Out for Delivery", "out_for_delivery"),
    DELIVERED("Delivered", "delivered"),
    CANCELLED("Order Cancelled", "cancelled");

    companion object {
        fun fromString(value: String): OrderStatus {
            return entries.firstOrNull {
                it.rawValue.equals(value, ignoreCase = true) || it.title.equals(value, ignoreCase = true)
            } ?: PLACED
        }
    }
}

data class DriverLiveTracking(
    val lat: Double,
    val lng: Double,
    val heading: Double? = null,
    val speed: Double? = null,
    val etaMinutes: Int? = 8,
    val distanceFormatted: String? = "1.2 km",
    val statusText: String? = "Rider is heading to your location",
    val progress: Double? = 0.65,
    val stopsAhead: Int? = 0
)

data class Order(
    val id: String,
    val userId: String,
    val items: List<CartItem>,
    val subtotal: Double,
    val deliveryFee: Double,
    val discount: Double,
    val grandTotal: Double,
    val status: OrderStatus = OrderStatus.PLACED,
    val createdAt: Long = System.currentTimeMillis(),
    val deliveryAddress: DeliveryAddress = DeliveryAddress(),
    val paymentMethod: String = "cod",
    val paymentStatus: String = "pending",
    val driverId: String? = null,
    val driverName: String? = null,
    val driverPhone: String? = null,
    val etaMinutes: Int? = 8,
    val tracking: DriverLiveTracking? = null
)
