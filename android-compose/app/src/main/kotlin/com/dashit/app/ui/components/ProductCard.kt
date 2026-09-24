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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.FlyToCartManager
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.model.Product

@Composable
fun ProductCard(
    product: Product,
    quantity: Int,
    modifier: Modifier = Modifier,
    onOpen: () -> Unit,
    onAdd: () -> Unit,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit
) {
    val view = LocalView.current
    val tileShape = RoundedCornerShape(14.dp)
    val imageShape = RoundedCornerShape(10.dp)

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(tileShape)
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, tileShape)
            .pressable(scale = 0.97f) {
                HapticsManager.selection(view)
                onOpen()
            }
            .padding(8.dp)
    ) {
        // Image Well with Overlays
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .clip(imageShape)
                .background(DashitColors.SurfaceMuted)
        ) {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(product.img)
                    .crossfade(200)
                    .build(),
                contentDescription = product.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .matchParentSize()
                    .clip(imageShape)
            )

            // Discount Badge (Top-Left)
            val discount = product.discountPercent
            if (discount != null && discount > 0) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(5.dp)
                        .clip(RoundedCornerShape(5.dp))
                        .background(DashitColors.BrandOrange)
                        .padding(horizontal = 5.dp, vertical = 2.5.dp)
                ) {
                    Text(
                        text = "$discount% OFF",
                        color = Color.White,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }

            // Quantity Stepper (Bottom-Right overlay)
            var stepperCenter by remember { mutableStateOf(Offset.Zero) }
            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(5.dp)
                    .onGloballyPositioned { coords ->
                        val pos = coords.positionInRoot()
                        stepperCenter = Offset(
                            pos.x + coords.size.width / 2f,
                            pos.y + coords.size.height / 2f
                        )
                    }
            ) {
                QuantityStepper(
                    quantity = quantity,
                    size = StepperSize.COMPACT,
                    isEnabled = product.isAvailable,
                    onAdd = {
                        FlyToCartManager.trigger(product.img, stepperCenter)
                        onAdd()
                    },
                    onIncrement = {
                        FlyToCartManager.trigger(product.img, stepperCenter)
                        onIncrement()
                    },
                    onDecrement = onDecrement
                )
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Unit chip & options badge
        Row(
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(4.dp))
                    .background(DashitColors.SurfaceMuted)
                    .padding(horizontal = 5.dp, vertical = 2.dp)
            ) {
                Text(
                    text = product.unit,
                    color = DashitColors.TextSecondary,
                    fontSize = 10.5.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1
                )
            }

            if (!product.options.isNullOrBlank()) {
                Text(
                    text = product.options,
                    color = DashitColors.TextMuted,
                    fontSize = 10.5.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1
                )
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        // Product Name (2 lines fixed height)
        Text(
            text = product.name,
            color = DashitColors.TextPrimary,
            fontSize = 12.5.sp,
            fontWeight = FontWeight.SemiBold,
            maxLines = 2,
            minLines = 2,
            overflow = TextOverflow.Ellipsis,
            lineHeight = 16.sp
        )

        Spacer(modifier = Modifier.height(6.dp))

        // Price Row
        Row(
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = product.displayPrice,
                color = DashitColors.TextPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )

            product.displayOriginalPrice?.let { original ->
                Text(
                    text = original,
                    color = DashitColors.TextFaint,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    textDecoration = TextDecoration.LineThrough
                )
            }
        }
    }
}
