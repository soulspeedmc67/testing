package com.dashit.app.ui.orders

import androidx.compose.animation.core.LinearOutSlowInEasing

import androidx.compose.animation.core.Animatable

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
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix as ComposeColorMatrix
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import coil.compose.AsyncImage
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

internal val HUB = GeoPoint(DeliveryEta.HUB_LAT, DeliveryEta.HUB_LNG)

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
    // The road still to cover, the time and distance left: kept up to date as the rider moves.
    val routeProgress = rememberRouteProgress(order, rider)

    var isCancelSheetOpen by remember { mutableStateOf(false) }
    var isAddItemsOpen by remember { mutableStateOf(false) }
    var isCancelling by remember { mutableStateOf(false) }
    var cancelError by remember { mutableStateOf<String?>(null) }

    BackHandler { onBack() }

    val openCancel = {
        HapticsManager.light(view)
        isCancelSheetOpen = true
    }
    val openAddItems = {
        HapticsManager.light(view)
        isAddItemsOpen = true
    }

    // The map only once a rider has the order: before that there's nothing to
    // follow, so received and packing get their own screens.
    val showsMap = order != null &&
        (order.status == OrderStatus.OUT_FOR_DELIVERY || order.status == OrderStatus.DELIVERED)

    if (!showsMap) {
        OrderStageScreen(
            order = order,
            isCancelling = isCancelling,
            cancelError = cancelError,
            onBack = onBack,
            onCancel = openCancel,
            onAddItems = openAddItems
        )
    } else Box(modifier = Modifier.fillMaxSize().background(DashitColors.SurfaceSunken)) {
        TrackingMap(order = order, rider = rider, progress = routeProgress)

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
                    routeProgress = routeProgress,
                    isCancelling = isCancelling,
                    cancelError = cancelError,
                    onCancel = openCancel,
                    onAddItems = openAddItems
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
                    com.dashit.app.data.Push.orderChanged(order.id)
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

/** Received and packing: what's happening now, the order card and the items. */
@Composable
private fun OrderStageScreen(
    order: Order?,
    isCancelling: Boolean,
    cancelError: String?,
    onBack: () -> Unit,
    onCancel: () -> Unit,
    onAddItems: () -> Unit
) {
    // One calm, dark screen for received and packing, like the iOS app.
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DashitColors.Midnight)
            .statusBarsPadding()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.1f))
                    .pressable(scale = 0.9f) { onBack() }
                    .semantics { contentDescription = "Back" },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.weight(1f))
            if (order != null) {
                Text(
                    "Order #${order.id.takeLast(6)}",
                    color = Color.White.copy(alpha = 0.55f),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    fontFamily = FontFamily.Monospace
                )
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

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .navigationBarsPadding()
                .padding(horizontal = 16.dp)
                .padding(top = 8.dp, bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(22.dp)
        ) {
            if (order == null) {
                Spacer(Modifier.height(40.dp))
                TrackingCardSkeleton()
            } else {
                val seconds = rememberModifySecondsRemaining(order)
                OrderStageHero(stage = order.status, canStillChange = seconds > 0, canAddItems = !order.isPaidOnline)
                OrderCard(
                    order = order,
                    rider = null,
                    routeProgress = RouteProgress(emptyList(), false, null, null),
                    isCancelling = isCancelling,
                    cancelError = cancelError,
                    onCancel = onCancel,
                    onAddItems = onAddItems
                )
                OrderItemsCard(order)
            }
        }
    }
}

/**
 * Top of the received and packing screens: a line-art icon that keeps
 * animating (a receipt filling in, then a box being packed) and what's
 * happening in plain words. Same icon and timing as the iOS app.
 */
@Composable
private fun OrderStageHero(stage: OrderStatus, canStillChange: Boolean, canAddItems: Boolean) {
    val (title, subtitle) = when (stage) {
        OrderStatus.PLACED -> "Order received" to when {
            canStillChange && canAddItems -> "You can still add items or cancel. Packing starts right after."
            canStillChange -> "You can still cancel. Packing starts right after."
            else -> "The store is getting your items ready."
        }
        OrderStatus.PACKING -> "Packing your order" to
            "Your items are being picked and packed. The map opens as soon as a rider is on the way."
        OrderStatus.CANCELLED -> "Order cancelled" to "This order won't be delivered."
        else -> stage.headline(null) to ""
    }
    val iconKind = when (stage) {
        OrderStatus.PLACED -> StageIconKind.RECEIVED
        OrderStatus.PACKING -> StageIconKind.PACKING
        else -> null
    }

    Column(modifier = Modifier.fillMaxWidth().padding(top = 6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(modifier = Modifier.size(168.dp), contentAlignment = Alignment.Center) {
            Crossfade(targetState = iconKind, animationSpec = tween(350), label = "stageIcon") { kind ->
                if (kind != null) {
                    OrderStageIcon(kind = kind, modifier = Modifier.fillMaxSize())
                } else {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Image(
                            painter = painterResource(R.drawable.brand_tile),
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            colorFilter = ColorFilter.colorMatrix(ComposeColorMatrix().apply { setToSaturation(0f) }),
                            modifier = Modifier.size(88.dp).clip(RoundedCornerShape(24.dp))
                        )
                    }
                }
            }
        }
        Spacer(Modifier.height(20.dp))
        Text(title, color = Color.White, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
        if (subtitle.isNotEmpty()) {
            Spacer(Modifier.height(8.dp))
            Text(
                subtitle,
                color = Color.White.copy(alpha = 0.65f),
                fontSize = 15.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 24.dp)
            )
        }
    }
}

@Composable
private fun OrderItemsCard(order: Order) {
    val shape = RoundedCornerShape(20.dp)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Color.White.copy(alpha = 0.06f))
            .border(1.dp, Color.White.copy(alpha = 0.08f), shape)
            .padding(16.dp)
    ) {
        Text(
            if (order.status == OrderStatus.PACKING) "Being packed" else "Your items",
            color = Color.White,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 6.dp)
        )
        order.items.forEachIndexed { index, item ->
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                AsyncImage(
                    model = item.img,
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .size(42.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color.White)
                        .padding(3.dp)
                )
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(item.name, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    Text("${item.unit} · ×${item.qty}", color = Color.White.copy(alpha = 0.55f), fontSize = 12.sp)
                }
                Spacer(Modifier.width(8.dp))
                Text("₹${(item.price * item.qty).toInt()}", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            }
            if (index < order.items.lastIndex) {
                Box(Modifier.fillMaxWidth().height(1.dp).background(Color.White.copy(alpha = 0.08f)))
            }
        }
    }
}

@Composable
private fun OrderCard(
    order: Order,
    rider: DriverLiveTracking?,
    routeProgress: RouteProgress,
    isCancelling: Boolean,
    cancelError: String?,
    onCancel: () -> Unit,
    onAddItems: () -> Unit
) {
    val stage = order.status
    val seconds = rememberModifySecondsRemaining(order)
    // Worked out from the road left, so it counts down as the rider moves.
    val eta = routeProgress.etaMinutes(rider?.speed) ?: rider?.etaMinutes ?: order.etaMinutes ?: 8
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
            // The arrival time only once a rider has the order and is on the way.
            if (stage == OrderStatus.OUT_FOR_DELIVERY) {
                Text("ETA $eta MINS", color = DashitColors.BrandAccent, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold)
            }
        }

        val line = routeProgress.distanceLine() ?: rider?.statusText?.takeIf { it.isNotBlank() } ?: rider?.distanceFormatted
        if (stage == OrderStatus.OUT_FOR_DELIVERY && line != null) {
            Text(line, color = Color.White.copy(alpha = 0.75f), fontSize = 13.sp, fontWeight = FontWeight.Medium)
        }

        OrderProgressRail(stage = stage, progress = stage.progress(routeProgress.percentDone ?: rider?.progress))

        val code = order.otp
        if (!stage.isFinished && !code.isNullOrEmpty()) DeliveryCodeRow(code)

        AnimatedVisibility(visible = seconds > 0, enter = fadeIn() + expandVertically(), exit = fadeOut() + shrinkVertically()) {
            ChangeWindowRow(
                isCancelling = isCancelling,
                onCancel = onCancel,
                onAddItems = onAddItems.takeUnless { order.isPaidOnline }
            )
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

/** While the order can still change: add more items or cancel. A paid order can only be cancelled. */
@Composable
private fun ChangeWindowRow(isCancelling: Boolean, onCancel: () -> Unit, onAddItems: (() -> Unit)?) {
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
            Text(
                if (onAddItems != null) "Forgot something?" else "Changed your mind?",
                color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1
            )
            Text(
                if (onAddItems != null) "Add or cancel before packing" else "Cancel before packing",
                color = Color.White.copy(alpha = 0.6f), fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis
            )
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
        if (onAddItems != null) {
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
private fun TrackingMap(order: Order?, rider: DriverLiveTracking?, progress: RouteProgress) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val layers = remember { MapLayers() }
    val route = progress.path
    val isRoadRoute = progress.isRoad

    val destination = order?.deliveryAddress?.let { GeoPoint(it.latitude, it.longitude) }
    // The rider's phone shares its position once the delivery starts. Until it does,
    // the rider waits at the store (while the order is packed or on its way), facing the door.
    val atStore = order?.status == OrderStatus.PACKING || order?.status == OrderStatus.OUT_FOR_DELIVERY
    val target = progress.riderPosition ?: rider?.let { GeoPoint(it.lat, it.lng) } ?: HUB.takeIf { atStore }
    // The rider glides from one fix to the next instead of jumping every few seconds.
    val glide = remember { Animatable(1f) }
    var from by remember { mutableStateOf(target) }
    var to by remember { mutableStateOf(target) }
    LaunchedEffect(target?.latitude, target?.longitude) {
        val current = to?.let { prev -> from?.let { start -> lerp(start, prev, glide.value) } ?: prev }
        from = current ?: target
        to = target
        val far = if (current != null && target != null) current.distanceToAsDouble(target) > 400 else true
        if (far) glide.snapTo(1f) else {
            glide.snapTo(0f)
            glide.animateTo(1f, tween(1400, easing = LinearOutSlowInEasing))
        }
    }
    val riderPoint = to?.let { end -> from?.let { start -> lerp(start, end, glide.value) } ?: end }
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
            config.userAgentValue = "DASHit-App/1.0 (https://dashit.co.in)"
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
                // Light or dark with the app, like Apple Maps on the iPhone app.
                com.dashit.app.ui.map.MapStyle.apply(this, com.dashit.app.core.design.DashitColors.isDark)
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
                val bearing = progress.roadBearing
                    ?: rider?.let { r -> r.heading?.takeIf { (r.speed ?: 0.0) > 0.5 } }
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
internal suspend fun fetchRoadRoute(from: GeoPoint, to: GeoPoint): List<GeoPoint>? = withContext(Dispatchers.IO) {
    try {
        val url = URL(
            "https://router.project-osrm.org/route/v1/driving/" +
                "${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson"
        )
        val connection = (url.openConnection() as HttpURLConnection).apply {
            connectTimeout = 6000
            readTimeout = 6000
            setRequestProperty("User-Agent", "DASHit-App/1.0 (https://dashit.co.in)")
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

/**
 * The 3D rider, rendered every 15 degrees (the same 24 frames as iOS, from
 * scripts/rider3d). `rider_000` rides north, up the map, and the number is the
 * heading clockwise from north. With no heading yet it faces the shopper.
 */
private fun riderSpriteName(bearing: Double?): String {
    if (bearing == null) return "rider_180"
    val normalized = ((bearing % 360) + 360) % 360
    val step = ((normalized + 7.5) / 15).toInt() % 24
    return "rider_%03d".format(step * 15)
}

private fun dp(context: Context, value: Float): Float = value * context.resources.displayMetrics.density

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

/**
 * The rider sprite for a heading, over a soft orange halo and a ground shadow.
 * The sprites are square with the bike centred; its wheels meet the ground
 * about a quarter of the sprite below the centre, where the halo and shadow go.
 */
private fun riderMarkerBitmap(context: Context, spriteName: String): Bitmap {
    val d = context.resources.displayMetrics.density
    val size = (104 * d).toInt()
    val out = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(out)
    val c = size / 2f
    val ground = c + 22 * d
    canvas.drawCircle(c, ground, 27 * d, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.argb(70, 255, 91, 0) })
    canvas.drawOval(RectF(c - 26 * d, ground - 6 * d, c + 26 * d, ground + 8 * d), Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.argb(80, 0, 0, 0) })
    val id = context.resources.getIdentifier(spriteName, "drawable", context.packageName)
    val sprite = if (id != 0) BitmapFactory.decodeResource(context.resources, id) else null
    if (sprite != null) {
        val targetH = 88 * d
        val targetW = sprite.width * targetH / sprite.height
        canvas.drawBitmap(
            sprite, null,
            RectF(c - targetW / 2, c - targetH / 2, c + targetW / 2, c + targetH / 2),
            Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
        )
    }
    return out
}

private fun lerp(a: GeoPoint, b: GeoPoint, t: Float): GeoPoint =
    GeoPoint(a.latitude + (b.latitude - a.latitude) * t, a.longitude + (b.longitude - a.longitude) * t)
