package com.dashit.app.data

/**
 * The night delivery charge: after 8 pm India time, or whenever the shop
 * switches it on, delivery is also charged by how far the address is from the
 * store. Ported from `src/lib/nightCharge.js`; keep the two (and the iOS
 * `NightCharge`) in step. The settings come from `config/store`.
 */
object NightCharge {
    const val START_HOUR = 20
    const val END_HOUR = 6
    const val DEFAULT_PER_KM = 6.0
    const val DEFAULT_MIN_FEE = 10.0

    /** Hour of the day in India (UTC+5:30, no daylight saving), whatever zone the phone is in. */
    fun istHour(nowMillis: Long): Int = (((nowMillis + 330 * 60_000L) / 3_600_000L) % 24).toInt()

    fun isNightHours(nowMillis: Long): Boolean {
        val hour = istHour(nowMillis)
        return hour >= START_HOUR || hour < END_HOUR
    }

    /** "on": now, until the shop changes it. "off": never. Anything else: during the night hours. */
    fun isOn(store: StoreStatus.State, nowMillis: Long): Boolean = when (store.nightChargeMode) {
        "on" -> true
        "off" -> false
        else -> isNightHours(nowMillis)
    }

    /** Whole rupees for an address [distanceKm] from the store; 0 when the charge doesn't apply. */
    fun feeFor(distanceKm: Double, store: StoreStatus.State, nowMillis: Long): Double {
        if (distanceKm <= 0 || store.nightChargePerKm <= 0 || !isOn(store, nowMillis)) return 0.0
        return maxOf(store.nightChargeMin, Math.round(distanceKm * store.nightChargePerKm).toDouble())
    }
}
