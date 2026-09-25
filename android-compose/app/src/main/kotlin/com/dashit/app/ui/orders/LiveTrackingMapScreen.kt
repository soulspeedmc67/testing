package com.dashit.app.ui.orders

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.DashPathEffect
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.drawable.BitmapDrawable
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.dashit.app.R
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.ui.components.TrackingCardSkeleton
import com.dashit.app.data.DeliveryEta
import com.dashit.app.data.model.DriverLiveTracking
import com.dashit.app.data.model.Order
import com.dashit.app.data.model.OrderStatus
import com.dashit.app.data.model.Product
import com.dashit.app.data.repository.OrderRepository
import com.dashit.app.viewmodel.CartViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.BoundingBox
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

private val HUB = GeoPoint(DeliveryEta.HUB_LAT, DeliveryEta.HUB_LNG)

/**
 * Live tracking for an order, in the iOS app's layout: the map fills the
 * screen with the rider coming along the roads, a back button and the
 * change-window countdown on top, and the dark order card at the bottom with
 * the ETA, the stage rail, the delivery code and, while it still can, the
 * option to add items or cancel.
 */
@Composable
fun LiveTrackingMapScreen(
    orderId: String,
    products: List<Product>,
    onBack: () -> Unit,
    orderRepo: OrderRepository = OrderRepository.shared
) {
    val view = LocalView.current
    val scope = rememberCoroutineScope()
    var shownId by remember { mutableStateOf(orderId) }
    val orders by orderRepo.orders.collectAsState()
    val tracking by orderRepo.liveTracking.collectAsState()
    val order = orders.firstOrNull { it.id == shownId }
    // Only the active order has a tracking feed; don't show another order's rider.
    val rider = tracking?.takeIf { order != null && orderRepo.activeOrder.value?.id == order.id }

    var isCancelSheetOpen by remember { mutableStateOf(false) }
    var isAddItemsOpen by remember { mutableStateOf(false) }
    var isCancelling by remember { mutableStateOf(false) }
    var cancelError by remember { mutableStateOf<String?>(null) }

    BackHandler { onBack() }

    Box(modifier = Modifier.fillMaxSize().background(DashitColors.SurfaceSunken)) {
        TrackingMap(order = order, rider = rider)

        // Back button and the change-window countdown
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.72f))
                    .pressable(scale = 0.9f) { onBack() }
                    .semantics { contentDescription = "Back" },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.weight(1f))
            if (order != null) {
                val seconds = rememberModifySecondsRemaining(order)
                AnimatedVisibility(visible = seconds > 0, enter = fadeIn() + scaleIn(initialScale = 0.9f), exit = fadeOut() + scaleOut(targetScale = 0.9f)) {
                    Row(
                        modifier = Modifier
                            .height(38.dp)
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.78f))
                            .padding(horizontal = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        ModifyCountdownBadge(order)
                        Text("to change", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }

        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(horizontal = 12.dp)
                .padding(bottom = 20.dp)
        ) {
            if (order == null) {
                // Never leave a bare map: the card's skeleton until the order loads.
                TrackingCardSkeleton()
            } else {
                OrderCard(
                    order = order,
                    rider = rider,
                    isCancelling = isCancelling,
                    cancelError = cancelError,
                    onCancel = {
                        HapticsManager.light(view)
                        isCancelSheetOpen = true
                    },
                    onAddItems = {
                        HapticsManager.light(view)
                        isAddItemsOpen = true
                    }
                )
            }
        }
    }

    if (isCancelSheetOpen && order != null) {
        fun cancel(restoreCart: Boolean) {
            isCancelSheetOpen = false
            isCancelling = true
            cancelError = null
            scope.launch {
                try {
                    orderRepo.cancelOrder(order.id)
                    if (restoreCart) CartViewModel.shared.reorder(order.items)
                    HapticsManager.success(view)
                    onBack()
                } catch (e: Exception) {
                    HapticsManager.error(view)
                    cancelError = "The store has already started on it, so it can't be cancelled now."
                } finally {
                    isCancelling = false
                }
            }
        }
        CancelOrderSheet(
            onCancelKeepItems = { cancel(restoreCart = true) },
            onCancel = { cancel(restoreCart = false) },
            onDismiss = { isCancelSheetOpen = false }
        )
    }

    if (isAddItemsOpen && order != null) {
        AddItemsSheet(
            order = order,
            products = products,
            onUpdated = { replacement ->
                shownId = replacement.id
                isAddItemsOpen = false
            },
            onDismiss = { isAddItemsOpen = false }
        )
    }
}

@Composable
private fun OrderCard(
    order: Order,
    rider: DriverLiveTracking?,
    isCancelling: Boolean,
    cancelError: String?,
    onCancel: () -> Unit,
    onAddItems: () -> Unit
) {
    val stage = order.status
    val seconds = rememberModifySecondsRemaining(order)
    val eta = rider?.etaMinutes ?: order.etaMinutes ?: 8
    val shape = RoundedCornerShape(24.dp)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(18.dp, shape, clip = false)
            .clip(shape)
            .background(DashitColors.TrackerCard)
            .border(1.dp, Color.White.copy(alpha = 0.1f), shape)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(stage.icon, contentDescription = null, tint = DashitColors.BrandAccent, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text(
                stage.headline(order.driverName),
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
            if (!stage.isFinished) {
                Text("ETA $eta MINS", color = DashitColors.BrandAccent, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold)
            }
        }

        val line = rider?.statusText?.takeIf { it.isNotBlank() } ?: rider?.distanceFormatted
        if (stage == OrderStatus.OUT_FOR_DELIVERY && line != null) {
            Text(line, color = Color.White.copy(alpha = 0.75f), fontSize = 13.sp, fontWeight = FontWeight.Medium)
        }

        OrderProgressRail(stage = stage, progress = stage.progress(rider?.progress))

        val code = order.otp
        if (!stage.isFinished && !code.isNullOrEmpty()) DeliveryCodeRow(code)

        AnimatedVisibility(visible = seconds > 0, enter = fadeIn() + expandVertically(), exit = fadeOut() + shrinkVertically()) {
            ChangeWindowRow(isCancelling = isCancelling, onCancel = onCancel, onAddItems = onAddItems)
        }
        cancelError?.let { Text(it, color = DashitColors.Danger, fontSize = 12.5.sp) }

        CardDivider()

        Row(verticalAlignment = Alignment.CenterVertically) {
            val units = order.itemCount
            Text(
                "$units item${if (units == 1) "" else "s"} • ₹${order.grandTotal.toInt()}",
                color = Color.White.copy(alpha = 0.6f),
                fontSize = 12.5.sp,
                modifier = Modifier.weight(1f)
            )
            Text("#${order.id.takeLast(6)}", color = Color.White.copy(alpha = 0.45f), fontSize = 12.sp, fontFamily = FontFamily.Monospace)
        }
    }
}

/** While the order can still change: add more items or cancel. */
@Composable
private fun ChangeWindowRow(isCancelling: Boolean, onCancel: () -> Unit, onAddItems: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White.copy(alpha = 0.06f))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text("Forgot something?", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
            Text("Add or cancel before packing", color = Color.White.copy(alpha = 0.6f), fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Text(
            if (isCancelling) "…" else "Cancel",
            color = DashitColors.Danger,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier
                .height(34.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.08f))
                .pressable(scale = 0.95f) { if (!isCancelling) onCancel() }
                .padding(horizontal = 12.dp, vertical = 8.dp)
        )
        Row(
            modifier = Modifier
                .height(34.dp)
                .clip(CircleShape)
                .background(DashitColors.BrandOrange)
                .pressable(scale = 0.95f, onClick = onAddItems)
                .padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Icon(Icons.Filled.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(15.dp))
            Text("Add items", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1)
        }
    }
}

// MARK: - Map

private class MapLayers {
    var map: MapView? = null
    var routeCasing: Polyline? = null
    var routeLine: Polyline? = null
    var destination: Marker? = null
    var rider: Marker? = null
    var riderSprite: String? = null
    var framed = false
    var routedFrom: GeoPoint? = null
    var routedTo: GeoPoint? = null
}

@Composable
private fun TrackingMap(order: Order?, rider: DriverLiveTracking?) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val layers = remember { MapLayers() }
    var route by remember { mutableStateOf<List<GeoPoint>>(emptyList()) }
    var isRoadRoute by remember { mutableStateOf(false) }

    val destination = order?.deliveryAddress?.let { GeoPoint(it.latitude, it.longitude) }
    val riderPoint = rider?.let { GeoPoint(it.lat, it.lng) }
    // The way the rider comes: from the rider while riding, from the hub before.
    val routeStart = riderPoint?.takeIf { order?.status == OrderStatus.OUT_FOR_DELIVERY } ?: HUB

    LaunchedEffect(routeStart.latitude, routeStart.longitude, destination?.latitude, destination?.longitude) {
        val to = destination ?: return@LaunchedEffect
        val from = routeStart
        // Re-route only when the rider has moved on by more than ~60 m.
        val lastFrom = layers.routedFrom
        if (lastFrom != null && layers.routedTo == to && lastFrom.distanceToAsDouble(from) < 60) return@LaunchedEffect
        layers.routedFrom = from
        layers.routedTo = to
        val road = fetchRoadRoute(from, to)
        if (road != null && road.size > 1) {
            route = road
            isRoadRoute = true
        } else {
            route = listOf(from, to)
            isRoadRoute = false
        }
    }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_RESUME -> layers.map?.onResume()
                Lifecycle.Event.ON_PAUSE -> layers.map?.onPause()
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            layers.map?.onDetach()
        }
    }

    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            val config = Configuration.getInstance()
            config.load(ctx, ctx.getSharedPreferences("osmdroid", Context.MODE_PRIVATE))
            config.userAgentValue = "DASHit-App/1.0 (https://dashit.in; support@dashit.in)"
            val basePath = File(ctx.cacheDir, "osmdroid").apply { mkdirs() }
            config.osmdroidBasePath = basePath
            config.osmdroidTileCache = File(basePath, "tiles").apply { mkdirs() }

            MapView(ctx).apply {
                setTileSource(TileSourceFactory.MAPNIK)
                setMultiTouchControls(true)
                isTilesScaledToDpi = true
                minZoomLevel = 11.0
                maxZoomLevel = 19.0
                zoomController.setVisibility(org.osmdroid.views.CustomZoomButtonsController.Visibility.NEVER)
                // The app is dark, so the map is too: OpenStreetMap's tiles, inverted with their hues kept.
                overlayManager.tilesOverlay.setColorFilter(darkMapFilter())
                overlayManager.tilesOverlay.setLoadingBackgroundColor(android.graphics.Color.parseColor("#0B0B0E"))
                overlayManager.tilesOverlay.setLoadingLineColor(android.graphics.Color.parseColor("#151519"))
                controller.setZoom(15.0)
                controller.setCenter(HUB)

                val casing = Polyline(this).apply {
                    outlinePaint.color = android.graphics.Color.argb(90, 0, 0, 0)
                    outlinePaint.strokeWidth = dp(ctx, 9f)
                    outlinePaint.strokeCap = Paint.Cap.ROUND
                    outlinePaint.strokeJoin = Paint.Join.ROUND
                }
                val line = Polyline(this).apply {
                    outlinePaint.color = android.graphics.Color.parseColor("#FF5B00")
                    outlinePaint.strokeWidth = dp(ctx, 5f)
                    outlinePaint.strokeCap = Paint.Cap.ROUND
                    outlinePaint.strokeJoin = Paint.Join.ROUND
                }
                overlays.add(casing)
                overlays.add(line)

                // Dark store the order is packed at, marked with the app icon.
                overlays.add(Marker(this).apply {
                    position = HUB
                    setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                    icon = BitmapDrawable(ctx.resources, hubMarkerBitmap(ctx))
                    title = "DASHit hub"
                    setInfoWindow(null)
                })
                val dest = Marker(this).apply {
                    setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                    icon = BitmapDrawable(ctx.resources, destinationMarkerBitmap(ctx))
                    title = "Delivery address"
                    setInfoWindow(null)
                }
                overlays.add(dest)
                val riderMarker = Marker(this).apply {
                    setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                    title = "Delivery partner"
                    setInfoWindow(null)
                    isEnabled = false
                }
                overlays.add(riderMarker)

                layers.map = this
                layers.routeCasing = casing
                layers.routeLine = line
                layers.destination = dest
                layers.rider = riderMarker
            }
        },
        update = { map ->
            val casing = layers.routeCasing
            val line = layers.routeLine
            if (route.size > 1) {
                casing?.setPoints(route)
                line?.setPoints(route)
                casing?.isEnabled = isRoadRoute
                line?.outlinePaint?.apply {
                    color = if (isRoadRoute) android.graphics.Color.parseColor("#FF5B00") else android.graphics.Color.argb(140, 255, 91, 0)
                    strokeWidth = dp(context, if (isRoadRoute) 5f else 3f)
                    pathEffect = if (isRoadRoute) null else DashPathEffect(floatArrayOf(dp(context, 4f), dp(context, 8f)), 0f)
                }
            }
            destination?.let { layers.destination?.position = it }
            layers.destination?.isEnabled = destination != null

            val riderMarker = layers.rider
            if (riderPoint != null && riderMarker != null) {
                val bearing = rider?.let { r -> r.heading?.takeIf { (r.speed ?: 0.0) > 0.5 } }
                    ?: destination?.let { bearing(riderPoint, it) }
                val sprite = riderSpriteName(bearing)
                if (sprite != layers.riderSprite) {
                    riderMarker.icon = BitmapDrawable(context.resources, riderMarkerBitmap(context, sprite))
                    layers.riderSprite = sprite
                }
                riderMarker.position = riderPoint
                riderMarker.isEnabled = true
            } else {
                riderMarker?.isEnabled = false
            }

            // Frame hub, rider and door once, leaving room for the card below.
            if (!layers.framed && destination != null && map.width > 0) {
                val points = listOfNotNull(HUB, destination, riderPoint)
                val box = BoundingBox.fromGeoPointsSafe(points)
                map.zoomToBoundingBox(box.increaseByScale(1.6f), false, dp(context, 48f).toInt())
                // Nudge the view down so the pins sit above the order card.
                map.controller.scrollBy(0, (map.height * 0.18).toInt())
                layers.framed = true
            }
            map.invalidate()
        }
    )
}

/** OSRM's road route between two points, or null when it can't be reached. */
private suspend fun fetchRoadRoute(from: GeoPoint, to: GeoPoint): List<GeoPoint>? = withContext(Dispatchers.IO) {
    try {
        val url = URL(
            "https://router.project-osrm.org/route/v1/driving/" +
                "${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson"
        )
        val connection = (url.openConnection() as HttpURLConnection).apply {
            connectTimeout = 6000
            readTimeout = 6000
            setRequestProperty("User-Agent", "DASHit-App/1.0 (https://dashit.in; support@dashit.in)")
        }
        connection.inputStream.bufferedReader().use { reader ->
            val json = JSONObject(reader.readText())
            val coordinates = json.getJSONArray("routes").getJSONObject(0)
                .getJSONObject("geometry").getJSONArray("coordinates")
            (0 until coordinates.length()).map { i ->
                val pair = coordinates.getJSONArray(i)
                GeoPoint(pair.getDouble(1), pair.getDouble(0))
            }
        }
    } catch (e: Exception) {
        null
    }
}

private fun bearing(a: GeoPoint, b: GeoPoint): Double {
    val lat1 = Math.toRadians(a.latitude)
    val lat2 = Math.toRadians(b.latitude)
    val dLon = Math.toRadians(b.longitude - a.longitude)
    val y = sin(dLon) * cos(lat2)
    val x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon)
    return Math.toDegrees(atan2(y, x))
}

/** The same eight-direction rider sprites as iOS, picked by bearing. */
private fun riderSpriteName(bearing: Double?): String {
    if (bearing == null) return "rider_map_live"
    val names = listOf("rider_back", "rider_back_right", "rider_right", "rider_front_right", "rider_front", "rider_front_left", "rider_left", "rider_back_left")
    val normalized = ((bearing % 360) + 360) % 360
    return names[((normalized + 22.5) / 45).toInt() % names.size]
}

private fun dp(context: Context, value: Float): Float = value * context.resources.displayMetrics.density

/** Inverts the tiles' lightness but keeps their hues, then dims them to the app's surface. */
private fun darkMapFilter(): ColorMatrixColorFilter {
    val invert = ColorMatrix(floatArrayOf(
        -1f, 0f, 0f, 0f, 255f,
        0f, -1f, 0f, 0f, 255f,
        0f, 0f, -1f, 0f, 255f,
        0f, 0f, 0f, 1f, 0f
    ))
    val hueRotate180 = ColorMatrix(floatArrayOf(
        -0.574f, 1.430f, 0.144f, 0f, 0f,
        0.426f, 0.430f, 0.144f, 0f, 0f,
        0.426f, 1.430f, -0.856f, 0f, 0f,
        0f, 0f, 0f, 1f, 0f
    ))
    val dim = ColorMatrix().apply { setScale(0.82f, 0.82f, 0.86f, 1f) }
    val desaturate = ColorMatrix().apply { setSaturation(0.55f) }
    return ColorMatrixColorFilter(invert.apply {
        postConcat(hueRotate180)
        postConcat(desaturate)
        postConcat(dim)
    })
}

/** The app icon as a rounded tile with a white edge, for the hub. */
private fun hubMarkerBitmap(context: Context): Bitmap {
    val size = dp(context, 34f).toInt()
    val tile = BitmapFactory.decodeResource(context.resources, R.drawable.brand_tile)
    val out = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(out)
    val radius = size * 0.27f
    val rect = RectF(0f, 0f, size.toFloat(), size.toFloat())
    val clip = Path().apply { addRoundRect(rect, radius, radius, Path.Direction.CW) }
    canvas.save()
    canvas.clipPath(clip)
    canvas.drawBitmap(Bitmap.createScaledBitmap(tile, size, size, true), 0f, 0f, Paint(Paint.FILTER_BITMAP_FLAG))
    canvas.restore()
    val stroke = dp(context, 2f)
    canvas.drawRoundRect(
        RectF(stroke / 2, stroke / 2, size - stroke / 2, size - stroke / 2), radius, radius,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = stroke; color = android.graphics.Color.WHITE }
    )
    return out
}

/** An orange pin with a house, for the delivery address. */
private fun destinationMarkerBitmap(context: Context): Bitmap {
    val d = context.resources.displayMetrics.density
    val w = (38 * d).toInt()
    val h = (52 * d).toInt()
    val out = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(out)
    val orange = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.parseColor("#FF5B00") }
    val white = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.WHITE }
    val cx = w / 2f
    val r = 19 * d
    // Pointer
    canvas.drawPath(Path().apply {
        moveTo(cx - 7 * d, 34 * d); lineTo(cx + 7 * d, 34 * d); lineTo(cx, 44 * d); close()
    }, orange)
    // Shadow under the tip
    canvas.drawOval(RectF(cx - 9 * d, 46 * d, cx + 9 * d, 50 * d), Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.argb(64, 0, 0, 0) })
    canvas.drawCircle(cx, r, r, white)
    canvas.drawCircle(cx, r, r - 3 * d, orange)
    // House glyph
    val house = Path().apply {
        moveTo(cx, r - 7 * d); lineTo(cx + 7 * d, r - 0.5f * d); lineTo(cx + 5 * d, r - 0.5f * d)
        lineTo(cx + 5 * d, r + 6 * d); lineTo(cx - 5 * d, r + 6 * d); lineTo(cx - 5 * d, r - 0.5f * d)
        lineTo(cx - 7 * d, r - 0.5f * d); close()
    }
    canvas.drawPath(house, white)
    return out
}

/** The rider sprite for a heading, over a soft orange halo and a ground shadow. */
private fun riderMarkerBitmap(context: Context, spriteName: String): Bitmap {
    val d = context.resources.displayMetrics.density
    val size = (80 * d).toInt()
    val out = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(out)
    val c = size / 2f
    canvas.drawCircle(c, c + 18 * d, 23 * d, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.argb(80, 255, 91, 0) })
    canvas.drawOval(RectF(c - 22 * d, c + 20 * d, c + 22 * d, c + 32 * d), Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.argb(70, 0, 0, 0) })
    val id = context.resources.getIdentifier(spriteName, "drawable", context.packageName)
    val sprite = if (id != 0) BitmapFactory.decodeResource(context.resources, id) else null
    if (sprite != null) {
        val targetH = 60 * d
        val targetW = sprite.width * targetH / sprite.height
        canvas.drawBitmap(
            sprite, null,
            RectF(c - targetW / 2, c - targetH / 2, c + targetW / 2, c + targetH / 2),
            Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
        )
    }
    return out
}
