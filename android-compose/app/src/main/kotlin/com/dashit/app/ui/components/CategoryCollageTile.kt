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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
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
    val tileShape = RoundedCornerShape(18.dp)
    val extraCount = maxOf(0, tile.productCount - 4)

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(tileShape)
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, tileShape)
            .pressable(scale = 0.96f) {
                HapticsManager.selection(view)
                onTap()
            }
            .padding(6.dp)
            .padding(bottom = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // 2x2 Collage Container with overlapping +X more badge
        Box(
            modifier = Modifier.fillMaxWidth(),
            contentAlignment = Alignment.BottomCenter
        ) {
            if (tile.previewImages.size >= 4) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        CollageCell(tile.previewImages[0], Modifier.weight(1f))
                        CollageCell(tile.previewImages[1], Modifier.weight(1f))
                    }
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        CollageCell(tile.previewImages[2], Modifier.weight(1f))
                        CollageCell(tile.previewImages[3], Modifier.weight(1f))
                    }
                }
            } else {
                CollageCell(
                    url = tile.previewImages.firstOrNull(),
                    modifier = Modifier.fillMaxWidth(),
                    cornerRadius = 14
                )
            }

            // Overlapping "+X more" chip
            if (extraCount > 0) {
                Box(
                    modifier = Modifier
                        .offset(y = 10.dp)
                        .clip(CircleShape)
                        .background(DashitColors.SurfaceOverlay)
                        .border(1.dp, DashitColors.HairlineStrong, CircleShape)
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "+$extraCount more",
                        color = DashitColors.TextSecondary,
                        fontSize = 10.5.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Category Name
        Text(
            text = tile.name,
            color = DashitColors.TextPrimary,
            fontSize = 13.sp,
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
    cornerRadius: Int = 10
) {
    val cellShape = RoundedCornerShape(cornerRadius.dp)
    Box(
        modifier = modifier
            .aspectRatio(1f)
            .clip(cellShape)
            .background(DashitColors.SurfaceMuted)
    ) {
        if (!url.isNullOrBlank()) {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(url)
                    .crossfade(200)
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
