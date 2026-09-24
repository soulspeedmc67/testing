package com.dashit.app.ui.orders

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTransformGestures
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
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Store
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.model.Order
import com.dashit.app.data.model.OrderStatus
import com.dashit.app.data.repository.OrderRepository
import kotlinx.coroutines.delay

@Composable
fun LiveTrackingMapScreen(
    initialOrder: Order,
    orderRepo: OrderRepository = OrderRepository.shared,
    onBack: () -> Unit
) {
    val view = LocalView.current
    val orders by orderRepo.orders.collectAsState()
    val activeOrder = orders.firstOrNull { it.id == initialOrder.id } ?: initialOrder

    // 60-second cancellation window countdown
    var cancelTimerSeconds by remember { mutableIntStateOf(58) }
    LaunchedEffect(Unit) {
        while (cancelTimerSeconds > 0) {
            delay(1000)
            cancelTimerSeconds--
        }
    }

    // Map Pan & Zoom states
    var mapScale by remember { mutableFloatStateOf(1.0f) }
    var mapOffset by remember { mutableStateOf(Offset.Zero) }

    // Pulsing animations for Radar, Destination & polyline flow
    val infiniteTransition = rememberInfiniteTransition(label = "map_animations")
    val radarPulse by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(2200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "radar"
    )
    val destPulse by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(1600, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "dest_pulse"
    )
    val polylineDashPhase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 60f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "dash_phase"
    )

    // Smooth rider progression along route (0.0 store to 1.0 destination)
    val simulatedProgress by infiniteTransition.animateFloat(
        initialValue = 0.25f,
        targetValue = 0.88f,
        animationSpec = infiniteRepeatable(
            animation = tween(24000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rider_drive"
    )
    val effectiveProgress = activeOrder.tracking?.progress?.toFloat() ?: simulatedProgress

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF11141B))
    ) {
        // 1. Vector Map Canvas
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    detectTransformGestures { _, pan, zoom, _ ->
                        mapScale = (mapScale * zoom).coerceIn(0.75f, 2.5f)
                        mapOffset += pan
                    }
                }
        ) {
            val width = size.width
            val height = size.height

            // Base map coordinate anchors
            val storePos = Offset(width * 0.18f + mapOffset.x, height * 0.24f + mapOffset.y)
            val corner1 = Offset(width * 0.42f + mapOffset.x, height * 0.24f + mapOffset.y)
            val corner2 = Offset(width * 0.42f + mapOffset.x, height * 0.40f + mapOffset.y)
            val corner3 = Offset(width * 0.72f + mapOffset.x, height * 0.40f + mapOffset.y)
            val homePos = Offset(width * 0.72f + mapOffset.x, height * 0.52f + mapOffset.y)

            // Draw Background grid / blocks
            val blockSize = 70f * mapScale
            val startX = (mapOffset.x % blockSize)
            val startY = (mapOffset.y % blockSize)

            var x = startX - blockSize
            while (x < width + blockSize) {
                var y = startY - blockSize
                while (y < height + blockSize) {
                    drawRoundRect(
                        color = Color(0xFF161B25),
                        topLeft = Offset(x + 4f, y + 4f),
                        size = Size(blockSize - 8f, blockSize - 8f),
                        cornerRadius = CornerRadius(8f, 8f)
                    )
                    y += blockSize
                }
                x += blockSize
            }

            // Draw Green Park Zones
            drawRoundRect(
                color = Color(0xFF13281E),
                topLeft = Offset(width * 0.52f + mapOffset.x, height * 0.14f + mapOffset.y),
                size = Size(130f * mapScale, 90f * mapScale),
                cornerRadius = CornerRadius(14f, 14f)
            )

            // Draw River / Water body
            val riverPath = Path().apply {
                moveTo(0f, height * 0.65f + mapOffset.y)
                quadraticTo(
                    width * 0.5f + mapOffset.x,
                    height * 0.62f + mapOffset.y,
                    width,
                    height * 0.68f + mapOffset.y
                )
            }
            drawPath(
                path = riverPath,
                color = Color(0xFF14273C),
                style = Stroke(width = 28f * mapScale, cap = StrokeCap.Round)
            )

            // Draw Secondary Road Network (arterials)
            val roadLines = listOf(
                Offset(0f, height * 0.24f + mapOffset.y) to Offset(width, height * 0.24f + mapOffset.y),
                Offset(0f, height * 0.40f + mapOffset.y) to Offset(width, height * 0.40f + mapOffset.y),
                Offset(0f, height * 0.52f + mapOffset.y) to Offset(width, height * 0.52f + mapOffset.y),
                Offset(width * 0.18f + mapOffset.x, 0f) to Offset(width * 0.18f + mapOffset.x, height),
                Offset(width * 0.42f + mapOffset.x, 0f) to Offset(width * 0.42f + mapOffset.x, height),
                Offset(width * 0.72f + mapOffset.x, 0f) to Offset(width * 0.72f + mapOffset.x, height)
            )
            roadLines.forEach { (start, end) ->
                drawLine(
                    color = Color(0xFF242C3D),
                    start = start,
                    end = end,
                    strokeWidth = 14f * mapScale,
                    cap = StrokeCap.Square
                )
                // Center road dashed divider
                drawLine(
                    color = Color(0xFF333D52),
                    start = start,
                    end = end,
                    strokeWidth = 2f * mapScale,
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 16f), 0f)
                )
            }

            // Draw Route Polyline from Dark Store to Destination
            val routePath = Path().apply {
                moveTo(storePos.x, storePos.y)
                lineTo(corner1.x, corner1.y)
                lineTo(corner2.x, corner2.y)
                lineTo(corner3.x, corner3.y)
                lineTo(homePos.x, homePos.y)
            }

            // Polyline Glow Underneath
            drawPath(
                path = routePath,
                color = DashitColors.BrandOrange.copy(alpha = 0.25f),
                style = Stroke(width = 16f * mapScale, cap = StrokeCap.Round, join = StrokeJoin.Round)
            )
            // Polyline Solid Base Line
            drawPath(
                path = routePath,
                color = DashitColors.BrandOrange,
                style = Stroke(width = 6f * mapScale, cap = StrokeCap.Round, join = StrokeJoin.Round)
            )
            // Polyline Animated Neon Dash Pulse
            drawPath(
                path = routePath,
                color = Color.White.copy(alpha = 0.85f),
                style = Stroke(
                    width = 4f * mapScale,
                    cap = StrokeCap.Round,
                    join = StrokeJoin.Round,
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(18f, 24f), polylineDashPhase)
                )
            )

            // Origin Marker: Dark Store Hub Pin
            drawCircle(
                color = Color(0xFF141720),
                radius = 18f * mapScale,
                center = storePos
            )
            drawCircle(
                color = DashitColors.FestiveGold,
                radius = 14f * mapScale,
                center = storePos
            )
            drawCircle(
                color = Color.White,
                radius = 5f * mapScale,
                center = storePos
            )

            // Destination Marker: Home Pin with Concentric Glowing Pulse Waves
            drawCircle(
                color = DashitColors.BrandOrange.copy(alpha = (1f - destPulse / 1.2f).coerceIn(0f, 0.4f)),
                radius = (36f * destPulse) * mapScale,
                center = homePos
            )
            drawCircle(
                color = DashitColors.BrandOrange,
                radius = 16f * mapScale,
                center = homePos
            )
            drawCircle(
                color = Color.White,
                radius = 6f * mapScale,
                center = homePos
            )

            // Calculate Rider Position along the 4 segments
            val segmentPoints = listOf(storePos, corner1, corner2, corner3, homePos)
            val totalSegments = segmentPoints.size - 1
            val scaledProgress = (effectiveProgress * totalSegments).coerceIn(0f, totalSegments.toFloat())
            val segIdx = scaledProgress.toInt().coerceIn(0, totalSegments - 1)
            val segFraction = scaledProgress - segIdx

            val segStart = segmentPoints[segIdx]
            val segEnd = segmentPoints[segIdx + 1]
            val riderPos = Offset(
                x = segStart.x + (segEnd.x - segStart.x) * segFraction,
                y = segStart.y + (segEnd.y - segStart.y) * segFraction
            )

            // Pulsing Live Radar Rings around Rider
            val maxRadarRadius = 52f * mapScale
            drawCircle(
                color = DashitColors.BlinkitGreen.copy(alpha = (1f - radarPulse) * 0.55f),
                radius = radarPulse * maxRadarRadius,
                center = riderPos
            )
            drawCircle(
                color = Color(0xFF22C55E).copy(alpha = (1f - radarPulse) * 0.25f),
                radius = (radarPulse * maxRadarRadius * 1.4f),
                center = riderPos
            )

            // Rider Disc
            drawCircle(
                color = Color.Black.copy(alpha = 0.5f),
                radius = 20f * mapScale,
                center = Offset(riderPos.x, riderPos.y + 4f)
            )
            drawCircle(
                color = DashitColors.BlinkitGreen,
                radius = 18f * mapScale,
                center = riderPos
            )
            drawCircle(
                color = Color.White,
                radius = 15f * mapScale,
                center = riderPos,
                style = Stroke(width = 2.5f * mapScale)
            )
        }

        // 2. Top Navigation Bar (Glassmorphic)
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
                    .background(Color(0xFF181C26).copy(alpha = 0.92f))
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
                    .background(Color(0xFF141720).copy(alpha = 0.92f))
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
                    .background(Color(0xFF181C26).copy(alpha = 0.92f))
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

        // 3. Floating Re-Center Map Button
        Box(
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 16.dp)
                .offset(y = (-60).dp)
                .size(42.dp)
                .clip(CircleShape)
                .background(Color(0xFF1A1F2C).copy(alpha = 0.95f))
                .border(1.dp, DashitColors.HairlineStrong, CircleShape)
                .pressable(scale = 0.90f) {
                    HapticsManager.light(view)
                    mapScale = 1.0f
                    mapOffset = Offset.Zero
                },
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.MyLocation,
                contentDescription = "Center on delivery",
                tint = DashitColors.FestiveGold,
                modifier = Modifier.size(20.dp)
            )
        }

        // 4. Floating Bottom Delivery Card
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
            modifier = Modifier.fillMaxWidth(),
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
