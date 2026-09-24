package com.dashit.app.ui.orders

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas as AndroidCanvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Paint
import android.graphics.drawable.BitmapDrawable
import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.model.Order
import com.dashit.app.data.model.OrderStatus
import com.dashit.app.data.repository.OrderRepository
import kotlinx.coroutines.delay
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline
import java.io.File

/**
 * Real turn-by-turn road route coordinates in Lal Chowk / Anantnag.
 * Sourced via Open Source Routing Machine (OSRM) on OpenStreetMap street vectors.
 */
private val OSM_ROUTE_POINTS = listOf(
    GeoPoint(33.735831, 75.143615), // DASHit Express Dark Store Hub (Lal Chowk)
    GeoPoint(33.735549, 75.143378),
    GeoPoint(33.736326, 75.142130),
    GeoPoint(33.736469, 75.141834),
    GeoPoint(33.736801, 75.140695),
    GeoPoint(33.736988, 75.140087),
    GeoPoint(33.737115, 75.139659),
    GeoPoint(33.737181, 75.139437),
    GeoPoint(33.737376, 75.138723),
    GeoPoint(33.737622, 75.137863),
    GeoPoint(33.737722, 75.137507),
    GeoPoint(33.737900, 75.136839),
    GeoPoint(33.738005, 75.136470),
    GeoPoint(33.738131, 75.136116),
    GeoPoint(33.738202, 75.136081),
    GeoPoint(33.738852, 75.135876),
    GeoPoint(33.738950, 75.135920),
    GeoPoint(33.738959, 75.135906),
    GeoPoint(33.738973, 75.135899),
    GeoPoint(33.738988, 75.135898),
    GeoPoint(33.738998, 75.135904),
    GeoPoint(33.739010, 75.135914),
    GeoPoint(33.739015, 75.135928),
    GeoPoint(33.739017, 75.135943),
    GeoPoint(33.739014, 75.135958),
    GeoPoint(33.739006, 75.135972),
    GeoPoint(33.738994, 75.135981),
    GeoPoint(33.738980, 75.135984),
    GeoPoint(33.738964, 75.136061),
    GeoPoint(33.738968, 75.136151),
    GeoPoint(33.738971, 75.136258),
    GeoPoint(33.738977, 75.136399),
    GeoPoint(33.739036, 75.136725),
    GeoPoint(33.739118, 75.137165),
    GeoPoint(33.739125, 75.137299),
    GeoPoint(33.739125, 75.137418),
    GeoPoint(33.739125, 75.137589),
    GeoPoint(33.739067, 75.137989),
    GeoPoint(33.739032, 75.138249),
    GeoPoint(33.738985, 75.138622),
    GeoPoint(33.738945, 75.138936),
    GeoPoint(33.738802, 75.139966),
    GeoPoint(33.738679, 75.141003),
    GeoPoint(33.738592, 75.141726),
    GeoPoint(33.738465, 75.142538),
    GeoPoint(33.738441, 75.142664),
    GeoPoint(33.738380, 75.143056),
    GeoPoint(33.738355, 75.143290),
    GeoPoint(33.738178, 75.144684),
    GeoPoint(33.737999, 75.146084),
    GeoPoint(33.737829, 75.147420),
    GeoPoint(33.737718, 75.148432),
    GeoPoint(33.737573, 75.149537),
    GeoPoint(33.737404, 75.150938),
    GeoPoint(33.737185, 75.152396),
    GeoPoint(33.736960, 75.153738),
    GeoPoint(33.736928, 75.153929),
    GeoPoint(33.736695, 75.155374),
    GeoPoint(33.736474, 75.157089),
    GeoPoint(33.736898, 75.157168),
    GeoPoint(33.737090, 75.157194),
    GeoPoint(33.737503, 75.157117),
    GeoPoint(33.737420, 75.156586),
    GeoPoint(33.737815, 75.156505),
    GeoPoint(33.737951, 75.156607),
    GeoPoint(33.738058, 75.156704),
    GeoPoint(33.738515, 75.156627)  // Customer Delivery Destination (Court Road)
)

private fun getRiderGeoPoint(progress: Float): GeoPoint {
    val totalPoints = OSM_ROUTE_POINTS.size
    if (totalPoints < 2) return OSM_ROUTE_POINTS.first()
    val scaled = (progress.coerceIn(0f, 1f) * (totalPoints - 1))
    val index = scaled.toInt().coerceIn(0, totalPoints - 2)
    val fraction = (scaled - index).toDouble()
    val p1 = OSM_ROUTE_POINTS[index]
    val p2 = OSM_ROUTE_POINTS[index + 1]
    return GeoPoint(
        p1.latitude + (p2.latitude - p1.latitude) * fraction,
        p1.longitude + (p2.longitude - p1.longitude) * fraction
    )
}

@Composable
fun LiveTrackingMapScreen(
    initialOrder: Order,
    orderRepo: OrderRepository = OrderRepository.shared,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val view = LocalView.current
    val lifecycleOwner = LocalLifecycleOwner.current

    val orders by orderRepo.orders.collectAsState()
    val activeOrder = orders.firstOrNull { it.id == initialOrder.id } ?: initialOrder

    var cancelTimerSeconds by remember { mutableIntStateOf(58) }
    LaunchedEffect(Unit) {
        while (cancelTimerSeconds > 0) {
            delay(1000)
            cancelTimerSeconds--
        }
    }

    // Smooth rider progression
    val infiniteTransition = rememberInfiniteTransition(label = "rider_movement")
    val simulatedProgress by infiniteTransition.animateFloat(
        initialValue = 0.20f,
        targetValue = 0.95f,
        animationSpec = infiniteRepeatable(
            animation = tween(28000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rider_drive"
    )
    val effectiveProgress = activeOrder.tracking?.progress?.toFloat() ?: simulatedProgress

    // OpenStreetMap view reference & tile mode state
    var osmMapView by remember { mutableStateOf<MapView?>(null) }
    var riderMarkerRef by remember { mutableStateOf<Marker?>(null) }
    var isDarkModeMap by remember { mutableStateOf(false) }

    // Manage MapView lifecycle
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_RESUME -> osmMapView?.onResume()
                Lifecycle.Event.ON_PAUSE -> osmMapView?.onPause()
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            osmMapView?.onDetach()
        }
    }

    BackHandler {
        onBack()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF10131A))
    ) {
        // 1. Real OpenStreetMap Native MapView
        AndroidView(
            factory = { ctx ->
                val config = Configuration.getInstance()
                config.load(ctx, ctx.getSharedPreferences("osmdroid", Context.MODE_PRIVATE))
                config.userAgentValue = "DASHit-Android-OpenStreetMap/1.1"
                config.osmdroidBasePath = File(ctx.cacheDir, "osmdroid")
                config.osmdroidTileCache = File(ctx.cacheDir, "osmdroid/tiles")

                MapView(ctx).apply {
                    setTileSource(TileSourceFactory.MAPNIK) // Authentic OpenStreetMap tiles from tile.openstreetmap.org
                    setMultiTouchControls(true)
                    isTilesScaledToDpi = true
                    zoomController.setVisibility(org.osmdroid.views.CustomZoomButtonsController.Visibility.NEVER)

                    // Position over Anantnag delivery route
                    controller.setZoom(15.8)
                    // Offset center slightly south so route remains visible above bottom sheet
                    controller.setCenter(GeoPoint(33.7362, 75.1495))

                    // Road Route Glow Underlay
                    val routeGlow = Polyline(this).apply {
                        outlinePaint.color = android.graphics.Color.parseColor("#440C831F")
                        outlinePaint.strokeWidth = 24f
                        outlinePaint.strokeCap = Paint.Cap.ROUND
                        outlinePaint.strokeJoin = Paint.Join.ROUND
                        setPoints(OSM_ROUTE_POINTS)
                    }
                    overlays.add(routeGlow)

                    // Road Route Vibrant Polyline
                    val routeLine = Polyline(this).apply {
                        outlinePaint.color = android.graphics.Color.parseColor("#0C831F")
                        outlinePaint.strokeWidth = 12f
                        outlinePaint.strokeCap = Paint.Cap.ROUND
                        outlinePaint.strokeJoin = Paint.Join.ROUND
                        setPoints(OSM_ROUTE_POINTS)
                    }
                    overlays.add(routeLine)

                    // Dark Store Hub Marker
                    val hubMarker = Marker(this).apply {
                        position = OSM_ROUTE_POINTS.first()
                        setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                        title = "DASHit Express Hub (Lal Chowk)"
                        icon = createHubMarkerDrawable(ctx)
                    }
                    overlays.add(hubMarker)

                    // Delivery Destination Pin Marker
                    val homeMarker = Marker(this).apply {
                        position = OSM_ROUTE_POINTS.last()
                        setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                        title = "Delivery Location (Home)"
                        icon = createHomeMarkerDrawable(ctx)
                    }
                    overlays.add(homeMarker)

                    // Live Moving Delivery Rider Marker
                    val riderMarker = Marker(this).apply {
                        position = getRiderGeoPoint(effectiveProgress)
                        setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                        title = "Tariq Ahmad • Delivery Partner"
                        icon = createRiderMarkerDrawable(ctx)
                    }
                    overlays.add(riderMarker)
                    riderMarkerRef = riderMarker

                    osmMapView = this
                }
            },
            update = { mapView ->
                // Apply optional dark mode matrix or keep pure OpenStreetMap colors
                if (isDarkModeMap) {
                    val nightMatrix = ColorMatrix(
                        floatArrayOf(
                            -0.80f, 0f, 0f, 0f, 240f,
                            0f, -0.80f, 0f, 0f, 240f,
                            0f, 0f, -0.80f, 0f, 240f,
                            0f, 0f, 0f, 1f, 0f
                        )
                    )
                    mapView.overlayManager.tilesOverlay.setColorFilter(ColorMatrixColorFilter(nightMatrix))
                } else {
                    mapView.overlayManager.tilesOverlay.setColorFilter(null)
                }

                // Smoothly update rider marker coordinates as delivery advances
                val currentRiderPos = getRiderGeoPoint(effectiveProgress)
                riderMarkerRef?.position = currentRiderPos
                mapView.invalidate()
            },
            modifier = Modifier.fillMaxSize()
        )

        // 2. OpenStreetMap License Attribution Chip (Top-right of map)
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .statusBarsPadding()
                .padding(top = 64.dp, end = 16.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(Color.Black.copy(alpha = 0.65f))
                .padding(horizontal = 8.dp, vertical = 4.dp)
        ) {
            Text(
                text = "© OpenStreetMap",
                color = Color.White.copy(alpha = 0.85f),
                fontSize = 10.sp,
                fontWeight = FontWeight.Medium
            )
        }

        // 3. Top Navigation Bar (Glassmorphic)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Circular Back Button
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF181C26).copy(alpha = 0.94f))
                    .border(1.dp, DashitColors.HairlineStrong, CircleShape)
                    .pressable(scale = 0.90f) {
                        HapticsManager.light(view)
                        onBack()
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }

            // Center Order Status Pill
            Box(
                modifier = Modifier
                    .clip(CircleShape)
                    .background(Color(0xFF141720).copy(alpha = 0.94f))
                    .border(1.dp, DashitColors.Hairline, CircleShape)
                    .padding(horizontal = 14.dp, vertical = 7.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(7.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(DashitColors.Positive)
                    )
                    Text(
                        text = "Order #${activeOrder.id.takeLast(6)}",
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Help / Support Button
            Box(
                modifier = Modifier
                    .clip(CircleShape)
                    .background(Color(0xFF181C26).copy(alpha = 0.94f))
                    .border(1.dp, DashitColors.HairlineStrong, CircleShape)
                    .padding(horizontal = 13.dp, vertical = 7.dp)
                    .pressable(scale = 0.92f) {
                        HapticsManager.selection(view)
                    }
            ) {
                Text(
                    text = "Help",
                    color = DashitColors.TextPrimary,
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        // 4. Floating Map Action Buttons (Top-Right under Nav Bar)
        Column(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .statusBarsPadding()
                .padding(top = 96.dp, end = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Map Tile Style Toggle: OSM Standard vs Night OSM
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF1A1F2C).copy(alpha = 0.95f))
                    .border(1.dp, DashitColors.HairlineStrong, CircleShape)
                    .pressable(scale = 0.90f) {
                        HapticsManager.selection(view)
                        isDarkModeMap = !isDarkModeMap
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isDarkModeMap) Icons.Default.LightMode else Icons.Default.DarkMode,
                    contentDescription = "Toggle Map Theme",
                    tint = DashitColors.FestiveGold,
                    modifier = Modifier.size(20.dp)
                )
            }

            // Zoom In
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF1A1F2C).copy(alpha = 0.95f))
                    .border(1.dp, DashitColors.HairlineStrong, CircleShape)
                    .pressable(scale = 0.90f) {
                        HapticsManager.light(view)
                        osmMapView?.controller?.zoomIn()
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = "Zoom In",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }

            // Zoom Out
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF1A1F2C).copy(alpha = 0.95f))
                    .border(1.dp, DashitColors.HairlineStrong, CircleShape)
                    .pressable(scale = 0.90f) {
                        HapticsManager.light(view)
                        osmMapView?.controller?.zoomOut()
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Remove,
                    contentDescription = "Zoom Out",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }

            // Re-center on Rider
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF1A1F2C).copy(alpha = 0.95f))
                    .border(1.dp, DashitColors.HairlineStrong, CircleShape)
                    .pressable(scale = 0.90f) {
                        HapticsManager.light(view)
                        val riderPoint = getRiderGeoPoint(effectiveProgress)
                        osmMapView?.controller?.animateTo(riderPoint)
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.MyLocation,
                    contentDescription = "Center on Rider",
                    tint = DashitColors.BlinkitGreen,
                    modifier = Modifier.size(20.dp)
                )
            }
        }

        // 5. Floating Bottom Delivery Card
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(Color(0xFF161A23))
                .border(1.dp, DashitColors.HairlineStrong, RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 18.dp)
                .navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Drag handle
            Box(
                modifier = Modifier
                    .size(width = 38.dp, height = 4.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF384054))
                    .align(Alignment.CenterHorizontally)
            )

            // ETA Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(end = 12.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Timer,
                            contentDescription = null,
                            tint = DashitColors.BlinkitGreen,
                            modifier = Modifier.size(22.dp)
                        )
                        Text(
                            text = "Arriving in ${activeOrder.etaMinutes ?: 8} mins",
                            color = Color.White,
                            fontSize = 21.sp,
                            fontWeight = FontWeight.Black
                        )
                    }

                    Text(
                        text = activeOrder.tracking?.statusText ?: "Partner on route • 1.2 km away",
                        color = DashitColors.TextSecondary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(top = 2.dp),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                // Delivery PIN Badge
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF222836))
                        .border(1.dp, Color(0xFF384258), RoundedCornerShape(12.dp))
                        .padding(horizontal = 14.dp, vertical = 7.dp)
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "DELIVERY PIN",
                            color = DashitColors.TextMuted,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.8.sp,
                            maxLines = 1,
                            softWrap = false
                        )
                        Text(
                            text = "4821",
                            color = DashitColors.FestiveGold,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            maxLines = 1,
                            softWrap = false
                        )
                    }
                }
            }

            // 4-Stage Stepper Rail
            OrderTrackingStepper(status = activeOrder.status)

            // Rider Contact & Vehicle Card
            RiderContactCard(
                driverName = activeOrder.driverName ?: "Tariq Ahmad",
                driverPhone = activeOrder.driverPhone ?: "+91 94190 12345"
            )

            // 60-second Cancellation Window Notice
            if (cancelTimerSeconds > 0) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF241E10))
                        .border(1.dp, Color(0xFF6B4E12), RoundedCornerShape(12.dp))
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(text = "⏱️", fontSize = 16.sp)
                        Text(
                            text = "Free cancellation / items addition: ${cancelTimerSeconds}s left",
                            color = Color(0xFFFFD466),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Text(
                        text = "Modify",
                        color = Color(0xFFFFB703),
                        fontSize = 12.5.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.pressable(scale = 0.94f) {
                            HapticsManager.light(view)
                        }
                    )
                }
            }

            // Order Items Summary Accordion
            OrderItemsMiniPreview(order = activeOrder)
        }
    }
}

// Custom High-DPI Marker Generators for OpenStreetMap
private fun createHubMarkerDrawable(context: Context): BitmapDrawable {
    val size = (46 * context.resources.displayMetrics.density).toInt()
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = AndroidCanvas(bitmap)

    val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.parseColor("#44F59E0B")
        style = Paint.Style.FILL
    }
    canvas.drawCircle(size / 2f, size / 2f, size / 2f, glowPaint)

    val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.parseColor("#18140E")
        style = Paint.Style.FILL
    }
    canvas.drawCircle(size / 2f, size / 2f, size * 0.38f, bgPaint)

    val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.parseColor("#F59E0B")
        style = Paint.Style.STROKE
        strokeWidth = 3f * context.resources.displayMetrics.density
    }
    canvas.drawCircle(size / 2f, size / 2f, size * 0.38f, strokePaint)

    val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textSize = 18f * context.resources.displayMetrics.density
        textAlign = Paint.Align.CENTER
    }
    val yPos = (size / 2f - (textPaint.descent() + textPaint.ascent()) / 2f)
    canvas.drawText("🏬", size / 2f, yPos, textPaint)

    return BitmapDrawable(context.resources, bitmap)
}

private fun createHomeMarkerDrawable(context: Context): BitmapDrawable {
    val size = (46 * context.resources.displayMetrics.density).toInt()
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = AndroidCanvas(bitmap)

    val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.parseColor("#44FF6F00")
        style = Paint.Style.FILL
    }
    canvas.drawCircle(size / 2f, size / 2f, size / 2f, glowPaint)

    val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.parseColor("#221206")
        style = Paint.Style.FILL
    }
    canvas.drawCircle(size / 2f, size / 2f, size * 0.38f, bgPaint)

    val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.parseColor("#FF6F00")
        style = Paint.Style.STROKE
        strokeWidth = 3f * context.resources.displayMetrics.density
    }
    canvas.drawCircle(size / 2f, size / 2f, size * 0.38f, strokePaint)

    val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textSize = 18f * context.resources.displayMetrics.density
        textAlign = Paint.Align.CENTER
    }
    val yPos = (size / 2f - (textPaint.descent() + textPaint.ascent()) / 2f)
    canvas.drawText("🏠", size / 2f, yPos, textPaint)

    return BitmapDrawable(context.resources, bitmap)
}

private fun createRiderMarkerDrawable(context: Context): BitmapDrawable {
    val size = (52 * context.resources.displayMetrics.density).toInt()
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = AndroidCanvas(bitmap)

    val pulsePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.parseColor("#440C831F")
        style = Paint.Style.FILL
    }
    canvas.drawCircle(size / 2f, size / 2f, size / 2f, pulsePaint)

    val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.parseColor("#0C831F")
        style = Paint.Style.FILL
    }
    canvas.drawCircle(size / 2f, size / 2f, size * 0.38f, bgPaint)

    val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.WHITE
        style = Paint.Style.STROKE
        strokeWidth = 2.5f * context.resources.displayMetrics.density
    }
    canvas.drawCircle(size / 2f, size / 2f, size * 0.38f, strokePaint)

    val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textSize = 18f * context.resources.displayMetrics.density
        textAlign = Paint.Align.CENTER
    }
    val yPos = (size / 2f - (textPaint.descent() + textPaint.ascent()) / 2f)
    canvas.drawText("🛵", size / 2f, yPos, textPaint)

    return BitmapDrawable(context.resources, bitmap)
}

@Composable
private fun OrderTrackingStepper(status: OrderStatus) {
    val steps = listOf(
        "Order Placed",
        "Packing",
        "On the Way",
        "Delivered"
    )

    val currentStepIndex = when (status) {
        OrderStatus.PLACED -> 0
        OrderStatus.PACKING -> 1
        OrderStatus.OUT_FOR_DELIVERY -> 2
        OrderStatus.DELIVERED -> 3
        OrderStatus.CANCELLED -> 0
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        steps.forEachIndexed { index, title ->
            val isCompleted = index <= currentStepIndex
            val isActive = index == currentStepIndex

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp),
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(
                            when {
                                isCompleted -> DashitColors.BlinkitGreen
                                else -> Color(0xFF262C3A)
                            }
                        )
                        .border(
                            1.dp,
                            if (isActive) Color.White else Color.Transparent,
                            CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (isCompleted) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(13.dp)
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(DashitColors.TextMuted)
                        )
                    }
                }

                Text(
                    text = title,
                    color = if (isCompleted) Color.White else DashitColors.TextMuted,
                    fontSize = 10.5.sp,
                    fontWeight = if (isActive) FontWeight.Bold else FontWeight.Medium,
                    textAlign = TextAlign.Center
                )
            }

            // Connector line between steps
            if (index < steps.size - 1) {
                Box(
                    modifier = Modifier
                        .height(2.dp)
                        .weight(0.6f)
                        .offset(y = (-10).dp)
                        .background(
                            if (index < currentStepIndex) DashitColors.BlinkitGreen
                            else Color(0xFF262C3A)
                        )
                )
            }
        }
    }
}

@Composable
private fun RiderContactCard(driverName: String, driverPhone: String) {
    val view = LocalView.current
    val cardShape = RoundedCornerShape(16.dp)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(cardShape)
            .background(Color(0xFF1E232F))
            .border(1.dp, DashitColors.Hairline, cardShape)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Rider Avatar
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF2A3142)),
                contentAlignment = Alignment.Center
            ) {
                Text(text = "🛵", fontSize = 22.sp)
            }

            Column {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = driverName,
                        color = Color.White,
                        fontSize = 14.5.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Icon(
                        imageVector = Icons.Default.Shield,
                        contentDescription = "Verified Delivery Partner",
                        tint = DashitColors.Positive,
                        modifier = Modifier.size(14.dp)
                    )
                }

                Text(
                    text = "Hero Electric • 4.9 ★ (1,420 orders)",
                    color = DashitColors.TextMuted,
                    fontSize = 11.5.sp
                )
            }
        }

        // Call & Message Action Buttons
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            // Message Button
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF272E3E))
                    .pressable(scale = 0.90f) {
                        HapticsManager.light(view)
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Message,
                    contentDescription = "Message Rider",
                    tint = Color.White,
                    modifier = Modifier.size(17.dp)
                )
            }

            // Call Button
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(DashitColors.BlinkitGreen)
                    .pressable(scale = 0.90f) {
                        HapticsManager.medium(view)
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Call,
                    contentDescription = "Call Rider",
                    tint = Color.White,
                    modifier = Modifier.size(17.dp)
                )
            }
        }
    }
}

@Composable
private fun OrderItemsMiniPreview(order: Order) {
    val cardShape = RoundedCornerShape(14.dp)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(cardShape)
            .background(Color(0xFF191D27))
            .border(1.dp, DashitColors.Hairline, cardShape)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "${order.items.sumOf { it.qty }} items ordered",
                color = DashitColors.TextPrimary,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold
            )

            Text(
                text = "₹${order.grandTotal.toInt()}",
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Black
            )
        }

        // Thumbnails of items
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            order.items.take(4).forEach { item ->
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(item.img)
                        .crossfade(200)
                        .build(),
                    contentDescription = item.name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(38.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFF282F3E))
                )
            }

            if (order.items.size > 4) {
                Text(
                    text = "+${order.items.size - 4} more",
                    color = DashitColors.TextMuted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}
