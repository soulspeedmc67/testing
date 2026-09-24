package com.dashit.app.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.FlyParticle
import com.dashit.app.core.design.FlyToCartManager
import kotlin.math.PI
import kotlin.math.roundToInt
import kotlin.math.sin

@Composable
fun FlyToCartOverlay(
    modifier: Modifier = Modifier
) {
    val particles by FlyToCartManager.particles.collectAsState()

    Box(
        modifier = modifier.fillMaxSize()
    ) {
        particles.forEach { particle ->
            SingleFlyingParticle(
                particle = particle,
                onFinished = { FlyToCartManager.onParticleLanded(particle.id) }
            )
        }
    }
}

@Composable
private fun SingleFlyingParticle(
    particle: FlyParticle,
    onFinished: () -> Unit
) {
    val context = LocalContext.current
    val density = LocalDensity.current
    val progress = remember { Animatable(0f) }

    LaunchedEffect(particle.id) {
        progress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 520, easing = FastOutSlowInEasing)
        )
        onFinished()
    }

    val p = progress.value
    // Parabolic arc: X moves from start to end; Y leaps upwards (-80dp peak) before descending
    val currentX = particle.startX + (particle.targetX - particle.startX) * p
    val arcHeight = with(density) { 90.dp.toPx() }
    val currentY = (particle.startY + (particle.targetY - particle.startY) * p) - sin(p * PI.toFloat()) * arcHeight

    val scale = if (p < 0.25f) {
        1f + (p / 0.25f) * 0.3f
    } else {
        1.3f - ((p - 0.25f) / 0.75f) * 0.85f
    }

    val rotation = (p * 28f)
    val alpha = if (p > 0.82f) 1f - ((p - 0.82f) / 0.18f) else 1f

    Box(
        modifier = Modifier
            .offset { IntOffset(currentX.roundToInt() - 24, currentY.roundToInt() - 24) }
            .scale(scale)
            .rotate(rotation)
            .alpha(alpha.coerceIn(0f, 1f))
            .size(52.dp)
            .shadow(12.dp, RoundedCornerShape(16.dp))
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White)
            .border(2.dp, DashitColors.BrandOrange, RoundedCornerShape(16.dp))
    ) {
        AsyncImage(
            model = ImageRequest.Builder(context)
                .data(particle.imageUrl)
                .crossfade(true)
                .build(),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )
    }
}
