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

    /**
     * The night hours in use: 8 pm to 6 am until the shop's settings arrive, then
     * `nightStartHour` and `nightEndHour` from `config/store` ([adopt]).
     */
    @Volatile var startHour = START_HOUR
        private set
    @Volatile var endHour = END_HOUR
        private set

    /** Takes the shop's night hours (0 to 23); anything else keeps the default. */
    fun adopt(start: Number?, end: Number?) {
        fun hour(value: Number?, fallback: Int): Int {
            val d = value?.toDouble() ?: return fallback
            return if (d == Math.floor(d) && d in 0.0..23.0) d.toInt() else fallback
        }
        startHour = hour(start, START_HOUR)
        endHour = hour(end, END_HOUR)
    }

    /** 20 is "8 pm", 6 is "6 am", 0 is "12 am". */
    fun hourLabel(hour: Int): String {
        val h = ((hour % 24) + 24) % 24
        return "${if (h % 12 == 0) 12 else h % 12} ${if (h < 12) "am" else "pm"}"
    }

    /** "8 pm": when night starts, for messages. */
    val startLabel: String get() = hourLabel(startHour)
    const val DEFAULT_PER_KM = 6.0
    const val DEFAULT_MIN_FEE = 10.0

    /** Hour of the day in India (UTC+5:30, no daylight saving), whatever zone the phone is in. */
    fun istHour(nowMillis: Long): Int = (((nowMillis + 330 * 60_000L) / 3_600_000L) % 24).toInt()

    fun isNightHours(nowMillis: Long): Boolean {
        val hour = istHour(nowMillis)
        val start = startHour
        val end = endHour
        if (start == end) return false
        // 20 to 6 runs past midnight; 1 to 5 does not.
        return if (start > end) hour >= start || hour < end else hour in start until end
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
