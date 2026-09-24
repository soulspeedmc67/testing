package com.dashit.app.ui

import android.provider.Settings
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.dashit.app.R
import com.dashit.app.core.design.DashitColors
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val EaseOut = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)
private val EaseIn = CubicBezierEasing(0.55f, 0f, 1f, 0.45f)
/** The launch mark's size on the system splash (see `splash_launch_icon.xml`). */
private val MarkSize = 114.67.dp

/**
 * Picks up from the system splash and hands over to the app, the same
 * sequence as the iOS `SplashView`: the first frame is the system splash
 * exactly, then the orange dash winds back and streaks off, the mark zooms
 * away and the midnight backdrop clears onto the app.
 */
@Composable
fun SplashOverlay(onReveal: () -> Unit, onFinished: () -> Unit) {
    val context = LocalContext.current
    val density = LocalDensity.current
    val travelPx = with(density) { LocalConfiguration.current.screenWidthDp.dp.toPx() }
    val dashOffset = remember { Animatable(0f) }
    val dashStretch = remember { Animatable(1f) }
    val markScale = remember { Animatable(1f) }
    val markAlpha = remember { Animatable(1f) }
    val backdropAlpha = remember { Animatable(1f) }

    LaunchedEffect(Unit) {
        val reduceMotion = Settings.Global.getFloat(
            context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f
        ) == 0f
        if (reduceMotion) {
            delay(200)
            onReveal()
            coroutineScope {
                launch { backdropAlpha.animateTo(0f, tween(300)) }
                launch { markAlpha.animateTo(0f, tween(300)) }
            }
            onFinished()
            return@LaunchedEffect
        }

        // Hold the launch frame a beat, so the handoff is invisible.
        delay(150)
        // Wind-up: the dash pulls back and the mark tightens.
        val windBack = with(density) { (-7).dp.toPx() }
        coroutineScope {
            launch { dashOffset.animateTo(windBack, tween(220, easing = EaseOut)) }
            launch { markScale.animateTo(0.96f, tween(220, easing = EaseOut)) }
        }
        // The dash streaks off; the mark zooms away and the backdrop clears.
        coroutineScope {
            launch { dashOffset.animateTo(travelPx, tween(320, easing = EaseIn)) }
            launch { dashStretch.animateTo(3.2f, tween(320, easing = EaseIn)) }
            launch { markScale.animateTo(1.3f, tween(280, delayMillis = 20, easing = EaseIn)) }
            launch { markAlpha.animateTo(0f, tween(200, delayMillis = 20, easing = EaseOut)) }
            launch { backdropAlpha.animateTo(0f, tween(340, delayMillis = 90, easing = EaseOut)) }
            launch {
                delay(10)
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
        Image(
            painter = painterResource(R.drawable.splash_mark_white),
            contentDescription = null,
            modifier = Modifier
                .align(Alignment.Center)
                .size(MarkSize)
                .graphicsLayer {
                    scaleX = markScale.value
                    scaleY = markScale.value
                    alpha = markAlpha.value
                }
        )
        Image(
            painter = painterResource(R.drawable.splash_mark_dash),
            contentDescription = null,
            modifier = Modifier
                .align(Alignment.Center)
                .size(MarkSize)
                .graphicsLayer {
                    translationX = dashOffset.value
                    scaleX = dashStretch.value
                    // Stretch from the dash's left end.
                    transformOrigin = TransformOrigin(0.084f, 0.497f)
                }
        )
    }
}
