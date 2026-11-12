package com.dashit.app.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import com.dashit.app.core.design.DashitColors
import com.dashit.app.data.StoreStatus
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin

/**
 * A faint snowfall or rain inside the home header's glow while the admin has
 * the weather advisory on (`weatherAlert` on `config/store`, type "snow" or
 * "rain"). Nothing new to switch: the same control that shows "Orders may be
 * delayed" drives this, and the web and iPhone apps follow the same field.
 *
 * It fills whatever box it is placed in (the header), fades out toward the
 * bottom with the gradient, never takes a touch, and stays still when the
 * device has animations turned off.
 */
private enum class AmbientKind { Snow, Rain }

@Composable
fun AmbientWeather(modifier: Modifier = Modifier) {
    val store by StoreStatus.state.collectAsState()
    val wanted = when (store.delayNotice?.type) {
        "snow" -> AmbientKind.Snow
        "rain" -> AmbientKind.Rain
        else -> null
    }

    // Stays composed while it fades out, so it never just blinks off.
    var shown by remember { mutableStateOf(wanted) }
    LaunchedEffect(wanted) { if (wanted != null) shown = wanted }
    val level by animateFloatAsState(
        targetValue = if (wanted != null) 1f else 0f,
        animationSpec = tween(durationMillis = 1600),
        label = "ambientWeather"
    )
    LaunchedEffect(level, wanted) { if (level == 0f && wanted == null) shown = null }

    var seconds by remember { mutableFloatStateOf(0f) }
    val context = LocalContext.current
    val animationsOff = remember {
        android.provider.Settings.Global.getFloat(
            context.contentResolver, android.provider.Settings.Global.ANIMATOR_DURATION_SCALE, 1f
        ) == 0f
    }
    val kind = shown
    LaunchedEffect(kind, animationsOff) {
        if (kind == null || animationsOff) return@LaunchedEffect
        var start = 0L
        while (true) {
            androidx.compose.runtime.withFrameNanos { now ->
                if (start == 0L) start = now
                seconds = (now - start) / 1_000_000_000f
            }
        }
    }
    if (kind == null || animationsOff) return

    val dark = DashitColors.isDark
    Canvas(
        modifier = modifier
            .fillMaxSize()
            // Fades out toward the bottom edge, like the gradient behind it.
            .graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }
            .drawWithContent {
                drawContent()
                drawRect(
                    brush = Brush.verticalGradient(0f to Color.Black, 0.45f to Color.Black, 1f to Color.Transparent),
                    blendMode = BlendMode.DstIn
                )
            }
    ) {
        val t = seconds.toDouble()
        when (kind) {
            AmbientKind.Snow -> drawSnow(t, level, dark)
            AmbientKind.Rain -> drawRain(t, level, dark)
        }
    }
}

/** Same number every time for the same [i] and [salt]: where a particle is depends only on the clock. */
private fun rnd(i: Int, salt: Int): Double {
    val x = sin((i * 127 + salt * 311).toDouble()) * 43758.5453
    return x - floor(x)
}

/**
 * 0 far (tiny, slow, faint) to 1 near (bigger, quicker, clearer). Skewed toward
 * far, so there are plenty of fine specks and a few near ones: that is what
 * makes the fall look deep instead of flat.
 */
private fun depth(i: Int): Double = rnd(i, 1).pow(1.5)

private fun count(w: Float, h: Float, perDp2: Float, limit: Int): Int =
    min(limit, max(30, ((w * h) / perDp2).toInt()))

private fun DrawScope.drawSnow(t: Double, level: Float, dark: Boolean) {
    val edge = if (dark) Color.White else Color(0xFF6884B2)
    val density = this.density
    val w = size.width.toDouble()
    val h = size.height.toDouble()
    // Sized in dp, so a dense phone screen doesn't get a blizzard of pin-pricks.
    val n = count(size.width / density, size.height / density, 1500f, 110)
    val travelY = h + 20 * density
    val travelX = w + 40 * density
    // A slow, shifting breeze, worked out as a distance so every flake is
    // carried the same way, near ones further than far ones.
    val drift = (-(7 / 0.23) * cos(0.23 * t) - (3 / 0.71) * cos(0.71 * t + 1.3)) * density
    for (i in 0 until n) {
        val d = depth(i)
        val radius = ((0.6 + d * 2.2) * density).toFloat()
        val speed = (12 + d * 34) * density
        val sway = (3 + rnd(i, 2) * 9) * density
        val swaySpeed = 0.4 + rnd(i, 6) * 0.7
        val phase = rnd(i, 3) * Math.PI * 2
        val alpha = ((0.3 + d * 0.45) * level).toFloat()

        val y = (rnd(i, 4) * travelY + speed * t) % travelY - 10 * density
        var x = (rnd(i, 5) * travelX + drift * (0.35 + d) + sin(t * swaySpeed + phase) * sway) % travelX
        if (x < 0) x += travelX
        x -= 20 * density

        // A soft cool-grey edge with a white core: pure white would vanish on
        // the light peach header. At night the header is dark, so white alone.
        val halo = radius * (if (d > 0.7) 2.6f else 2f)
        val at = Offset(x.toFloat(), y.toFloat())
        drawCircle(
            brush = Brush.radialGradient(
                0f to edge.copy(alpha = alpha * 0.62f),
                0.5f to edge.copy(alpha = alpha * 0.42f),
                1f to edge.copy(alpha = 0f),
                center = at,
                radius = halo
            ),
            radius = halo,
            center = at
        )
        drawCircle(Color.White.copy(alpha = min(1f, alpha * 1.25f)), radius * 0.7f, at)
    }
}

private fun DrawScope.drawRain(t: Double, level: Float, dark: Boolean) {
    val ink = if (dark) Color(0xFFAEC6E6) else Color(0xFF546C98)
    val density = this.density
    val w = size.width.toDouble()
    val h = size.height.toDouble()
    val n = count(size.width / density, size.height / density, 1800f, 100)
    val slant = 0.2                               // a gentle lean, not a storm
    val travelY = h + 60 * density
    val travelX = w + 60 * density
    for (i in 0 until n) {
        val d = depth(i)
        val length = (8 + d * 18) * density
        val speed = (380 + d * 520) * density
        val alpha = ((0.24 + d * 0.44) * level).toFloat()
        val width = ((0.6 + d * 0.9) * density).toFloat()

        val y = (rnd(i, 12) * travelY + speed * t) % travelY - 30 * density
        val x = (rnd(i, 13) * travelX + speed * slant * t) % travelX - 30 * density

        val head = Offset(x.toFloat(), y.toFloat())
        val tail = Offset((x - length * slant).toFloat(), (y - length).toFloat())
        // Faint tail, brighter head: reads as motion blur, not a hard line.
        drawLine(
            brush = Brush.linearGradient(
                colors = listOf(ink.copy(alpha = 0f), ink.copy(alpha = alpha)),
                start = tail,
                end = head
            ),
            start = tail,
            end = head,
            strokeWidth = width,
            cap = StrokeCap.Round
        )
    }
}
