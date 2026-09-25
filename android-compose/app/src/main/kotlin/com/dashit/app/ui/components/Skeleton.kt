package com.dashit.app.ui.components

import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.withFrameMillis
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.dashit.app.core.design.DashitColors

// Skeleton loading, the same as the iOS app's: muted shapes laid out like the
// content that is coming, with one soft highlight sweeping across them. Every
// skeleton reads the frame clock and its position on screen, so the highlight
// crosses the whole screen as one band instead of each block flickering alone.

private const val SHIMMER_PERIOD_MS = 1600L
private val ShimmerBand = 180.dp
private val ShimmerSweep = 520.dp
private val ShimmerHighlight = Color.White.copy(alpha = 0.06f)

/** Sweeps the skeleton highlight across this view's shapes. */
fun Modifier.shimmer(): Modifier = composed {
    val context = LocalContext.current
    val animationsOff = remember {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    }
    if (animationsOff) return@composed this

    val frameTime by produceState(0L) {
        while (true) withFrameMillis { value = it }
    }
    var rootX by remember { mutableFloatStateOf(0f) }
    this
        .onGloballyPositioned { rootX = it.positionInRoot().x }
        // Offscreen, so the highlight only lands on the shapes already drawn.
        .graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }
        .drawWithContent {
            drawContent()
            val band = ShimmerBand.toPx()
            val progress = (frameTime % SHIMMER_PERIOD_MS) / SHIMMER_PERIOD_MS.toFloat()
            val start = -band + progress * (ShimmerSweep.toPx() + band) - rootX
            drawRect(
                brush = Brush.horizontalGradient(
                    colors = listOf(Color.Transparent, ShimmerHighlight, Color.Transparent),
                    startX = start,
                    endX = start + band
                ),
                blendMode = BlendMode.SrcAtop
            )
        }
}

/** One muted placeholder shape. */
@Composable
fun SkeletonBlock(width: Dp? = null, height: Dp, cornerRadius: Dp = 6.dp, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .then(if (width != null) Modifier.width(width) else Modifier.fillMaxWidth())
            .height(height)
            .clip(RoundedCornerShape(cornerRadius))
            .background(DashitColors.SurfaceMuted)
    )
}

/**
 * An image that shimmers while it downloads, then fades in. Takes the same
 * arguments as Coil's AsyncImage.
 */
@Composable
fun ShimmerImage(
    model: Any?,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop
) {
    // Keyed on the image address, not the request object, which is rebuilt on every recomposition.
    val key = (model as? ImageRequest)?.data ?: model
    val hasSource = key != null && key.toString().isNotBlank()
    var isLoading by remember(key) { mutableStateOf(hasSource) }
    Box(modifier = modifier) {
        if (isLoading) {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .background(DashitColors.SurfaceMuted)
                    .shimmer()
            )
        }
        AsyncImage(
            model = model,
            contentDescription = contentDescription,
            contentScale = contentScale,
            modifier = Modifier.matchParentSize(),
            onSuccess = { isLoading = false },
            onError = { isLoading = false }
        )
    }
}

/** A product card in the layout of `ProductCard`. */
@Composable
fun ProductCardSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, RoundedCornerShape(14.dp))
            .padding(8.dp),
        verticalArrangement = Arrangement.spacedBy(7.dp)
    ) {
        Box(
            Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .clip(RoundedCornerShape(10.dp))
                .background(DashitColors.SurfaceMuted)
        )
        SkeletonBlock(width = 42.dp, height = 10.dp, cornerRadius = 4.dp)
        SkeletonBlock(height = 11.dp)
        SkeletonBlock(width = 70.dp, height = 11.dp)
        Row(Modifier.fillMaxWidth().padding(top = 2.dp), verticalAlignment = Alignment.CenterVertically) {
            SkeletonBlock(width = 38.dp, height = 14.dp)
            Spacer(Modifier.weight(1f))
            SkeletonBlock(width = 52.dp, height = 28.dp, cornerRadius = 8.dp)
        }
    }
}

/** The home feed while the catalogue loads: tiles, then a product rail. */
@Composable
fun HomeFeedSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .shimmer()
            .semantics { contentDescription = "Loading" }
    ) {
        SkeletonBlock(width = 130.dp, height = 18.dp, modifier = Modifier.padding(top = 18.dp, bottom = 12.dp))
        repeat(2) {
            Row(Modifier.fillMaxWidth().padding(vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                repeat(3) {
                    Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .aspectRatio(1f)
                                .clip(RoundedCornerShape(18.dp))
                                .background(DashitColors.SurfaceMuted)
                        )
                        SkeletonBlock(width = 64.dp, height = 10.dp)
                    }
                }
            }
        }
        SkeletonBlock(width = 140.dp, height = 18.dp, modifier = Modifier.padding(top = 26.dp, bottom = 12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            repeat(3) { ProductCardSkeleton(Modifier.weight(1f)) }
        }
    }
}

/** A grid of product cards while products load. */
@Composable
fun ProductGridSkeleton(columns: Int = 2, rows: Int = 3, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.shimmer().semantics { contentDescription = "Loading" },
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        repeat(rows) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                repeat(columns) { ProductCardSkeleton(Modifier.weight(1f)) }
            }
        }
    }
}

/** The category sidebar while categories load. */
@Composable
fun CategorySidebarSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.padding(vertical = 12.dp).shimmer(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        repeat(7) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Box(Modifier.size(52.dp).clip(RoundedCornerShape(14.dp)).background(DashitColors.SurfaceMuted))
                SkeletonBlock(width = 50.dp, height = 8.dp)
            }
        }
    }
}

/** Order cards in the layout of the order history while it loads. */
@Composable
fun OrderListSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.shimmer().semantics { contentDescription = "Loading your orders" },
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        repeat(3) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .background(DashitColors.SurfaceRaised)
                    .border(1.dp, DashitColors.Hairline, RoundedCornerShape(18.dp))
                    .padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        SkeletonBlock(width = 120.dp, height = 13.dp)
                        SkeletonBlock(width = 84.dp, height = 10.dp)
                    }
                    SkeletonBlock(width = 70.dp, height = 22.dp, cornerRadius = 11.dp)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    repeat(4) { SkeletonBlock(width = 44.dp, height = 44.dp, cornerRadius = 10.dp) }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    SkeletonBlock(width = 90.dp, height = 12.dp)
                    Spacer(Modifier.weight(1f))
                    SkeletonBlock(width = 96.dp, height = 32.dp, cornerRadius = 10.dp)
                }
            }
        }
    }
}

/** The dark order card on the tracking map while the order loads. */
@Composable
fun TrackingCardSkeleton(modifier: Modifier = Modifier) {
    val bar = Color.White.copy(alpha = 0.1f)
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(DashitColors.TrackerCard)
            .border(1.dp, Color.White.copy(alpha = 0.1f), RoundedCornerShape(24.dp))
            .padding(16.dp)
            .semantics { contentDescription = "Loading your order" },
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Column(modifier = Modifier.shimmer(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.width(150.dp).height(15.dp).clip(RoundedCornerShape(6.dp)).background(bar))
                Spacer(Modifier.weight(1f))
                Box(Modifier.width(80.dp).height(15.dp).clip(RoundedCornerShape(6.dp)).background(bar))
            }
            Box(Modifier.width(200.dp).height(11.dp).clip(RoundedCornerShape(5.dp)).background(bar))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.size(26.dp).clip(CircleShape).background(bar))
                Box(Modifier.weight(1f).height(3.dp).clip(CircleShape).background(bar))
                Box(Modifier.size(26.dp).clip(CircleShape).background(bar))
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.width(110.dp).height(12.dp).clip(RoundedCornerShape(6.dp)).background(bar))
                Spacer(Modifier.weight(1f))
                Box(Modifier.width(108.dp).height(32.dp).clip(RoundedCornerShape(10.dp)).background(bar))
            }
        }
    }
}
