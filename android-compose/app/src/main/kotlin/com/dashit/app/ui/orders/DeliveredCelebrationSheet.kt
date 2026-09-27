package com.dashit.app.ui.orders

import android.provider.Settings
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathMeasure
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.model.Order
import com.dashit.app.ui.components.ShimmerImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.random.Random

private val EaseOutQuint = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)

/**
 * "Order delivered", shown once per order when the shopper is next in the app:
 * a green badge springs in, the check draws itself, a ring pulses out and a
 * short confetti burst falls behind it, then the order's summary. Mirrors the
 * iOS sheet.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveredCelebrationSheet(
    order: Order,
    onReorder: () -> Unit,
    onDismiss: () -> Unit
) {
    val view = LocalView.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val reduceMotion = remember {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    }

    val badge = remember { Animatable(0f) }
    val check = remember { Animatable(0f) }
    val ring = remember { Animatable(0f) }
    val content = remember { Animatable(0f) }
    val confetti = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        HapticsManager.success(view, context)
        if (reduceMotion) {
            badge.snapTo(1f); check.snapTo(1f); ring.snapTo(1f); content.snapTo(1f)
            return@LaunchedEffect
        }
        launch { badge.animateTo(1f, spring(dampingRatio = 0.62f, stiffness = Spring.StiffnessMediumLow)) }
        launch { delay(180); check.animateTo(1f, tween(400, easing = EaseOutQuint)) }
        launch { delay(200); ring.animateTo(1f, tween(900, easing = CubicBezierEasing(0f, 0f, 0.58f, 1f))) }
        launch { delay(320); content.animateTo(1f, tween(450, easing = EaseOutQuint)) }
        launch { delay(220); confetti.animateTo(1f, tween(ConfettiDurationMs, easing = LinearEasing)) }
    }

    // Buttons animate the sheet away first, as the other sheets do.
    fun close(then: () -> Unit = {}) {
        scope.launch {
            sheetState.hide()
            then()
            onDismiss()
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = DashitColors.Surface,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        dragHandle = { BottomSheetDefaults.DragHandle(color = DashitColors.HairlineStrong) },
        tonalElevation = 0.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp)
                .padding(bottom = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(190.dp),
                contentAlignment = Alignment.Center
            ) {
                ConfettiBurst(progress = { confetti.value }, modifier = Modifier.fillMaxSize())
                Emblem(badge = { badge.value }, check = { check.value }, ring = { ring.value })
            }

            Column(
                modifier = Modifier.graphicsLayer {
                    alpha = content.value
                    translationY = (1f - content.value) * 10.dp.toPx()
                },
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    "Order delivered",
                    color = DashitColors.TextPrimary,
                    fontSize = 26.sp,
                    fontWeight = FontWeight.Black,
                    textAlign = TextAlign.Center
                )
                Text(
                    "Your groceries have arrived. Enjoy!",
                    color = DashitColors.TextSecondary,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium,
                    textAlign = TextAlign.Center
                )
            }

            OrderSummaryCard(
                order = order,
                modifier = Modifier
                    .padding(top = 22.dp)
                    .graphicsLayer {
                        alpha = content.value
                        translationY = (1f - content.value) * 14.dp.toPx()
                    }
            )

            Spacer(Modifier.height(28.dp))

            Column(
                modifier = Modifier.graphicsLayer { alpha = content.value },
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(DashitColors.BrandOrange)
                        .pressable {
                            HapticsManager.light(view)
                            close()
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Text("Done", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                        .pressable {
                            HapticsManager.success(view, context)
                            close(onReorder)
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Text("Order these again", color = DashitColors.BrandAccent, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun Emblem(badge: () -> Float, check: () -> Float, ring: () -> Float) {
    Box(contentAlignment = Alignment.Center) {
        // The ring pulses outward and fades.
        Canvas(Modifier.size(96.dp)) {
            val r = ring()
            val scale = 0.8f + 1.1f * r
            val stroke = 2.dp.toPx()
            drawCircle(
                color = DashitColors.Positive.copy(alpha = 0.45f * (1f - r)),
                radius = (size.minDimension / 2f - stroke / 2f) * scale,
                style = Stroke(stroke)
            )
        }
        Box(
            modifier = Modifier
                .size(88.dp)
                .graphicsLayer {
                    val b = badge()
                    scaleX = 0.3f + 0.7f * b
                    scaleY = 0.3f + 0.7f * b
                    alpha = min(1f, b * 1.6f)
                }
                .shadow(18.dp, CircleShape, ambientColor = DashitColors.Positive, spotColor = DashitColors.Positive)
                .background(DashitColors.Positive, CircleShape)
        )
        // A tick drawn as one stroke, traced in.
        Canvas(Modifier.size(width = 38.dp, height = 28.dp)) {
            val p = check()
            if (p <= 0f) return@Canvas
            val full = Path().apply {
                moveTo(0f, size.height * 0.55f)
                lineTo(size.width * 0.36f, size.height)
                lineTo(size.width, 0f)
            }
            val measure = PathMeasure().apply { setPath(full, false) }
            val partial = Path()
            measure.getSegment(0f, measure.length * p, partial, true)
            drawPath(
                partial,
                color = Color.White,
                style = Stroke(width = 7.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round)
            )
        }
    }
}

@Composable
private fun OrderSummaryCard(order: Order, modifier: Modifier = Modifier) {
    val units = order.itemCount
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, RoundedCornerShape(18.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        val thumbs = order.items.take(4)
        Box(Modifier.width((40 + 30 * (thumbs.size - 1).coerceAtLeast(0)).dp)) {
            thumbs.forEachIndexed { index, item ->
                ShimmerImage(
                    model = item.img,
                    contentDescription = null,
                    modifier = Modifier
                        .offset(x = (30 * index).dp)
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(DashitColors.SurfaceMuted)
                        .border(2.dp, DashitColors.SurfaceRaised, CircleShape)
                )
            }
        }
        Spacer(Modifier.width(12.dp))
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                "$units item${if (units == 1) "" else "s"} · ₹${order.grandTotal.toInt()}",
                color = DashitColors.TextPrimary,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                "Order #${order.id.takeLast(6)}",
                color = DashitColors.TextMuted,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                fontFamily = FontFamily.Monospace
            )
        }
    }
}

private const val ConfettiDurationMs = 2200

private class ConfettiPiece(
    val angle: Float,
    val speed: Float,
    val spin: Float,
    val size: Size,
    val color: Color
)

private val ConfettiPalette = listOf(
    DashitColors.BrandOrange,
    DashitColors.Positive,
    Color.White,
    Color(0xFFFFBA73),
    Color(0xFFFFD666)
)

/**
 * A short, restrained burst of confetti in the brand's colours: pieces fly out
 * from the badge, tumble and fall away within about two seconds.
 */
@Composable
private fun ConfettiBurst(progress: () -> Float, modifier: Modifier = Modifier) {
    val pieces = remember {
        val random = Random(System.nanoTime())
        List(46) { index ->
            ConfettiPiece(
                angle = (-Math.PI * (0.05 + 0.9 * random.nextDouble())).toFloat(),
                speed = 240f + 190f * random.nextFloat(),
                spin = -9f + 18f * random.nextFloat(),
                size = if (index % 3 == 0) Size(6f, 6f) else Size(4f, 9f),
                color = ConfettiPalette[index % ConfettiPalette.size]
            )
        }
    }
    Canvas(modifier) {
        val p = progress()
        if (p <= 0f || p >= 1f) return@Canvas
        val t = p * ConfettiDurationMs / 1000f
        val unit = density // speeds are in dp per second, as on iOS
        val origin = Offset(size.width / 2f, size.height / 2f)
        val fade = max(0f, 1f - p)
        val drag = 1f - min(0.6f, t * 0.35f)
        for (piece in pieces) {
            // Launch, gravity and a little air drag.
            val x = origin.x + cos(piece.angle) * piece.speed * t * drag * unit
            val y = origin.y + (sin(piece.angle) * piece.speed * t * drag + 0.5f * 620f * t * t) * unit
            val w = piece.size.width * unit
            val h = piece.size.height * unit
            translate(x, y) {
                rotate(Math.toDegrees((piece.spin * t).toDouble()).toFloat(), pivot = Offset.Zero) {
                    drawRoundRect(
                        color = piece.color.copy(alpha = fade),
                        topLeft = Offset(-w / 2f, -h / 2f),
                        size = Size(w, h),
                        cornerRadius = CornerRadius(1.5f * unit)
                    )
                }
            }
        }
    }
}
