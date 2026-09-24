package com.dashit.app.ui.sheet

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SheetState
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.FlyToCartManager
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.model.Product
import com.dashit.app.data.model.ProductVariant
import com.dashit.app.ui.components.QuantityStepper
import com.dashit.app.ui.components.StepperSize

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductDetailSheet(
    product: Product?,
    quantity: Int,
    sheetState: SheetState,
    onDismiss: () -> Unit,
    onAdd: (Product, ProductVariant?) -> Unit,
    onIncrement: (Product, ProductVariant?) -> Unit,
    onDecrement: (Product) -> Unit
) {
    if (product == null) return

    val view = LocalView.current
    val variants = product.variants ?: emptyList()
    var selectedVariant by remember(product.id) { mutableStateOf(variants.firstOrNull()) }

    val activePrice = selectedVariant?.price ?: product.price
    val activeOriginalPrice = selectedVariant?.originalPrice ?: product.originalPrice
    val activeUnit = selectedVariant?.unit ?: product.unit

    BackHandler {
        onDismiss()
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = DashitColors.Surface,
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(vertical = 10.dp)
                    .width(42.dp)
                    .height(4.5.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(DashitColors.HairlineStrong)
            )
        }
    ) {
        Column(
            modifier = Modifier.fillMaxWidth()
        ) {
            // Scrollable Content
            Column(
                modifier = Modifier
                    .weight(1f, fill = false)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp)
            ) {
                // Large Hero Image
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(DashitColors.SurfaceRaised)
                ) {
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(product.img)
                            .crossfade(250)
                            .build(),
                        contentDescription = product.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.matchParentSize()
                    )

                    // Circular Close Button (Top-Right)
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(10.dp)
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.6f))
                            .pressable(scale = 0.90f) {
                                HapticsManager.light(view)
                                onDismiss()
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Category & ETA tag
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = product.cat.uppercase(),
                        color = DashitColors.BrandOrange,
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.sp
                    )

                    Text(text = "·", color = DashitColors.TextFaint, fontSize = 12.sp)

                    Icon(
                        imageVector = Icons.Outlined.Timer,
                        contentDescription = null,
                        tint = DashitColors.TextMuted,
                        modifier = Modifier.padding(top = 1.dp)
                    )

                    Text(
                        text = product.time ?: "8 mins",
                        color = DashitColors.TextMuted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Product Title
                Text(
                    text = product.name,
                    color = DashitColors.TextPrimary,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.ExtraBold,
                    lineHeight = 28.sp
                )

                Spacer(modifier = Modifier.height(6.dp))

                // Rating row
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.Star,
                        contentDescription = null,
                        tint = DashitColors.Caution,
                        modifier = Modifier.padding(bottom = 1.dp)
                    )
                    Text(
                        text = product.rating ?: "4.8",
                        color = DashitColors.TextPrimary,
                        fontSize = 13.5.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "(${product.ratingCount ?: "120"} ratings)",
                        color = DashitColors.TextMuted,
                        fontSize = 13.5.sp
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Price display
                Row(
                    verticalAlignment = Alignment.Bottom,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "₹${activePrice.toInt()}",
                        color = DashitColors.TextPrimary,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Black
                    )

                    activeOriginalPrice?.let { orig ->
                        if (orig > activePrice) {
                            Text(
                                text = "₹${orig.toInt()}",
                                color = DashitColors.TextFaint,
                                fontSize = 16.sp,
                                textDecoration = TextDecoration.LineThrough,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                        }
                    }
                }

                Text(
                    text = "$activeUnit · Inclusive of all taxes",
                    color = DashitColors.TextSecondary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )

                // "Select unit" variants selector cards
                if (variants.size > 1) {
                    Spacer(modifier = Modifier.height(22.dp))
                    Text(
                        text = "Select unit",
                        color = DashitColors.TextPrimary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        variants.forEach { v ->
                            val isSelected = selectedVariant?.id == v.id
                            val cardShape = RoundedCornerShape(14.dp)

                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(cardShape)
                                    .background(DashitColors.SurfaceRaised)
                                    .border(
                                        width = if (isSelected) 2.dp else 1.dp,
                                        color = if (isSelected) DashitColors.BrandOrange else DashitColors.Hairline,
                                        shape = cardShape
                                    )
                                    .pressable(scale = 0.95f) {
                                        HapticsManager.selection(view)
                                        selectedVariant = v
                                    }
                                    .padding(vertical = 12.dp, horizontal = 10.dp)
                            ) {
                                Text(
                                    text = v.unit,
                                    color = DashitColors.TextPrimary,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold
                                )

                                Spacer(modifier = Modifier.height(4.dp))

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text(
                                        text = "₹${v.price.toInt()}",
                                        color = if (isSelected) DashitColors.BrandOrange else DashitColors.TextSecondary,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.ExtraBold
                                    )

                                    v.originalPrice?.let { orig ->
                                        if (orig > v.price) {
                                            Text(
                                                text = "₹${orig.toInt()}",
                                                color = DashitColors.TextFaint,
                                                fontSize = 11.sp,
                                                textDecoration = TextDecoration.LineThrough
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Product Specs Table
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(DashitColors.SurfaceRaised)
                        .border(1.dp, DashitColors.Hairline, RoundedCornerShape(16.dp))
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    SpecRow(label = "Net quantity", value = activeUnit)
                    HorizontalDivider(color = DashitColors.HairlineSoft, thickness = 1.dp)
                    SpecRow(label = "Category", value = product.cat)
                    HorizontalDivider(color = DashitColors.HairlineSoft, thickness = 1.dp)
                    SpecRow(label = "Sold by", value = "DASHit Express Hub, Anantnag")
                }

                Spacer(modifier = Modifier.height(30.dp))
            }

            // Sticky Bottom Action Bar inside sheet
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DashitColors.SurfaceRaised)
                    .border(width = 1.dp, color = DashitColors.Hairline)
                    .padding(horizontal = 20.dp, vertical = 14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text(
                            text = "₹${activePrice.toInt()}",
                            color = DashitColors.TextPrimary,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                        Text(
                            text = activeUnit,
                            color = DashitColors.TextSecondary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    var stepperCenter by remember { mutableStateOf(Offset.Zero) }
                    Box(
                        modifier = Modifier.onGloballyPositioned { coords ->
                            val pos = coords.positionInRoot()
                            stepperCenter = Offset(
                                pos.x + coords.size.width / 2f,
                                pos.y + coords.size.height / 2f
                            )
                        }
                    ) {
                        QuantityStepper(
                            quantity = quantity,
                            size = StepperSize.REGULAR,
                            isEnabled = product.isAvailable,
                            onAdd = {
                                FlyToCartManager.trigger(product.img, stepperCenter)
                                onAdd(product, selectedVariant)
                            },
                            onIncrement = {
                                FlyToCartManager.trigger(product.img, stepperCenter)
                                onIncrement(product, selectedVariant)
                            },
                            onDecrement = { onDecrement(product) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SpecRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, color = DashitColors.TextMuted, fontSize = 13.sp)
        Text(text = value, color = DashitColors.TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
    }
}
