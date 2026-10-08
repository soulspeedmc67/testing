package com.dashit.app.data

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.MetadataChanges
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Delivery ETA and serviceability, ported from `src/lib/deliveryEta.js` (and
 * the iOS `DeliveryEta`), so every app promises the same times and area.
 */
object DeliveryEta {
    /** Anantnag Central Dark Store Hub. */
    const val HUB_LAT = 33.748413
    const val HUB_LNG = 75.150839
    const val MAX_RADIUS_KM = 8.0

    data class Quote(
        val etaMinutes: Int?,
        /** Straight line from the store: the distance the 8 km area is measured by. */
        val distanceKm: Double,
        val isDeliverable: Boolean
    ) {
        val shortDistanceText: String
            get() = if (distanceKm < 1) "${(distanceKm * 1000).roundToInt()} m" else "%.1f km".format(distanceKm)
        val distanceText: String get() = "$shortDistanceText away"
    }

    fun haversineKm(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
        val r = 6371.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lng2 - lng1)
        val h = sin(dLat / 2) * sin(dLat / 2) +
            cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLon / 2) * sin(dLon / 2)
        return r * 2 * atan2(sqrt(h), sqrt(1 - h))
    }

    /**
     * Shortest road distance calculation via OSRM is disabled per store policy:
     * distance is calculated straight-line, and the store admin decides
     * order delivery directly.
     */
    suspend fun measure(lat: Double, lng: Double) {
        // No-op: external OSRM shortest distance calculation disabled
    }

    /**
     * Hub → customer: 3 min packing + ride at ~18 km/h + 3 min buffer, never
     * under 8. The standard delivery area is 8 km straight line.
     */
    fun quote(lat: Double, lng: Double): Quote {
        val straightKm = haversineKm(HUB_LAT, HUB_LNG, lat, lng)
        // Shown and saved as measured (straight line), so the shopper, the order and
        // the staff console agree on which side of 8 km it is. Streets run about
        // 1.25× that; the road figure only sets the time.
        val distanceKm = (straightKm * 10).roundToInt() / 10.0
        val roadKm = maxOf(0.4, straightKm * 1.25)
        val ridingMinutes = roadKm / 18 * 60
        val total = maxOf(8, (3 + ridingMinutes + 3).roundToInt())
        return Quote(total, distanceKm, distanceKm <= MAX_RADIUS_KM)
    }
}

/** `config/store`: the admin's open/closed switch, high-demand flag and night charge, readable by everyone. */
object StoreStatus {
    data class State(
        val isOpen: Boolean = true,
        val closeReason: String = "",
        val highDemand: Boolean = false,
        /** "auto" (8 pm to 6 am), "on" or "off": see [NightCharge]. */
        val nightChargeMode: String = "auto",
        val nightChargePerKm: Double = NightCharge.DEFAULT_PER_KM,
        val nightChargeMin: Double = NightCharge.DEFAULT_MIN_FEE,
        /** The minimum order, the fees and cash on delivery, as the shop has set them. */
        val rules: ShopRules = ShopRules(),
        /**
         * True once these settings have come from the server. Until then they are
         * the copy the phone saved last time, so a charge the shop switched on
         * since then is missing: checkout doesn't take an order before this is true.
         */
        val isLive: Boolean = false
    )

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state.asStateFlow()
    private var registration: ListenerRegistration? = null

    fun start() {
        if (registration != null) return
        // Metadata changes are included: when the saved copy turns out to be
        // still right, that is the only sign the server has answered.
        registration = FirebaseFirestore.getInstance().collection("config").document("store")
            .addSnapshotListener(MetadataChanges.INCLUDE) { snapshot, _ ->
                if (snapshot == null || !snapshot.exists()) return@addSnapshotListener
                _state.value = State(
                    isOpen = snapshot.getBoolean("isOpen") ?: true,
                    closeReason = snapshot.getString("closeReason") ?: "",
                    highDemand = snapshot.getBoolean("highDemand") ?: false,
                    nightChargeMode = snapshot.getString("nightChargeMode") ?: "auto",
                    nightChargePerKm = snapshot.getDouble("nightChargePerKm")?.takeIf { it >= 0 } ?: NightCharge.DEFAULT_PER_KM,
                    nightChargeMin = snapshot.getDouble("nightChargeMin")?.takeIf { it >= 0 } ?: NightCharge.DEFAULT_MIN_FEE,
                    rules = ShopRules.from(snapshot),
                    isLive = !snapshot.metadata.isFromCache
                )
            }
    }

    /** In high demand the web promises at least 18 minutes. */
    fun etaMinutes(quote: DeliveryEta.Quote): Int? {
        val eta = quote.etaMinutes ?: return null
        return if (_state.value.highDemand) maxOf(eta, 18) else eta
    }
}
