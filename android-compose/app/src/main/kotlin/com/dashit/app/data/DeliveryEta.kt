package com.dashit.app.data

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
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
    const val HUB_LAT = 33.735832
    const val HUB_LNG = 75.143614
    const val MAX_RADIUS_KM = 5.0

    data class Quote(
        /** null when the address is outside the delivery area. */
        val etaMinutes: Int?,
        /** Road distance (straight line × 1.25) for deliverable addresses. */
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

    /** Hub → customer: 3 min packing + ride at ~18 km/h on roads 1.25× the line + 3 min buffer, never under 8. */
    fun quote(lat: Double, lng: Double): Quote {
        val straightKm = haversineKm(HUB_LAT, HUB_LNG, lat, lng)
        if (straightKm > MAX_RADIUS_KM) {
            return Quote(null, (straightKm * 10).roundToInt() / 10.0, false)
        }
        val roadKm = maxOf(0.4, straightKm * 1.25)
        val ridingMinutes = roadKm / 18 * 60
        val total = maxOf(8, (3 + ridingMinutes + 3).roundToInt())
        return Quote(total, (roadKm * 10).roundToInt() / 10.0, true)
    }
}

/** `config/store`: the admin's open/closed switch and high-demand flag, readable by everyone. */
object StoreStatus {
    data class State(val isOpen: Boolean = true, val closeReason: String = "", val highDemand: Boolean = false)

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state.asStateFlow()
    private var registration: ListenerRegistration? = null

    fun start() {
        if (registration != null) return
        registration = FirebaseFirestore.getInstance().collection("config").document("store")
            .addSnapshotListener { snapshot, _ ->
                if (snapshot == null || !snapshot.exists()) return@addSnapshotListener
                _state.value = State(
                    isOpen = snapshot.getBoolean("isOpen") ?: true,
                    closeReason = snapshot.getString("closeReason") ?: "",
                    highDemand = snapshot.getBoolean("highDemand") ?: false
                )
            }
    }

    /** In high demand the web promises at least 18 minutes. */
    fun etaMinutes(quote: DeliveryEta.Quote): Int? {
        val eta = quote.etaMinutes ?: return null
        return if (_state.value.highDemand) maxOf(eta, 18) else eta
    }
}
