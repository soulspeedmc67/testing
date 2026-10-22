package com.dashit.app.ui.components

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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.request.ImageRequest
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.model.CategoryTile

@Composable
fun CategoryCollageTile(
    tile: CategoryTile,
    modifier: Modifier = Modifier,
    onTap: () -> Unit
) {
    val view = LocalView.current
    val cardShape = RoundedCornerShape(16.dp)
    val extraCount = maxOf(0, tile.productCount - 4)

    Column(
        modifier = modifier
            .fillMaxWidth()
            .pressable(scale = 0.95f) {
                HapticsManager.selection(view)
                onTap()
            },
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Dark Card Housing 2x2 Grid + Badge
        Box(
            modifier = Modifier.fillMaxWidth(),
            contentAlignment = Alignment.BottomCenter
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(cardShape)
                    .background(DashitColors.SurfaceMuted)
                    .border(1.dp, DashitColors.Hairline, cardShape)
                    .padding(5.dp)
            ) {
                // A photo that fails to load is skipped and the next spare takes
                // its cell, so one broken link never leaves a blank square.
                val failed = remember(tile.previewImages) { mutableStateListOf<String>() }
                val photos = tile.previewImages.filterNot { it in failed }
                val onFailed: (String) -> Unit = { if (it !in failed) failed.add(it) }
                if (photos.size >= 4) {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            CollageCell(photos[0], Modifier.weight(1f), onFailed = onFailed)
                            CollageCell(photos[1], Modifier.weight(1f), onFailed = onFailed)
                        }
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            CollageCell(photos[2], Modifier.weight(1f), onFailed = onFailed)
                            CollageCell(photos[3], Modifier.weight(1f), onFailed = onFailed)
                        }
                    }
                } else {
                    CollageCell(
                        url = photos.firstOrNull(),
                        modifier = Modifier.fillMaxWidth(),
                        cornerRadius = 12,
                        onFailed = onFailed
                    )
                }
            }

            // Overlapping "+X more" chip
            if (extraCount > 0) {
                Box(
                    modifier = Modifier
                        .offset(y = 9.dp)
                        .clip(CircleShape)
                        .background(DashitColors.SurfaceRaised)
                        .border(1.dp, DashitColors.HairlineStrong, CircleShape)
                        .padding(horizontal = 7.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "+$extraCount more",
                        color = DashitColors.TextSecondary,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(13.dp))

        // Category Name below card
        Text(
            text = tile.name,
            color = DashitColors.TextPrimary,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
            maxLines = 2,
            minLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 2.dp)
        )
    }
}

@Composable
private fun CollageCell(
    url: String?,
    modifier: Modifier = Modifier,
    cornerRadius: Int = 10,
    onFailed: (String) -> Unit = {}
) {
    val cellShape = RoundedCornerShape(cornerRadius.dp)
    Box(
        modifier = modifier
            .aspectRatio(1f)
            .clip(cellShape)
            .background(DashitColors.SurfaceMuted)
    ) {
        if (!url.isNullOrBlank()) {
            ShimmerImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(url)
                    .crossfade(200)
                    .listener(onError = { _, _ -> onFailed(url) })
                    .build(),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .matchParentSize()
                    .clip(cellShape)
            )
        }
    }
}
