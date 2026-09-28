package com.dashit.app.ui.orders

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import com.dashit.app.core.design.DashitColors
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin

enum class StageIconKind { RECEIVED, PACKING }

/**
 * The line-art icon at the top of the "Order received" and "Packing" screens,
 * frame for frame the same as the iOS app's `OrderStageIcon.swift`.
 *
 * Received: a receipt fills in line by line, then an orange tick lands on it.
 * Packing: two items drop into a box, the flaps fold shut and it's taped.
 * Drawn in a 120×120 box from the seconds since the screen opened.
 */
@Composable
fun OrderStageIcon(kind: StageIconKind, modifier: Modifier = Modifier, animate: Boolean = true) {
    var time by remember(kind) { mutableFloatStateOf(if (animate) 0f else RESTING_TIME) }
    if (animate) {
        LaunchedEffect(kind) {
            val start = withFrameNanos { it }
            while (true) {
                withFrameNanos { now -> time = (now - start) / 1_000_000_000f }
            }
        }
    }
    Canvas(modifier = modifier) {
        val s = min(size.width, size.height) / 120f
        translate(left = (size.width - 120f * s) / 2f, top = (size.height - 120f * s) / 2f) {
            scale(scale = s, pivot = Offset.Zero) {
                drawCircle(Color.White.copy(alpha = 0.06f), radius = 56f, center = Offset(60f, 60f))
                when (kind) {
                    StageIconKind.RECEIVED -> drawReceived(time)
                    StageIconKind.PACKING -> drawPacking(time)
                }
            }
        }
    }
}

private const val RECEIVED_PERIOD = 3.2f
private const val PACKING_PERIOD = 3.6f
/** A frame with everything in place, for when animations are off. */
private const val RESTING_TIME = 2.4f

private val Ink = Color.White.copy(alpha = 0.92f)
private val Accent = DashitColors.BrandOrange
private val Background = DashitColors.Midnight
private val Line = Stroke(width = 4f, cap = StrokeCap.Round, join = StrokeJoin.Round)

private fun DrawScope.drawReceived(time: Float) {
    val t = time % RECEIVED_PERIOD
    val fade = 1f - segment(t, 2.7f, 3.1f)

    val receipt = Path().apply {
        moveTo(36f, 24f)
        quadraticTo(36f, 18f, 42f, 18f)
        lineTo(78f, 18f)
        quadraticTo(84f, 18f, 84f, 24f)
        listOf(84f to 100f, 77f to 95f, 70f to 100f, 63f to 95f, 56f to 100f, 49f to 95f, 42f to 100f, 36f to 95f)
            .forEach { (x, y) -> lineTo(x, y) }
        close()
    }
    drawPath(receipt, Background)
    drawPath(receipt, Ink, style = Line)

    // The order's lines, written one after another.
    listOf(Triple(46f, 38f, 74f), Triple(46f, 50f, 70f), Triple(46f, 62f, 62f)).forEachIndexed { index, (x, y, x2) ->
        val progress = easeOut(segment(t, 0.15f + index * 0.28f, 0.55f + index * 0.28f))
        if (progress > 0.001f) {
            drawPath(trimmed(listOf(Offset(x, y), Offset(x2, y)), progress), Ink, alpha = fade * 0.8f, style = Line)
        }
    }

    // The tick: the badge pops in, then the tick draws itself.
    val pop = easeOutBack(segment(t, 1.05f, 1.45f))
    if (pop <= 0.001f) return
    scale(scale = pop, pivot = Offset(80f, 90f)) {
        drawCircle(Accent, radius = 15f, center = Offset(80f, 90f), alpha = fade)
        val tick = easeOut(segment(t, 1.35f, 1.75f))
        if (tick > 0.001f) {
            drawPath(
                trimmed(listOf(Offset(72f, 90f), Offset(77.5f, 95.5f), Offset(88f, 85f)), tick),
                Color.White, alpha = fade, style = Line
            )
        }
    }
}

private fun DrawScope.drawPacking(time: Float) {
    val t = time % PACKING_PERIOD

    // Items fall in and disappear behind the front of the box.
    val gone = segment(t, 2.8f, 3.2f)
    data class Item(val x: Float, val w: Float, val h: Float, val filled: Boolean, val start: Float)
    listOf(Item(43f, 16f, 16f, true, 0.1f), Item(62f, 14f, 19f, false, 0.6f)).forEach { item ->
        val fall = segment(t, item.start, item.start + 0.75f)
        if (fall <= 0f) return@forEach
        val alpha = min(1f, fall / 0.15f) * (1f - gone)
        val y = 4f + (74f - 4f) * fall * fall
        val topLeft = Offset(item.x, y)
        val size = Size(item.w, item.h)
        if (item.filled) {
            drawRoundRect(Accent, topLeft, size, CornerRadius(4f), alpha = alpha)
        } else {
            drawRoundRect(Background, topLeft, size, CornerRadius(4f), alpha = alpha)
            drawRoundRect(Ink, topLeft, size, CornerRadius(4f), alpha = alpha, style = Stroke(3.5f, join = StrokeJoin.Round))
        }
    }

    // Shut, then open again for the next round; a small hop once taped.
    val shut = easeInOut(segment(t, 1.5f, 1.95f)) * (1f - easeInOut(segment(t, 2.95f, 3.4f)))
    val hop = sin(PI.toFloat() * segment(t, 1.95f, 2.3f))
    translate(top = -4f * hop) {
        val front = Path().apply {
            moveTo(28f, 56f)
            lineTo(92f, 56f)
            lineTo(92f, 96f)
            quadraticTo(92f, 102f, 86f, 102f)
            lineTo(34f, 102f)
            quadraticTo(28f, 102f, 28f, 96f)
            close()
        }
        drawPath(front, Background)
        drawPath(front, Ink, style = Line)

        // Flaps lean out when open and meet in the middle when shut.
        val angle = (1f - shut) * 118f * PI.toFloat() / 180f
        val length = 26f
        drawLine(Ink, Offset(28f, 56f), Offset(28f + length * cos(angle), 56f - length * sin(angle)), strokeWidth = 4f, cap = StrokeCap.Round)
        drawLine(Ink, Offset(92f, 56f), Offset(92f - length * cos(angle), 56f - length * sin(angle)), strokeWidth = 4f, cap = StrokeCap.Round)

        val tape = easeOut(segment(t, 1.95f, 2.35f))
        if (tape > 0.001f) {
            drawPath(
                trimmed(listOf(Offset(50f, 56f), Offset(70f, 56f)), tape),
                Accent, alpha = 1f - segment(t, 2.8f, 2.95f),
                style = Stroke(5f, cap = StrokeCap.Round)
            )
        }
    }
}

/** The first `progress` (0…1) of a line through `points`, by length. */
private fun trimmed(points: List<Offset>, progress: Float): Path {
    val lengths = points.zipWithNext { a, b -> hypot(b.x - a.x, b.y - a.y) }
    var remaining = lengths.sum() * progress
    val path = Path().apply { moveTo(points[0].x, points[0].y) }
    for (i in lengths.indices) {
        val a = points[i]
        val b = points[i + 1]
        if (remaining >= lengths[i]) {
            path.lineTo(b.x, b.y)
            remaining -= lengths[i]
        } else {
            val f = if (lengths[i] == 0f) 0f else remaining / lengths[i]
            path.lineTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f)
            break
        }
    }
    return path
}

private fun segment(t: Float, start: Float, end: Float): Float = ((t - start) / (end - start)).coerceIn(0f, 1f)
private fun easeOut(x: Float): Float = 1f - (1f - x).pow(3)
private fun easeInOut(x: Float): Float = if (x < 0.5f) 4f * x * x * x else 1f - (-2f * x + 2f).pow(3) / 2f
private fun easeOutBack(x: Float): Float {
    val c1 = 1.70158f
    val c3 = c1 + 1f
    return 1f + c3 * (x - 1f).pow(3) + c1 * (x - 1f).pow(2)
}
