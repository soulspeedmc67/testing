package com.dashit.app.ui.sheet

import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxHeight
import com.dashit.app.ui.storefront.PlainPackArt
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
import com.dashit.app.ui.components.ShimmerImage
import coil.request.ImageRequest
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.model.Product
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.ui.draw.shadow
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
    onDecrement: (Product) -> Unit,
    /** "Similar products" under the details; tapping one opens it here. */
    similar: List<Product> = emptyList(),
    quantityOf: (Product) -> Int = { 0 },
    onOpenProduct: (Product) -> Unit = {}
) {
    if (product == null) return
    val scroll = rememberScrollState()
    // A similar product opened here starts at its photo.
    LaunchedEffect(product.id) { scroll.animateScrollTo(0) }

    val view = LocalView.current
    val variants = product.variants ?: emptyList()
    var selectedVariant by remember(product.id) { mutableStateOf(variants.firstOrNull()) }

    val activePrice = selectedVariant?.price ?: product.price
    val activeOriginalPrice = (selectedVariant?.originalPrice ?: product.originalPrice)?.takeIf { it > activePrice }
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
        // Full height: a product page, not a small pop-up.
        Box(modifier = Modifier.fillMaxWidth().fillMaxHeight()) {
            Column(
                modifier = Modifier.fillMaxSize()
            ) {
                // Scrollable Content
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .statusBarsPadding()
                        .verticalScroll(scroll)
                        .padding(horizontal = 16.dp)
                ) {
                    // Large photo on white, the way packs are shot.
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(1.05f)
                            .clip(RoundedCornerShape(26.dp))
                            .background(Color.White)
                            .border(1.dp, DashitColors.Hairline, RoundedCornerShape(26.dp))
                    ) {
                        // Tobacco is shown as a plain pack, never the brand photo.
                        if (product.isAgeRestricted) {
                            PlainPackArt(modifier = Modifier.matchParentSize())
                        } else {
                            ShimmerImage(
                                model = ImageRequest.Builder(LocalContext.current)
                                    .data(com.dashit.app.data.ProductPhotos.fullSize(product.img))
                                    .crossfade(250)
                                    .build(),
                                contentDescription = product.name,
                                // The whole pack on white, never cropped.
                                contentScale = ContentScale.Fit,
                                modifier = Modifier.matchParentSize().padding(28.dp),
                                letterFallbackFor = product.name
                            )
                        }

                        // Delivery time, on the photo like a shop label.
                        Row(
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .padding(12.dp)
                                .clip(RoundedCornerShape(50))
                                .background(Color(0xFFF1F5F9))
                                .padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(Icons.Outlined.Timer, contentDescription = null, tint = Color(0xFF0F172A), modifier = Modifier.size(13.dp))
                            Text(product.time ?: "8 mins", color = Color(0xFF0F172A), fontSize = 11.5.sp, fontWeight = FontWeight.Bold)
                        }

                        // Circular Close Button (Top-Right)
                        Box(
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(12.dp)
                                .size(34.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF0F172A).copy(alpha = 0.08f))
                                .pressable(scale = 0.90f) {
                                    HapticsManager.light(view)
                                    onDismiss()
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Close",
                                tint = Color(0xFF0F172A),
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

                    // Rating row: only a real rating, never a made-up one.
                    if (product.rating != null) Row(
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
                            text = product.rating,
                            color = DashitColors.TextPrimary,
                            fontSize = 13.5.sp,
                            fontWeight = FontWeight.Bold
                        )
                        product.ratingCount?.let { count ->
                            Text(text = "($count ratings)", color = DashitColors.TextMuted, fontSize = 13.5.sp)
                        }
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
                                val off = ((1 - activePrice / orig) * 100).toInt()
                                if (off > 0) {
                                    Text(
                                        text = "$off% OFF",
                                        color = DashitColors.Positive,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        modifier = Modifier
                                            .padding(bottom = 5.dp)
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(DashitColors.Positive.copy(alpha = 0.12f))
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
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

                    if (similar.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(28.dp))
                        Text("You might also like", color = DashitColors.TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(12.dp))
                        similar.chunked(3).forEach { row ->
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                row.forEach { item ->
                                    com.dashit.app.ui.components.ProductCard(
                                        product = item,
                                        quantity = quantityOf(item),
                                        modifier = Modifier.weight(1f),
                                        onOpen = { onOpenProduct(item) },
                                        onAdd = { onAdd(item, null) },
                                        onIncrement = { onIncrement(item, null) },
                                        onDecrement = { onDecrement(item) }
                                    )
                                }
                                repeat(3 - row.size) { Spacer(modifier = Modifier.weight(1f)) }
                            }
                            Spacer(modifier = Modifier.height(10.dp))
                        }
                    }

                    Spacer(modifier = Modifier.height(30.dp))
                }

                // Sticky Bottom Action Bar inside sheet
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(16.dp, RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp))
                        .clip(RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp))
                        .background(DashitColors.SurfaceOverlay)
                        .navigationBarsPadding()
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

                        QuantityStepper(
                            quantity = quantity,
                            size = StepperSize.REGULAR,
                            isEnabled = product.isAvailable,
                            onAdd = { onAdd(product, selectedVariant) },
                            onIncrement = { onIncrement(product, selectedVariant) },
                            onDecrement = { onDecrement(product) }
                        )
                    }
                }
            }
            com.dashit.app.ui.cart.FreeDeliveryToastHost(insideSheet = true)
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
