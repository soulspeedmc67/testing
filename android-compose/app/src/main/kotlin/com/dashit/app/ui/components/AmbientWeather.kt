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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.platform.LocalContext
import com.dashit.app.core.design.DashitColors
import com.dashit.app.data.StoreStatus
import kotlin.math.floor
import kotlin.math.min
import kotlin.math.max
import kotlin.math.sin

/**
 * A faint snowfall or rain over the shop while the admin has the weather
 * advisory on (`weatherAlert` on `config/store`, type "snow" or "rain").
 * Nothing new to switch: the same control that shows "Orders may be delayed"
 * drives this, and the web and iPhone apps follow the same field.
 *
 * Kept deliberately quiet: a few dozen soft particles at low opacity, never
 * taking a touch, still when the device has animations turned off.
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
    Canvas(modifier = modifier.fillMaxSize()) {
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

private fun count(w: Float, h: Float, perPixels: Float, limit: Int): Int =
    min(limit, max(24, ((w * h) / perPixels).toInt()))

private fun DrawScope.drawSnow(t: Double, level: Float, dark: Boolean) {
    val ink = if (dark) Color.White else Color(0xFF7892B8)
    val density = this.density
    val w = size.width.toDouble()
    val h = size.height.toDouble()
    // Sized in dp, so a dense phone screen doesn't get a blizzard of pin-pricks.
    val n = count(size.width / density, size.height / density, 16000f, 70)
    val travel = h + 20 * density
    for (i in 0 until n) {
        val depth = rnd(i, 1)
        val radius = ((0.8 + depth * 2.1) * density).toFloat()
        val speed = (14 + depth * 26) * density
        val sway = (6 + rnd(i, 2) * 12) * density
        val phase = rnd(i, 3) * Math.PI * 2
        val alpha = ((0.22 + depth * 0.4) * level).toFloat()

        val y = (rnd(i, 4) * travel + speed * t) % travel - 10 * density
        val x = rnd(i, 5) * w + sin(t * 0.6 + phase) * sway

        drawCircle(ink.copy(alpha = alpha * 0.28f), radius * 2f, Offset(x.toFloat(), y.toFloat()))
        drawCircle(ink.copy(alpha = alpha), radius, Offset(x.toFloat(), y.toFloat()))
    }
}

private fun DrawScope.drawRain(t: Double, level: Float, dark: Boolean) {
    val ink = if (dark) Color(0xFFAEC6E6) else Color(0xFF607AA0)
    val density = this.density
    val w = size.width.toDouble()
    val h = size.height.toDouble()
    val n = count(size.width / density, size.height / density, 22000f, 55)
    val slant = 0.2                               // a gentle lean, not a storm
    val travelY = h + 60 * density
    val travelX = w + 80 * density
    for (i in 0 until n) {
        val depth = rnd(i, 11)
        val length = (9 + depth * 14) * density
        val speed = (520 + depth * 380) * density
        val alpha = ((0.1 + depth * 0.16) * level).toFloat()
        val width = ((0.6 + depth * 0.5) * density).toFloat()

        val y = (rnd(i, 12) * travelY + speed * t) % travelY - 30 * density
        val x = (rnd(i, 13) * travelX + speed * slant * t) % travelX - 40 * density

        drawLine(
            color = ink.copy(alpha = alpha),
            start = Offset(x.toFloat(), y.toFloat()),
            end = Offset((x - length * slant).toFloat(), (y - length).toFloat()),
            strokeWidth = width,
            cap = StrokeCap.Round
        )
    }
}
