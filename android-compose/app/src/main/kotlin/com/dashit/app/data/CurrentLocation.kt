package com.dashit.app.data

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Address
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.CancellationSignal
import androidx.core.content.ContextCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.util.Locale
import kotlin.coroutines.resume

/** Where the phone is, and the street name of a spot on the map. No Play services needed. */
object CurrentLocation {
    val permissions = arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)

    fun isAllowed(context: Context) = permissions.any {
        ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
    }

    /** A fresh fix within ~8 s, else the newest one the phone already had, else null. */
    @SuppressLint("MissingPermission")
    suspend fun fix(context: Context): Location? {
        if (!isAllowed(context)) return null
        val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return null
        val providers = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
            .filter { runCatching { manager.isProviderEnabled(it) }.getOrDefault(false) }
        val lastKnown = providers.mapNotNull { runCatching { manager.getLastKnownLocation(it) }.getOrNull() }
            .maxByOrNull { it.time }
        // Recent and close enough: use it at once.
        if (lastKnown != null && System.currentTimeMillis() - lastKnown.time < 60_000 && lastKnown.accuracy < 60) return lastKnown
        val provider = when {
            LocationManager.NETWORK_PROVIDER in providers -> LocationManager.NETWORK_PROVIDER
            providers.isNotEmpty() -> providers.first()
            else -> return lastKnown
        }
        val fresh = withTimeoutOrNull(8_000) {
            suspendCancellableCoroutine<Location?> { cont ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    val signal = CancellationSignal()
                    cont.invokeOnCancellation { signal.cancel() }
                    manager.getCurrentLocation(provider, signal, context.mainExecutor) { cont.resume(it) }
                } else {
                    @Suppress("DEPRECATION")
                    manager.requestSingleUpdate(provider, { cont.resume(it) }, context.mainLooper)
                }
            }
        }
        return fresh ?: lastKnown
    }

    /** "12 Court Road, Lal Chowk, Anantnag" for a spot, or null. */
    suspend fun streetLine(context: Context, lat: Double, lng: Double): String? = withContext(Dispatchers.IO) {
        if (!Geocoder.isPresent()) return@withContext null
        val place = runCatching {
            @Suppress("DEPRECATION")
            Geocoder(context, Locale.ENGLISH).getFromLocation(lat, lng, 1)?.firstOrNull()
        }.getOrNull() ?: return@withContext null
        line(place)
    }

    data class Place(val title: String, val subtitle: String, val lat: Double, val lng: Double)

    /** Places matching what was typed, near Anantnag. */
    suspend fun search(context: Context, query: String): List<Place> = withContext(Dispatchers.IO) {
        if (!Geocoder.isPresent() || query.isBlank()) return@withContext emptyList()
        val results = runCatching {
            @Suppress("DEPRECATION")
            Geocoder(context, Locale.ENGLISH).getFromLocationName(
                "$query, Anantnag",
                8,
                DeliveryEta.HUB_LAT - 0.12, DeliveryEta.HUB_LNG - 0.14,
                DeliveryEta.HUB_LAT + 0.12, DeliveryEta.HUB_LNG + 0.14
            )
        }.getOrNull().orEmpty()
        results.mapNotNull { place ->
            val title = place.featureName?.takeIf { !it.matches(Regex("^[0-9+ ]+$")) } ?: place.thoroughfare ?: return@mapNotNull null
            Place(title, line(place) ?: "Anantnag", place.latitude, place.longitude)
        }.distinctBy { it.title + it.subtitle }
    }

    private fun line(place: Address): String? {
        val street = listOfNotNull(place.subThoroughfare, place.thoroughfare).joinToString(" ")
        return listOf(street, place.subLocality.orEmpty(), place.locality.orEmpty())
            .filter { it.isNotBlank() }
            .distinct()
            .joinToString(", ")
            .ifBlank { place.featureName }
    }
}
