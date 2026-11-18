package com.dashit.app.ui.components

import androidx.compose.animation.core.animate
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Velocity
import androidx.compose.ui.unit.dp
import com.dashit.app.core.design.DashitColors
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin

/**
 * The home screen's pull-down flourish. Pulling the home list down past the top
 * (people do it a lot) moves the list down and shows the DASHit mark in the gap:
 * it grows in with the finger while its orange dash slides in from the left
 * with two thin speed lines, as if dashing into place. At a full pull it snaps
 * with a light haptic tick; letting go, the list springs back. Nothing is
 * reloaded (the home feed is already live). Same drawing and timings as the
 * iPhone app (HomePullDash.swift).
 *
 * Put [connection] on the list with Modifier.nestedScroll, offset the list by
 * [pull], and draw [HomePullDash] behind it.
 */
@Stable
class HomePullState(
    private val thresholdPx: Float,
    private val maxPx: Float,
    private val onSnap: () -> Unit
) {
    var pull by mutableFloatStateOf(0f)
        private set
    private var armed = false

    val progress: Float get() = (pull / thresholdPx).coerceIn(0f, 1f)
    val isArmed: Boolean get() = pull >= thresholdPx

    private fun movePull(value: Float) {
        pull = value.coerceIn(0f, maxPx)
        if (!armed && pull >= thresholdPx) {
            armed = true
            onSnap()
        } else if (armed && pull < thresholdPx * 0.6f) {
            armed = false
        }
    }

    val connection = object : NestedScrollConnection {
        // Pushing back up while pulled: take it out of the pull first.
        override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
            if (pull > 0f && available.y < 0f) {
                val before = pull
                movePull(pull + available.y)
                return Offset(0f, pull - before)
            }
            return Offset.Zero
        }

        // The list is at its top and the finger still pulls down: that is ours (with some resistance).
        override fun onPostScroll(consumed: Offset, available: Offset, source: NestedScrollSource): Offset {
            if (source == NestedScrollSource.UserInput && available.y > 0f) {
                movePull(pull + available.y * 0.5f)
                return Offset(0f, available.y)
            }
            return Offset.Zero
        }

        // Let go: spring back, and keep the fling from also scrolling the list.
        override suspend fun onPreFling(available: Velocity): Velocity {
            if (pull <= 0f) return Velocity.Zero
            animate(pull, 0f, animationSpec = spring(dampingRatio = 0.72f, stiffness = 420f)) { value, _ -> pull = value }
            armed = false
            return available
        }
    }
}

/** The gap above the pulled-down list, in the header's own colour, with the mark in it. */
@Composable
fun HomePullDash(state: HomePullState, modifier: Modifier = Modifier) {
    val snapScale by animateFloatAsState(
        targetValue = if (state.isArmed) 1.08f else 1f,
        animationSpec = spring(dampingRatio = 0.45f, stiffness = 600f),
        label = "homePullSnap"
    )
    if (state.pull <= 0.5f) return
    val dark = DashitColors.isDark
    // The header keeps the status bar's room at its top, so the gap the pull
    // opens shows below the status bar: centre the mark there, not under the clock.
    val statusBar = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
    val height = with(LocalDensity.current) { state.pull.toDp() } + statusBar
    val progress = state.progress
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .background(if (dark) Color(0xFF8C5D08) else Color(0xFFFFD9B8))
            .padding(top = statusBar),
        contentAlignment = Alignment.Center
    ) {
        DashMark(
            progress = progress,
            ink = if (dark) Color.White else Color(0xFF061838),
            modifier = Modifier
                .size(width = 101.dp, height = 46.dp)
                .graphicsLayer {
                    val s = (0.6f + 0.4f * progress) * snapScale
                    scaleX = s
                    scaleY = s
                    alpha = min(1f, progress * 1.4f)
                }
        )
    }
}

private val DashOrange = Color(0xFFFF5B00)

/** The DASHit mark (two blocks, the D's bowl, the orange dash) drawn as shapes; `progress` 0..1. */
@Composable
fun DashMark(progress: Float, ink: Color, modifier: Modifier = Modifier) {
    Canvas(modifier) { drawDashMark(progress.coerceIn(0f, 1f), ink) }
}

private fun DrawScope.drawDashMark(t: Float, ink: Color) {
    val s = min(size.width, size.height)
    val ox = (size.width - s) / 2f
    fun rect(x: Float, y: Float, w: Float, h: Float, color: Color, radius: Float) {
        drawRoundRect(color, topLeft = Offset(ox + x * s, y * s), size = Size(w * s, h * s), cornerRadius = CornerRadius(radius * s))
    }
    val eased = 1f - (1f - t).pow(3)

    // The two blocks.
    rect(0.15f, 0.09f, 0.30f, 0.21f, ink, 0.05f)
    rect(0.15f, 0.70f, 0.33f, 0.21f, ink, 0.05f)

    // The D's bowl: the right half of a ring, traced point by point.
    val cx = ox + 0.50f * s
    val cy = 0.50f * s
    val outer = 0.41f * s
    val inner = 0.20f * s
    val steps = 28
    val bowl = Path()
    for (i in 0..steps) {
        val a = -PI / 2 + PI * i / steps
        val x = cx + outer * cos(a).toFloat()
        val y = cy + outer * sin(a).toFloat()
        if (i == 0) bowl.moveTo(x, y) else bowl.lineTo(x, y)
    }
    for (i in steps downTo 0) {
        val a = -PI / 2 + PI * i / steps
        bowl.lineTo(cx + inner * cos(a).toFloat(), cy + inner * sin(a).toFloat())
    }
    bowl.close()
    drawPath(bowl, ink)

    // The dash: slides in from the left, a little stretched while it moves.
    val restWidth = 0.395f
    val width = restWidth * (1f + (1f - eased) * 0.6f)
    val x = 0.085f - (1f - eased) * 0.9f - (width - restWidth)
    rect(x, 0.435f, width, 0.13f, DashOrange, 0.065f)

    // Two speed lines behind it while it moves.
    val streak = (sin(PI * t) * 0.7).toFloat()
    if (streak > 0.02f) {
        rect(x - 0.26f, 0.405f, 0.18f, 0.045f, DashOrange.copy(alpha = streak), 0.0225f)
        rect(x - 0.20f, 0.55f, 0.12f, 0.045f, DashOrange.copy(alpha = streak * 0.7f), 0.0225f)
    }
}
