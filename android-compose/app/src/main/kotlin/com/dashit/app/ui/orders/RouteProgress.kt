package com.dashit.app.ui.orders

import android.os.SystemClock
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.dashit.app.data.model.DriverLiveTracking
import com.dashit.app.data.model.Order
import com.dashit.app.data.model.OrderStatus
import org.osmdroid.util.GeoPoint
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sqrt

/**
 * Where the rider is on the road to the door: only the road still to cover,
 * how far that is, and from it the time left and how far along the delivery is.
 * Worked out here from the rider's position, so it keeps up with every GPS tick
 * whatever the rider's phone writes for "ETA".
 */
class RouteProgress(
    /** The road still to cover, from the rider to the door. */
    val path: List<GeoPoint>,
    val isRoad: Boolean,
    val remainingMeters: Double?,
    /** The longest the road to the door has been, to measure progress against. */
    private val totalMeters: Double?,
    /**
     * Where to draw the rider: on the road when the phone's fix is within a few
     * metres of it (GPS wanders off the road; the rider doesn't), else the fix.
     */
    val riderPosition: GeoPoint? = null,
    /** The way the road runs where the rider is, for the rider's heading. */
    val roadBearing: Double? = null
) {
    /** 0–100, how much of the ride is behind the rider. */
    val percentDone: Double?
        get() {
            val total = totalMeters ?: return null
            val left = remainingMeters ?: return null
            if (total <= 0.0) return null
            return ((1 - left / total) * 100).coerceIn(0.0, 100.0)
        }

    /**
     * Minutes to show the shopper: the road left at the rider's pace, plus a
     * few minutes' margin (parking, stairs, finding the door), so the promise
     * is one the store keeps.
     */
    fun etaMinutes(riderSpeedMps: Double?): Int? {
        val left = remainingMeters ?: return null
        // A town average of ~20 km/h, nudged by how fast the rider is moving right now.
        val average = 5.5
        val speed = if (riderSpeedMps != null && riderSpeedMps > 2.0) 0.6 * average + 0.4 * min(riderSpeedMps, 12.0) else average
        return max(1, kotlin.math.ceil(left / speed / 60.0).toInt()) + SHOWN_MARGIN_MINUTES
    }

    /** "650 m away", "1.2 km away" or "Arriving now". */
    fun distanceLine(): String? {
        val left = remainingMeters ?: return null
        return when {
            left < 40 -> "Arriving now"
            left < 1000 -> "${(left / 10).roundToInt() * 10} m away"
            else -> "%.1f km away".format(left / 1000)
        }
    }
}

private class FetchState {
    var at = 0L
    var to: GeoPoint? = null
}

/**
 * The road from the rider (from the store before the rider's phone shares a
 * position) to the door. It is fetched once, then only trimmed as the rider
 * moves, so the part already ridden disappears at every tick. It is fetched
 * again only if the rider leaves the road (a detour) or the first try failed.
 */
@Composable
fun rememberRouteProgress(order: Order?, rider: DriverLiveTracking?): RouteProgress {
    val destination = order?.deliveryAddress?.let { GeoPoint(it.latitude, it.longitude) }
    // No road and no rider until a rider is assigned and their position is in:
    // a route drawn from the store before that was wrong as soon as it came.
    val riderPoint = rider?.let { GeoPoint(it.lat, it.lng) }
    val start = riderPoint

    var full by remember { mutableStateOf<List<GeoPoint>>(emptyList()) }
    var isRoad by remember { mutableStateOf(false) }
    var total by remember { mutableStateOf<Double?>(null) }
    val fetch = remember { FetchState() }

    LaunchedEffect(start?.latitude, start?.longitude, destination?.latitude, destination?.longitude) {
        val to = destination ?: return@LaunchedEffect
        val start = start ?: return@LaunchedEffect
        val now = SystemClock.elapsedRealtime()
        val needs = when {
            full.size < 2 || fetch.to != to -> true
            !isRoad -> now - fetch.at > 12_000            // the first try failed: try again
            else -> {
                val onRoad = nearestOnPath(full, start)
                onRoad == null || (onRoad.meters > SNAP_METERS && now - fetch.at > 6_000) // left the road
            }
        }
        if (!needs) return@LaunchedEffect
        fetch.at = now
        fetch.to = to
        val road = fetchRoadRoute(start, to)
        if (road != null && road.size > 1) {
            full = road
            isRoad = true
            total = max(total ?: 0.0, pathLength(road))
        } else if (full.size < 2 || !isRoad) {
            // No road yet: a straight line stands in, but never over a road found earlier.
            full = listOf(start, to)
            isRoad = false
        }
    }

    val riding = isRoad && riderPoint != null
    val onRoad = if (riding) nearestOnPath(full, riderPoint!!) else null
    val snapped = onRoad?.takeIf { it.meters <= SNAP_METERS }
    val path = when {
        riderPoint == null -> emptyList()
        riding -> trimToRider(full, riderPoint)
        else -> full
    }
    val roadBearing = snapped?.let { on -> bearingDegrees(full[on.index], full[on.index + 1]) }
    val remaining = when {
        path.size < 2 -> null
        isRoad -> pathLength(path)
        else -> pathLength(path) * 1.3   // as the crow flies, plus the bends
    }
    return RouteProgress(path, isRoad, remaining, total, snapped?.point ?: riderPoint, roadBearing)
}

/** Added to every live arrival time the shopper sees. */
const val SHOWN_MARGIN_MINUTES = 4

/** How far off the road a fix can be and still count as on it. */
private const val SNAP_METERS = 45.0

private fun bearingDegrees(a: GeoPoint, b: GeoPoint): Double {
    val lat1 = Math.toRadians(a.latitude)
    val lat2 = Math.toRadians(b.latitude)
    val dLon = Math.toRadians(b.longitude - a.longitude)
    val y = kotlin.math.sin(dLon) * cos(lat2)
    val x = cos(lat1) * kotlin.math.sin(lat2) - kotlin.math.sin(lat1) * cos(lat2) * cos(dLon)
    return (Math.toDegrees(kotlin.math.atan2(y, x)) + 360) % 360
}

/** Equirectangular metres from [origin], good to a few centimetres over a town. */
private fun toMeters(origin: GeoPoint, p: GeoPoint): Pair<Double, Double> {
    val x = (p.longitude - origin.longitude) * cos(origin.latitude * PI / 180) * 111_320.0
    val y = (p.latitude - origin.latitude) * 110_540.0
    return x to y
}

private class OnPath(val index: Int, val point: GeoPoint, val meters: Double)

/** The closest point of the road to [p]: which segment, where on it, and how far off. */
private fun nearestOnPath(path: List<GeoPoint>, p: GeoPoint): OnPath? {
    if (path.size < 2) return null
    var best: OnPath? = null
    for (i in 0 until path.size - 1) {
        val a = toMeters(p, path[i])
        val b = toMeters(p, path[i + 1])
        val dx = b.first - a.first
        val dy = b.second - a.second
        val len2 = dx * dx + dy * dy
        val t = if (len2 == 0.0) 0.0 else ((-a.first * dx + -a.second * dy) / len2).coerceIn(0.0, 1.0)
        val cx = a.first + t * dx
        val cy = a.second + t * dy
        val d = sqrt(cx * cx + cy * cy)
        if (best == null || d < best.meters) {
            best = OnPath(
                i,
                GeoPoint(
                    path[i].latitude + (path[i + 1].latitude - path[i].latitude) * t,
                    path[i].longitude + (path[i + 1].longitude - path[i].longitude) * t
                ),
                d
            )
        }
    }
    return best
}

/** The road from the rider's place on it to the end; what is behind is gone. */
private fun trimToRider(path: List<GeoPoint>, rider: GeoPoint): List<GeoPoint> {
    val on = nearestOnPath(path, rider) ?: return path
    return listOf(on.point) + path.subList(on.index + 1, path.size)
}

private fun pathLength(path: List<GeoPoint>): Double {
    var sum = 0.0
    for (i in 0 until path.size - 1) sum += path[i].distanceToAsDouble(path[i + 1])
    return sum
}
