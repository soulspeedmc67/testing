package com.dashit.app.core.design

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.scale
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.draw.BlurredEdgeTreatment
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp

object DashitMotion {
    val HouseSpring = spring<Float>(
        dampingRatio = 0.75f,
        stiffness = Spring.StiffnessMediumLow
    )

    val SnappySpring = spring<Float>(
        dampingRatio = 0.86f,
        stiffness = Spring.StiffnessMedium
    )

    fun <T> houseSpring() = spring<T>(
        dampingRatio = 0.75f,
        stiffness = Spring.StiffnessMediumLow
    )

    fun <T> snappySpring() = spring<T>(
        dampingRatio = 0.86f,
        stiffness = Spring.StiffnessMedium
    )
}

/**
 * Scales a component down slightly while pressed and springs back on release.
 * Replicates SwiftUI's PressableButtonStyle(scale: 0.96)
 */
fun Modifier.pressable(
    scale: Float = 0.96f,
    onClick: (() -> Unit)? = null
): Modifier = composed {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val animatedScale by animateFloatAsState(
        targetValue = if (isPressed) scale else 1f,
        animationSpec = DashitMotion.SnappySpring,
        label = "pressable_scale"
    )

    this
        .scale(animatedScale)
        .then(
            if (onClick != null) {
                Modifier.clickable(
                    interactionSource = interactionSource,
                    indication = null,
                    onClick = onClick
                )
            } else {
                Modifier
            }
        )
}


/**
 * Comes into focus out of a soft blur, sliding up a little, `index` steps
 * after the first item: for the address sheet's text as it opens.
 */
fun Modifier.blurReveal(index: Int, blurRadius: Float = 8f): Modifier = composed {
    var shown by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { shown = true }
    val progress by animateFloatAsState(
        targetValue = if (shown) 1f else 0f,
        animationSpec = tween(durationMillis = 450, delayMillis = 60 + 50 * index.coerceAtMost(8), easing = FastOutSlowInEasing),
        label = "blurReveal"
    )
    this
        .graphicsLayer {
            alpha = progress
            translationY = (1f - progress) * 10.dp.toPx()
        }
        .blur(((1f - progress) * blurRadius).dp, BlurredEdgeTreatment.Unbounded)
}

/**
 * Whether the shop can be seen yet. The app covers its first seconds with the
 * splash (and, on the very first launch, the welcome sign-in), so entrance
 * animations wait for this instead of playing unseen underneath.
 */
object AppReveal {
    /** Set by an activity that covers its first frames and calls [reveal] when they clear. */
    var coversLaunch = false
    var isRevealed by mutableStateOf(false)
        private set

    val canPlay: Boolean get() = isRevealed || !coversLaunch

    /**
     * True once the shop's home screen has its products on screen. The splash
     * holds its finished logo until then, so the letters and the hand-over
     * play on a main thread that isn't busy building the feed.
     */
    var isHomeReady by mutableStateOf(false)
        private set

    fun homeReady() {
        isHomeReady = true
    }

    fun reveal() {
        isRevealed = true
    }
}

/** Remembers, for this launch only, which entrance animations have played. */
object LaunchReveal {
    private val played = mutableSetOf<String>()
    fun hasPlayed(key: String) = key in played
    fun markPlayed(key: String) { played += key }
}

/**
 * Slides in from the left, `index` steps after the first item, the first time
 * `key` is shown in this launch; already in place every time after that.
 */
fun Modifier.slideInFromLeft(key: String, index: Int, isReady: Boolean = true): Modifier = composed {
    val alreadyPlayed = remember { LaunchReveal.hasPlayed(key) }
    var shown by remember { mutableStateOf(alreadyPlayed) }
    val canPlay = AppReveal.canPlay
    LaunchedEffect(isReady, canPlay) {
        // Waits for something to show and for the splash to clear.
        if (isReady && canPlay && !shown) {
            // A beat after the layout lands, then each item a little after the one before.
            kotlinx.coroutines.delay(120L + 55L * index.coerceAtMost(10))
            LaunchReveal.markPlayed(key)
            shown = true
        }
    }
    val progress by animateFloatAsState(
        targetValue = if (shown) 1f else 0f,
        animationSpec = spring(dampingRatio = 0.82f, stiffness = Spring.StiffnessLow),
        label = "slideInFromLeft"
    )
    this.graphicsLayer {
        alpha = progress.coerceIn(0f, 1f)
        translationX = (1f - progress) * -56.dp.toPx()
        scaleX = 0.86f + 0.14f * progress
        scaleY = 0.86f + 0.14f * progress
        transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0f, 0.5f)
    }
}
