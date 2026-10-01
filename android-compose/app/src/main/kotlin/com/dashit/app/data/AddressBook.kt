package com.dashit.app.data

import android.content.Context
import com.dashit.app.data.model.DeliveryAddress
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject

/**
 * The address deliveries go to now, and every address the shopper has used,
 * most recent first. Kept on the phone, like the iPhone app's AddressBook.
 */
object AddressBook {
    private const val PREFS = "dashit_addresses"
    private const val KEY_CURRENT = "current"
    private const val KEY_SAVED = "saved"
    private const val MAX_SAVED = 12

    private val _current = MutableStateFlow<DeliveryAddress?>(null)
    val current: StateFlow<DeliveryAddress?> = _current.asStateFlow()
    private val _saved = MutableStateFlow<List<DeliveryAddress>>(emptyList())
    val saved: StateFlow<List<DeliveryAddress>> = _saved.asStateFlow()

    private var appContext: Context? = null

    fun init(context: Context) {
        appContext = context.applicationContext
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val current = prefs.getString(KEY_CURRENT, null)?.let { runCatching { fromJson(JSONObject(it)) }.getOrNull() }
        var saved = prefs.getString(KEY_SAVED, null)?.let { raw ->
            runCatching {
                val array = JSONArray(raw)
                (0 until array.length()).map { fromJson(array.getJSONObject(it)) }
            }.getOrNull()
        }.orEmpty()
        if (saved.isEmpty() && current != null) saved = listOf(current)
        _current.value = current
        _saved.value = saved
    }

    /** Delivers here from now on and keeps it at the top of the saved list. */
    fun use(address: DeliveryAddress) {
        _current.value = address
        _saved.value = (listOf(address) + _saved.value.filterNot { isSamePlace(it, address) }).take(MAX_SAVED)
        persist()
    }

    fun remove(address: DeliveryAddress) {
        _saved.value = _saved.value.filterNot { it.id == address.id }
        persist()
    }

    fun isCurrent(address: DeliveryAddress): Boolean = _current.value?.let { isSamePlace(it, address) } ?: false

    /** After signing out or deleting the account. */
    fun forgetAll() {
        _current.value = null
        _saved.value = emptyList()
        persist()
    }

    private fun persist() {
        val prefs = appContext?.getSharedPreferences(PREFS, Context.MODE_PRIVATE) ?: return
        prefs.edit()
            .putString(KEY_CURRENT, _current.value?.let { toJson(it).toString() })
            .putString(KEY_SAVED, JSONArray(_saved.value.map(::toJson)).toString())
            .apply()
    }

    /** Same door: the same entry, or within 25 m with the same house. */
    private fun isSamePlace(a: DeliveryAddress, b: DeliveryAddress): Boolean {
        if (a.id == b.id) return true
        val house = { x: DeliveryAddress -> x.houseNumber.orEmpty().trim().lowercase() }
        return DeliveryEta.haversineKm(a.latitude, a.longitude, b.latitude, b.longitude) < 0.025 && house(a) == house(b)
    }

    private fun toJson(a: DeliveryAddress) = JSONObject()
        .put("id", a.id).put("nickname", a.nickname).put("street", a.street)
        .put("houseNumber", a.houseNumber).put("landmark", a.landmark)
        .put("city", a.city).put("pincode", a.pincode)
        .put("latitude", a.latitude).put("longitude", a.longitude)

    private fun fromJson(o: JSONObject) = DeliveryAddress(
        id = o.optString("id").ifBlank { java.util.UUID.randomUUID().toString() },
        nickname = o.optString("nickname", "Home"),
        street = o.optString("street"),
        houseNumber = o.optString("houseNumber").takeIf { it.isNotBlank() && it != "null" },
        landmark = o.optString("landmark").takeIf { it.isNotBlank() && it != "null" },
        city = o.optString("city", "Anantnag"),
        pincode = o.optString("pincode", "192101"),
        latitude = o.optDouble("latitude", DeliveryEta.HUB_LAT),
        longitude = o.optDouble("longitude", DeliveryEta.HUB_LNG)
    )
}
