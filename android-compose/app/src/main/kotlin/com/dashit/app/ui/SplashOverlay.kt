package com.dashit.app.ui

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
import androidx.compose.ui.draw.BlurredEdgeTreatment
import androidx.compose.ui.draw.blur
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
private val EaseIn = CubicBezierEasing(0.55f, 0f, 1f, 0.45f)
private val EaseInOut = CubicBezierEasing(0.65f, 0f, 0.35f, 1f)

// Lockup geometry, in dp around the screen centre (the same as the iOS SplashView).
private val LogoSize = 114.67.dp
private const val TUCKED_LOGO_X = -82.35f
private const val TUCKED_LOGO_SCALE = 0.5f
private val WordWidth = 158.dp
private val WordHeight = 34.dp
private const val WORD_X = 29.3f
/** The wipe's left edge in the wordmark's own dp, following the logo's right edge. */
private const val WIPE_START = 98.4f
private const val WIPE_END = -8.3f

/**
 * Takes over from the plain midnight system splash and hands over to the app,
 * exactly as the iOS `SplashView` does: the logo sharpens out of a blur, then
 * shrinks and tucks left while the "dashit" wordmark is uncovered behind it,
 * sharpening as it appears; the lockup lifts away in a blur and the backdrop
 * clears onto the app. (Blur needs Android 12+; older phones get the same
 * motion without it.)
 */
@Composable
fun SplashOverlay(onReveal: () -> Unit, onFinished: () -> Unit) {
    val context = LocalContext.current
    val logoAlpha = remember { Animatable(0f) }
    val logoBlur = remember { Animatable(14f) }
    val logoRevealScale = remember { Animatable(0.86f) }
    val tuck = remember { Animatable(0f) } // 0 → 1 drives the logo move and the wipe together
    val wordAlpha = remember { Animatable(0f) }
    val wordBlur = remember { Animatable(8f) }
    val lockupScale = remember { Animatable(1f) }
    val lockupBlur = remember { Animatable(0f) }
    val lockupAlpha = remember { Animatable(1f) }
    val backdropAlpha = remember { Animatable(1f) }

    LaunchedEffect(Unit) {
        val reduceMotion = Settings.Global.getFloat(
            context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f
        ) == 0f
        if (reduceMotion) {
            // The finished lockup, faded in and out.
            tuck.snapTo(1f)
            logoBlur.snapTo(0f)
            logoRevealScale.snapTo(1f)
            wordBlur.snapTo(0f)
            coroutineScope {
                launch { logoAlpha.animateTo(1f, tween(300)) }
                launch { wordAlpha.animateTo(1f, tween(300)) }
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
            // 1. The logo sharpens out of a blur.
            launch {
                delay(120)
                coroutineScope {
                    launch { logoAlpha.animateTo(1f, tween(520, easing = EaseOut)) }
                    launch { logoBlur.animateTo(0f, tween(520, easing = EaseOut)) }
                    launch { logoRevealScale.animateTo(1f, tween(520, easing = EaseOut)) }
                }
            }
            // 2. It tucks left and the wordmark is uncovered behind it.
            launch {
                delay(760)
                coroutineScope {
                    launch { tuck.animateTo(1f, tween(560, easing = EaseInOut)) }
                    launch { wordAlpha.animateTo(1f, tween(480, delayMillis = 80, easing = EaseOut)) }
                    launch { wordBlur.animateTo(0f, tween(480, delayMillis = 80, easing = EaseOut)) }
                }
            }
            // 3. The lockup lifts away and the backdrop clears onto the app.
            launch {
                delay(1590)
                coroutineScope {
                    launch { lockupScale.animateTo(1.08f, tween(320, easing = EaseIn)) }
                    launch { lockupBlur.animateTo(8f, tween(320, easing = EaseIn)) }
                    launch { lockupAlpha.animateTo(0f, tween(320, easing = EaseIn)) }
                    launch { backdropAlpha.animateTo(0f, tween(380, delayMillis = 80, easing = EaseOut)) }
                    launch {
                        delay(80)
                        onReveal()
                    }
                }
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
                    scaleX = lockupScale.value
                    scaleY = lockupScale.value
                    alpha = lockupAlpha.value
                }
                .blur(lockupBlur.value.dp, BlurredEdgeTreatment.Unbounded)
        ) {
            Image(
                painter = painterResource(R.drawable.splash_wordmark),
                contentDescription = null,
                modifier = Modifier
                    .align(Alignment.Center)
                    .offset(x = WORD_X.dp)
                    .size(WordWidth, WordHeight)
                    .graphicsLayer { alpha = wordAlpha.value }
                    .blur(wordBlur.value.dp, BlurredEdgeTreatment.Unbounded)
                    .drawWithContent {
                        val wipe = (WIPE_START + (WIPE_END - WIPE_START) * tuck.value).dp.toPx()
                        clipRect(left = wipe, top = -size.height, right = size.width * 2, bottom = size.height * 2) {
                            this@drawWithContent.drawContent()
                        }
                    }
            )
            Image(
                painter = painterResource(R.drawable.splash_logo),
                contentDescription = null,
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
                        alpha = logoAlpha.value
                    }
                    .blur(logoBlur.value.dp, BlurredEdgeTreatment.Unbounded)
            )
        }
    }
}
