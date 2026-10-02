package com.dashit.app.ui

import com.dashit.app.core.design.AppReveal

import kotlinx.coroutines.withTimeoutOrNull

import kotlinx.coroutines.flow.first

import androidx.compose.runtime.withFrameNanos

import androidx.compose.runtime.snapshotFlow

import android.provider.Settings
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.dashit.app.R
import com.dashit.app.core.design.DashitColors
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val EaseOut = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)
private val EaseInOut = CubicBezierEasing(0.65f, 0f, 0.35f, 1f)
/** A settle with a touch of overshoot, for each letter's pop. */
private val Pop = CubicBezierEasing(0.34f, 1.36f, 0.64f, 1f)

// Lockup geometry, in dp around the screen centre (the same as the iOS SplashView).
private val LogoSize = 114.67.dp
private const val TUCKED_LOGO_X = -82.35f
private const val TUCKED_LOGO_SCALE = 0.5f
private val WordWidth = 158.dp
private val WordHeight = 34.dp
private const val WORD_X = 29.3f
/**
 * The logo's four shapes (each the full logo-sized image, so they line up
 * where they are drawn) and where each flies in from, in dp, and when (ms).
 */
private class LogoPiece(val res: Int, val fromX: Float, val fromY: Float, val delay: Int)
private val LOGO_PIECES = listOf(
    LogoPiece(R.drawable.splash_logo_top, 0f, -34f, 0),
    LogoPiece(R.drawable.splash_logo_bottom, 0f, 34f, 60),
    LogoPiece(R.drawable.splash_logo_arc, 40f, 0f, 140),
    LogoPiece(R.drawable.splash_logo_bar, -72f, 0f, 220)
)
/** Where each letter of the wordmark image starts (d, a, s, h, i, t), cut in the gaps. */
private val LETTER_CUTS = floatArrayOf(0f, 0.1862f, 0.3936f, 0.5727f, 0.7713f, 0.8652f, 1f)

/**
 * Takes over from the plain midnight system splash and hands over to the app,
 * exactly as the iOS `SplashView` does: the logo builds itself, its four
 * shapes flying in and snapping together, then it shrinks and tucks left
 * while the letters of "dashit" pop in from its side one after another, each
 * sliding and settling, in a gentle wave; the lockup lifts away and the
 * backdrop clears onto the app. No blur anywhere: blurring is the costly kind
 * of effect and stuttered while the catalogue was loading underneath.
 */
@Composable
fun SplashOverlay(onReveal: () -> Unit, onFinished: () -> Unit) {
    val context = LocalContext.current
    val pieceMove = remember { List(LOGO_PIECES.size) { Animatable(0f) } } // 0 → 1: fly into place
    val pieceShow = remember { List(LOGO_PIECES.size) { Animatable(0f) } } // 0 → 1: fade in
    val logoRevealScale = remember { Animatable(0.9f) }
    val tuck = remember { Animatable(0f) } // 0 → 1 moves the logo into the lockup
    val letterSettle = remember { List(6) { Animatable(0f) } } // 0 → 1: slide and rise into place
    val letterShow = remember { List(6) { Animatable(0f) } } // 0 → 1: fade in and sharpen
    val lockupAlpha = remember { Animatable(1f) }
    val backdropAlpha = remember { Animatable(1f) }

    // When the letters began: the lift-away follows them at a fixed beat.
    val phaseTwoStarted = remember { kotlinx.coroutines.CompletableDeferred<Unit>() }

    LaunchedEffect(Unit) {
        val reduceMotion = Settings.Global.getFloat(
            context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f
        ) == 0f
        if (reduceMotion) {
            // The finished lockup, faded in and out.
            tuck.snapTo(1f)
            logoRevealScale.snapTo(1f)
            pieceMove.forEach { it.snapTo(1f) }
            letterSettle.forEach { it.snapTo(1f) }
            coroutineScope {
                pieceShow.forEach { launch { it.animateTo(1f, tween(300)) } }
                letterShow.forEach { launch { it.animateTo(1f, tween(300)) } }
            }
            delay(600)
            onReveal()
            coroutineScope {
                launch { lockupAlpha.animateTo(0f, tween(300)) }
                launch { backdropAlpha.animateTo(0f, tween(300)) }
            }
            onFinished()
            return@LaunchedEffect
        }

        coroutineScope {
            // 1. The logo builds itself: its shapes fly in one after another.
            // It waits for the app's first frames (building the whole app the
            // first time takes a few long frames) so its first moves aren't lost.
            launch {
                repeat(4) { withFrameNanos { } }
                delay(60)
                coroutineScope {
                    launch { logoRevealScale.animateTo(1f, tween(700, easing = EaseOut)) }
                    LOGO_PIECES.forEachIndexed { index, piece ->
                        launch { pieceMove[index].animateTo(1f, tween(460, delayMillis = piece.delay, easing = Pop)) }
                        launch { pieceShow[index].animateTo(1f, tween(240, delayMillis = piece.delay, easing = EaseOut)) }
                    }
                }
            }
            // 2. It tucks left, and the letters pop in from its side in a wave,
            // once the home screen underneath has been built (or after 0.9 s
            // at most): building it during the letters made them stutter.
            launch {
                delay(840)
                withTimeoutOrNull(1000) {
                    snapshotFlow { AppReveal.isHomeReady }.first { it }
                    // Then until the main thread is quiet: three frames in a row
                    // on time, so the feed's first layout and photos are done.
                    var onTime = 0
                    var last = withFrameNanos { it }
                    while (onTime < 3) {
                        val now = withFrameNanos { it }
                        onTime = if (now - last < 20_000_000L) onTime + 1 else 0
                        last = now
                    }
                }
                phaseTwoStarted.complete(Unit)
                coroutineScope {
                    launch { tuck.animateTo(1f, tween(560, easing = EaseInOut)) }
                    for (index in 0 until 6) {
                        val start = 220 + 45 * index
                        launch { letterSettle[index].animateTo(1f, tween(480, delayMillis = start, easing = Pop)) }
                        launch { letterShow[index].animateTo(1f, tween(420, delayMillis = start, easing = EaseOut)) }
                    }
                }
            }
            // 3. The splash fades away onto the app, the logo a little ahead of
            // the backdrop so it never hangs over the shop. The shop hears it
            // is on show only after the fade, so its own work can't make the
            // fade skip frames.
            launch {
                phaseTwoStarted.await()
                delay(900)
                // The shop's first real draw is slow on the GPU (~150 ms). Let it
                // happen now, under a backdrop just short of solid (not visible),
                // instead of on the fade's first frame, where it skipped the start.
                backdropAlpha.snapTo(0.99f)
                repeat(6) { withFrameNanos { } }
                delay(60)
                coroutineScope {
                    launch { lockupAlpha.animateTo(0f, tween(200, easing = EaseInOut)) }
                    launch { backdropAlpha.animateTo(0f, tween(340, easing = EaseInOut)) }
                }
                onReveal()
            }
        }
        onFinished()
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer { alpha = backdropAlpha.value }
                .background(DashitColors.Midnight)
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer {
                    alpha = lockupAlpha.value
                }
        ) {
            // Each letter is the wordmark image cut to that letter, so it can move on its own.
            for (index in 0 until 6) {
                val settle = letterSettle[index]
                val show = letterShow[index]
                Image(
                    painter = painterResource(R.drawable.splash_wordmark),
                    contentDescription = null,
                    modifier = Modifier
                        .align(Alignment.Center)
                        .offset(x = WORD_X.dp)
                        .size(WordWidth, WordHeight)
                        .graphicsLayer {
                            translationX = (-14f * (1f - settle.value)).dp.toPx()
                            translationY = (7f * (1f - settle.value)).dp.toPx()
                            alpha = show.value
                        }
                        .drawWithContent {
                            clipRect(
                                left = size.width * LETTER_CUTS[index],
                                top = -size.height,
                                right = size.width * LETTER_CUTS[index + 1],
                                bottom = size.height * 2
                            ) {
                                this@drawWithContent.drawContent()
                            }
                        }
                )
            }
            // The logo: its four shapes, moved together as one.
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(LogoSize)
                    .graphicsLayer {
                        val t = tuck.value
                        val tuckScale = 1f + (TUCKED_LOGO_SCALE - 1f) * t
                        val scale = tuckScale * logoRevealScale.value
                        scaleX = scale
                        scaleY = scale
                        translationX = (TUCKED_LOGO_X * t).dp.toPx()
                    }
            ) {
                LOGO_PIECES.forEachIndexed { index, piece ->
                    val move = pieceMove[index]
                    val show = pieceShow[index]
                    Image(
                        painter = painterResource(piece.res),
                        contentDescription = null,
                        modifier = Modifier
                            .matchParentSize()
                            .graphicsLayer {
                                translationX = (piece.fromX * (1f - move.value)).dp.toPx()
                                translationY = (piece.fromY * (1f - move.value)).dp.toPx()
                                alpha = show.value
                            }
                    )
                }
            }
        }
    }
}
