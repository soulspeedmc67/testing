package com.dashit.app.ui.orders

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.TwoWheeler
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.DashitMotion
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.model.DriverLiveTracking
import com.dashit.app.data.model.Order
import com.dashit.app.data.model.OrderStatus
import kotlinx.coroutines.delay

/** The glyph for each stage, the same symbols the iOS rail and pill use. */
val OrderStatus.icon: ImageVector
    get() = when (this) {
        OrderStatus.PLACED -> Icons.Filled.Schedule
        OrderStatus.PACKING -> Icons.Filled.Inventory2
        OrderStatus.OUT_FOR_DELIVERY -> Icons.Filled.TwoWheeler
        OrderStatus.DELIVERED -> Icons.Filled.Check
        OrderStatus.CANCELLED -> Icons.Filled.Close
    }

/** Seconds left in the order's change window, ticking once a second. */
@Composable
fun rememberModifySecondsRemaining(order: Order): Int {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(order.id, order.status) {
        while (order.modifySecondsRemaining(now) > 0) {
            delay(1000)
            now = System.currentTimeMillis()
        }
    }
    return order.modifySecondsRemaining(now)
}

/**
 * The live order, docked in a pill above the tab bar: the stage glyph in a
 * progress ring, the live status and the ETA. Tap it for the live map. Same
 * design as the iOS `OrderStatusPill`.
 */
@Composable
fun OrderStatusPill(
    order: Order,
    tracking: DriverLiveTracking?,
    onOpen: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    val view = LocalView.current
    val stage = order.status
    val eta = tracking?.etaMinutes ?: order.etaMinutes ?: 8
    val progress by animateFloatAsState(
        targetValue = if (stage == OrderStatus.CANCELLED) 1f else stage.progress(tracking?.progress).toFloat(),
        animationSpec = tween(600),
        label = "pill_progress"
    )
    val accent by animateColorAsState(
        targetValue = when (stage) {
            OrderStatus.DELIVERED -> DashitColors.Positive
            OrderStatus.CANCELLED -> DashitColors.Danger
            else -> DashitColors.BrandOrange
        },
        label = "pill_accent"
    )
    // While riding, the driver app's own line beats the checkout estimate.
    val subtitle = tracking?.statusText?.takeIf { stage == OrderStatus.OUT_FOR_DELIVERY && it.isNotBlank() }
        ?: stage.subtitle(eta, order.itemCount)
    val headline = stage.headline(order.driverName)

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(58.dp)
            .shadow(18.dp, CircleShape, clip = false, ambientColor = Color.Black, spotColor = Color.Black)
            .background(DashitColors.TrackerCard, CircleShape)
            .border(
                1.dp,
                Brush.verticalGradient(listOf(Color.White.copy(alpha = 0.16f), Color.White.copy(alpha = 0.05f))),
                CircleShape
            )
            .clip(CircleShape)
            .pressable(scale = 0.97f) {
                HapticsManager.light(view)
                onOpen()
            }
            .semantics { contentDescription = "$headline. $subtitle. Opens live tracking" }
            .padding(horizontal = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(11.dp)
    ) {
        // Stage glyph inside a ring that fills as the order moves along.
        Box(modifier = Modifier.size(42.dp), contentAlignment = Alignment.Center) {
            Canvas(modifier = Modifier.size(39.dp)) {
                val strokeWidth = 3.dp.toPx()
                drawCircle(Color.White.copy(alpha = 0.06f))
                drawCircle(Color.White.copy(alpha = 0.12f), style = Stroke(strokeWidth))
                drawArc(
                    color = accent,
                    startAngle = -90f,
                    sweepAngle = 360f * progress,
                    useCenter = false,
                    style = Stroke(strokeWidth, cap = StrokeCap.Round)
                )
            }
            AnimatedContent(targetState = stage.icon, label = "pill_icon") { icon ->
                Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(17.dp))
            }
        }

        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            AnimatedContent(
                targetState = headline,
                transitionSpec = {
                    (slideInVertically { it } + fadeIn()) togetherWith (slideOutVertically { -it } + fadeOut())
                },
                label = "pill_headline"
            ) { text ->
                Text(
                    text = text,
                    color = Color.White,
                    fontSize = 14.5.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                if (!stage.isFinished) LiveDot()
                Text(
                    text = subtitle,
                    color = DashitColors.TextSecondary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        if (stage.isFinished) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.1f))
                    .pressable(scale = 0.85f) {
                        HapticsManager.light(view)
                        onDismiss()
                    }
                    .semantics { contentDescription = "Dismiss" },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.Close, contentDescription = null, tint = DashitColors.TextSecondary, modifier = Modifier.size(15.dp))
            }
        } else {
            // Minutes to the door, the orange block on the right.
            Column(
                modifier = Modifier
                    .size(width = 44.dp, height = 40.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(DashitColors.BrandOrange),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                AnimatedContent(targetState = eta, label = "pill_eta") { minutes ->
                    Text("$minutes", color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 18.sp)
                }
                Text("MIN", color = Color.White, fontSize = 8.5.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.8.sp, lineHeight = 9.sp)
            }
        }
    }
}

/** The small green "live" dot that pulses beside the status line. */
@Composable
private fun LiveDot() {
    val pulse = rememberInfiniteTransition(label = "live_dot")
    val alpha by pulse.animateFloat(
        initialValue = 1f,
        targetValue = 0.35f,
        animationSpec = infiniteRepeatable(tween(900), RepeatMode.Reverse),
        label = "live_dot_alpha"
    )
    Box(
        modifier = Modifier
            .size(6.dp)
            .clip(CircleShape)
            .background(DashitColors.Positive.copy(alpha = alpha))
    )
}

/**
 * The stage rail from the web tracker: a dashed track, a solid fill up to the
 * current stage, a marker riding the end of the fill and a home pin at the end.
 * Drawn for a dark surface, like the iOS `OrderProgressRail`.
 */
@Composable
fun OrderProgressRail(stage: OrderStatus, progress: Double, markerSize: Int = 26) {
    val fill by animateFloatAsState(progress.toFloat().coerceIn(0f, 1f), DashitMotion.houseSpring(), label = "rail_fill")
    val marker = markerSize.dp
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        BoxWithConstraints(modifier = Modifier.weight(1f).height(marker), contentAlignment = Alignment.CenterStart) {
            val width = maxWidth
            if (stage == OrderStatus.DELIVERED) {
                Box(Modifier.fillMaxWidth().height(4.dp).clip(CircleShape).background(DashitColors.Positive))
            } else {
                Canvas(modifier = Modifier.fillMaxWidth().height(3.dp)) {
                    drawLine(
                        color = Color.White.copy(alpha = 0.3f),
                        start = Offset(0f, size.height / 2),
                        end = Offset(size.width, size.height / 2),
                        strokeWidth = 2.5.dp.toPx(),
                        cap = StrokeCap.Round,
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(5.dp.toPx(), 5.dp.toPx()))
                    )
                }
                Box(Modifier.width(width * fill).height(3.5.dp).clip(CircleShape).background(Color.White))
                val x = (width * fill - marker / 2).coerceIn(0.dp, (width - marker).coerceAtLeast(0.dp))
                RailMarker(stage.icon, marker, Modifier.offset(x = x))
            }
        }
        val delivered = stage == OrderStatus.DELIVERED
        Box(
            modifier = Modifier
                .size(marker)
                .clip(CircleShape)
                .background(if (delivered) DashitColors.Positive else Color.White),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                if (delivered) Icons.Filled.Check else Icons.Filled.Home,
                contentDescription = null,
                tint = if (delivered) Color.White else DashitColors.Midnight,
                modifier = Modifier.size(marker * 0.5f)
            )
        }
    }
}

@Composable
private fun RailMarker(icon: ImageVector, size: androidx.compose.ui.unit.Dp, modifier: Modifier) {
    Box(
        modifier = modifier
            .size(size)
            .shadow(3.dp, CircleShape)
            .clip(CircleShape)
            .background(Color.White),
        contentAlignment = Alignment.Center
    ) {
        Icon(icon, contentDescription = null, tint = DashitColors.Midnight, modifier = Modifier.size(size * 0.5f))
    }
}

/** The 4-digit code the rider asks for before handing over the order. */
@Composable
fun DeliveryCodeRow(code: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .semantics { contentDescription = "Delivery code ${code.toList().joinToString(" ")}" },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Icon(Icons.Filled.Shield, contentDescription = null, tint = DashitColors.BrandAccent, modifier = Modifier.size(20.dp))
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text("Delivery code", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            Text("Share it with your rider at the door", color = Color.White.copy(alpha = 0.6f), fontSize = 11.5.sp)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            code.forEach { digit ->
                Box(
                    modifier = Modifier
                        .size(width = 24.dp, height = 32.dp)
                        .clip(RoundedCornerShape(7.dp))
                        .background(Color.White.copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(digit.toString(), color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

/** A ring that empties over the change window, with the seconds beside it. */
@Composable
fun ModifyCountdownBadge(order: Order) {
    val seconds = rememberModifySecondsRemaining(order)
    val fraction by animateFloatAsState(
        targetValue = (seconds / 60f).coerceIn(0f, 1f),
        animationSpec = tween(900),
        label = "countdown_ring"
    )
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Canvas(modifier = Modifier.size(16.dp)) {
            val stroke = 2.5.dp.toPx()
            drawCircle(Color.White.copy(alpha = 0.2f), style = Stroke(stroke))
            drawArc(DashitColors.BrandOrange, -90f, 360f * fraction, false, style = Stroke(stroke, cap = StrokeCap.Round))
        }
        Text(
            text = "0:%02d".format(seconds),
            color = Color.White,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace
        )
    }
}

/** A thin spacer line used between sections of the dark order card. */
@Composable
fun CardDivider() {
    Spacer(Modifier.fillMaxWidth().height(1.dp).background(Color.White.copy(alpha = 0.1f)))
}
