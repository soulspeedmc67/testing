package com.dashit.app.ui.storefront

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.request.ImageRequest
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.Spotlight
import com.dashit.app.data.model.Product
import com.dashit.app.ui.components.ShimmerImage
import kotlin.math.PI
import kotlin.math.sin

/**
 * The spotlight tab's look (`data/Spotlight.kt`), the same gold as the website
 * (`SpotlightShowcase.jsx`) and the iPhone app (`SpotlightViews.swift`):
 * cream and gold in light mode, deep amber-brown with gold type in dark.
 */
object SpotlightColors {
    private fun pick(light: Long, dark: Long) = Color(if (DashitColors.isDark) dark else light)

    val Gold = Color(0xFFE0A200)
    val Glow = Color(0xFFFFC21A)
    val DeepInk = Color(0xFF4A2E00)
    val Ink get() = pick(0xFF4A2E00, 0xFFFFE6A0)
    val InkSoft get() = pick(0xFF7A5410, 0xFFC9B27A)
    val Title get() = pick(0xFF5A3A00, 0xFFFFD45C)
    val ButtonFill get() = pick(0xFF4A2E00, 0xFFFFC93C)
    val ButtonText get() = pick(0xFFFFD45C, 0xFF2A1C00)
    val Ornament get() = pick(0xFFD4900F, 0xFFFFC93C)
    val TileBorder get() = pick(0xB3F2B92B, 0x665C4510)
    val PageTop get() = pick(0xFFFFE27A, 0xFF3D2C00)
    val PageMid get() = pick(0xFFFFF0B8, 0xFF241A03)
    val PageLow get() = pick(0xFFFFF8E1, 0xFF16120A)

    val tile: Brush
        get() = Brush.verticalGradient(
            listOf(pick(0xFFFFF7DA, 0xFF3A2B07), pick(0xFFFFE69A, 0xFF2C2005), pick(0xFFFFCF4D, 0xFF1E1603))
        )
    /** The item cards: a warm, near-white card on the gold page (deep brown in dark). */
    val Card get() = pick(0xFFFFFCF2, 0xFF2B2109)
    val CardBorder get() = pick(0x80EDCB7A, 0x66775C1C)
    val Price get() = pick(0xFF2A1A00, 0xFFFFE6A0)
    val tabFill = Brush.linearGradient(listOf(Color(0xFFFFE680), Color(0xFFFFC21A), Color(0xFFE89B00)))
}

/** The gold wash behind the home feed while the tab is picked, with faint sparkles drifting up. */
@Composable
fun SpotlightBackdrop(modifier: Modifier = Modifier) {
    val page = Brush.verticalGradient(
        0f to SpotlightColors.PageTop,
        0.3f to SpotlightColors.PageMid,
        0.65f to SpotlightColors.PageLow,
        1f to DashitColors.Surface
    )
    val clock = rememberInfiniteTransition(label = "spot_sparkles")
    val time by clock.animateFloat(0f, 1000f, infiniteRepeatable(tween(1_000_000, easing = LinearEasing)), label = "spot_time")
    val sparkle = SpotlightColors.Ornament
    Canvas(modifier.background(page)) {
        val t = time.toDouble()
        for (i in 0 until 14) {
            val seed = (i + 1).toDouble()
            fun r(n: Double) = (sin(seed * n) + 1) / 2
            val period = 7 + r(3.7) * 6
            val phase = ((t / period) + r(5.1)) % 1.0
            val x = (r(12.9898) * size.width + (r(9.3) - 0.5) * 40 * phase).toFloat()
            val y = ((0.08 + r(78.233) * 0.86) * size.height - 70 * density * phase).toFloat()
            val fade = if (phase < 0.15) phase / 0.15 else if (phase > 0.85) (1 - phase) / 0.15 else 1.0
            val s = ((6 + r(39.425) * 8) * density).toFloat()
            val star = Path().apply {
                moveTo(x, y - s / 2)
                quadraticTo(x + s * 0.08f, y - s * 0.08f, x + s / 2, y)
                quadraticTo(x + s * 0.08f, y + s * 0.08f, x, y + s / 2)
                quadraticTo(x - s * 0.08f, y + s * 0.08f, x - s / 2, y)
                quadraticTo(x - s * 0.08f, y - s * 0.08f, x, y - s / 2)
                close()
            }
            drawPath(star, sparkle.copy(alpha = ((0.3 + r(2.2) * 0.4) * fade).toFloat()))
        }
    }
}

/** The tab in the category strip: a gold tile with a light sweeping across it and a soft pulse. */
@Composable
fun SpotlightTab(label: String, isSelected: Boolean, onClick: () -> Unit) {
    val view = LocalView.current
    val motion = rememberInfiniteTransition(label = "spot_tab")
    val sweep by motion.animateFloat(-0.8f, 1.6f, infiniteRepeatable(tween(1800, delayMillis = 500, easing = LinearEasing)), label = "spot_sweep")
    val glow by motion.animateFloat(0.35f, 0.8f, infiniteRepeatable(tween(1300), RepeatMode.Reverse), label = "spot_glow")
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .pressable(scale = 0.92f) {
                HapticsManager.selection(view)
                onClick()
            }
            .padding(vertical = 4.dp)
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(width = 32.dp, height = 24.dp)
                .shadow(if (isSelected) 8.dp else 5.dp, RoundedCornerShape(8.dp), ambientColor = SpotlightColors.Glow.copy(alpha = glow), spotColor = SpotlightColors.Glow.copy(alpha = glow))
                .clip(RoundedCornerShape(8.dp))
                .background(SpotlightColors.tabFill)
                .drawWithContent {
                    drawContent()
                    val w = size.width * 0.5f
                    val left = sweep * size.width
                    drawRect(
                        Brush.horizontalGradient(listOf(Color.Transparent, Color.White.copy(alpha = 0.85f), Color.Transparent), startX = left, endX = left + w),
                        topLeft = Offset(left, 0f),
                        size = androidx.compose.ui.geometry.Size(w, size.height)
                    )
                }
        ) {
            Icon(Icons.Filled.AutoAwesome, contentDescription = null, tint = SpotlightColors.DeepInk, modifier = Modifier.size(15.dp))
        }
        Spacer(Modifier.height(4.dp))
        Text(
            text = label,
            style = TextStyle(
                brush = Brush.horizontalGradient(listOf(Color(0xFFB26B00), Color(0xFFE39B00), Color(0xFFB26B00)).let { light ->
                    if (DashitColors.isDark) listOf(Color(0xFFFFD45C), Color(0xFFFFF0A8), Color(0xFFFFD45C)) else light
                }),
                fontSize = 11.5.sp,
                fontWeight = FontWeight.Black
            ),
            maxLines = 1
        )
        Spacer(Modifier.height(4.dp))
        Box(
            modifier = Modifier
                .width(22.dp)
                .height(2.5.dp)
                .clip(RoundedCornerShape(1.dp))
                .background(if (isSelected) SpotlightColors.Gold else Color.Transparent)
        )
    }
}

/**
 * Where group `index`'s title is in the home LazyColumn, counting what comes
 * before it there: the header, the pinned bar, the hero, then (with groups) the
 * tile rows and the bunting, then (with items on their own) their title and rows.
 */
fun spotlightGroupItemIndex(sections: List<Spotlight.ShownSection>, items: List<Product>, index: Int): Int {
    val tiles = if (sections.isEmpty()) 0 else (sections.size + 2) / 3 + 1
    val loose = if (items.isEmpty()) 0 else (if (sections.isEmpty()) 0 else 1) + (items.size + 1) / 2
    return 3 + tiles + loose + index * 2
}

/**
 * The spotlight page as LazyColumn items: hero, group tiles, a bunting rule,
 * then each group's title and items. `onJump(i)` scrolls to group `i`.
 */
fun LazyListScope.spotlightFeed(
    spotlight: Spotlight,
    sections: List<Spotlight.ShownSection>,
    items: List<Product>,
    cartQty: Map<String, Int>,
    onJump: (Int) -> Unit,
    onOpen: (Product) -> Unit,
    onAdd: (Product) -> Unit,
    onDecrement: (Product) -> Unit
) {
    item(key = "spot_hero") { SpotlightHero(spotlight) }
    // Groups are optional: their tiles and the bunting under them show only when there are some.
    if (sections.isNotEmpty()) {
        sections.chunked(3).forEachIndexed { row, rowSections ->
            item(key = "spot_tiles_$row") {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 5.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    rowSections.forEachIndexed { col, section ->
                        SpotlightGroupTile(section, Modifier.weight(1f)) { onJump(row * 3 + col) }
                    }
                    repeat(3 - rowSections.size) { Spacer(Modifier.weight(1f)) }
                }
            }
        }
        item(key = "spot_bunting") {
            val dot = SpotlightColors.Ornament.copy(alpha = 0.6f)
            Canvas(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 20.dp)
                    .height(10.dp)
            ) {
                var x = 7.dp.toPx()
                while (x < size.width) {
                    drawCircle(dot, radius = 1.8.dp.toPx(), center = Offset(x, size.height / 2))
                    x += 14.dp.toPx()
                }
            }
        }
    }
    // Items on their own: two to a row, titled only when there are groups too.
    if (items.isNotEmpty()) {
        if (sections.isNotEmpty()) {
            item(key = "spot_loose_title") { SpotlightHeading("Top picks", null) }
        }
        items.chunked(2).forEachIndexed { row, pair ->
            item(key = "spot_loose_$row") {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 16.dp, end = 16.dp, top = if (row == 0 && sections.isEmpty()) 2.dp else 5.dp, bottom = 5.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    pair.forEach { product ->
                        SpotlightItemCard(
                            product = product,
                            quantity = cartQty[product.id] ?: 0,
                            modifier = Modifier.weight(1f),
                            onOpen = { onOpen(product) },
                            onAdd = { onAdd(product) },
                            onDecrement = { onDecrement(product) }
                        )
                    }
                    if (pair.size == 1) Spacer(Modifier.weight(1f))
                }
            }
        }
    }
    sections.forEach { section ->
        item(key = "spot_title_${section.id}") { SpotlightHeading(section.name, section.products.size) }
        item(key = "spot_items_${section.id}") {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(section.products, key = { it.id }) { product ->
                    SpotlightItemCard(
                        product = product,
                        quantity = cartQty[product.id] ?: 0,
                        modifier = Modifier.width(150.dp),
                        onOpen = { onOpen(product) },
                        onAdd = { onAdd(product) },
                        onDecrement = { onDecrement(product) }
                    )
                }
            }
        }
    }
}

@Composable
private fun SpotlightHeading(title: String, count: Int?) {
    Row(
        modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 24.dp, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Box(
            Modifier
                .size(8.dp)
                .rotate(45f)
                .background(SpotlightColors.Ornament)
        )
        Text(title, color = SpotlightColors.Ink, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
        if (count != null) {
            Text(
                "$count item${if (count == 1) "" else "s"}",
                color = SpotlightColors.InkSoft,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun SpotlightHero(spotlight: Spotlight) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 24.dp, end = 24.dp, top = 22.dp, bottom = 18.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.width(22.dp).height(1.dp).background(SpotlightColors.Ornament.copy(alpha = 0.7f)))
            Text(
                text = "CURATED BY DASHIT",
                color = SpotlightColors.Ornament,
                fontSize = 10.5.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 2.2.sp
            )
            Box(Modifier.width(22.dp).height(1.dp).background(SpotlightColors.Ornament.copy(alpha = 0.7f)))
        }
        Text(
            text = spotlight.title,
            color = SpotlightColors.Title,
            fontSize = 30.sp,
            lineHeight = 34.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = (-0.4).sp,
            textAlign = TextAlign.Center,
            maxLines = 2,
            modifier = Modifier.padding(top = 10.dp)
        )
        if (spotlight.subtitle.isNotBlank()) {
            Text(
                text = spotlight.subtitle,
                color = SpotlightColors.InkSoft,
                fontSize = 14.sp,
                lineHeight = 19.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 6.dp)
            )
        }
    }
}

/** A group's tile: its name across the top, its photo filling the bottom. */
@Composable
private fun SpotlightGroupTile(section: Spotlight.ShownSection, modifier: Modifier, onTap: () -> Unit) {
    val view = LocalView.current
    val shape = RoundedCornerShape(22.dp)
    val context = LocalContext.current
    val request = remember(section.img) { ImageRequest.Builder(context).data(section.img).crossfade(200).build() }
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
            .aspectRatio(0.8f)
            .shadow(3.dp, shape, ambientColor = Color(0x24A06400), spotColor = Color(0x24A06400))
            .clip(shape)
            .background(SpotlightColors.Card)
            .border(1.dp, SpotlightColors.CardBorder, shape)
            .pressable(scale = 0.96f) {
                HapticsManager.light(view)
                onTap()
            }
    ) {
        Text(
            text = section.name,
            color = SpotlightColors.Ink,
            fontSize = 13.sp,
            lineHeight = 16.sp,
            fontWeight = FontWeight.ExtraBold,
            textAlign = TextAlign.Center,
            maxLines = 2,
            minLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(start = 6.dp, end = 6.dp, top = 12.dp)
        )
        // The photo sits in a rounded well inset in the tile, so a photo with
        // its own background never shows square corners on the gold.
        val well = RoundedCornerShape(16.dp)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(start = 8.dp, end = 8.dp, top = 6.dp, bottom = 8.dp)
                .clip(well)
                .background(Color.White.copy(alpha = 0.92f))
                .border(1.dp, SpotlightColors.TileBorder.copy(alpha = 0.35f), well)
        ) {
            ShimmerImage(
                model = request,
                contentDescription = section.name,
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(5.dp)
            )
        }
    }
}

/**
 * One item: the photo first in a white well (with its offer), then the name,
 * size, price and ADD, on a warm near-white card with a thin gold edge.
 */
@Composable
private fun SpotlightItemCard(
    product: Product,
    quantity: Int,
    modifier: Modifier,
    onOpen: () -> Unit,
    onAdd: () -> Unit,
    onDecrement: () -> Unit
) {
    val view = LocalView.current
    val shape = RoundedCornerShape(18.dp)
    val context = LocalContext.current
    val request = remember(product.img) { ImageRequest.Builder(context).data(product.img).crossfade(200).build() }
    Column(
        modifier = modifier
            .shadow(3.dp, shape, ambientColor = Color(0x24A06400), spotColor = Color(0x24A06400))
            .clip(shape)
            .background(SpotlightColors.Card)
            .border(1.dp, SpotlightColors.CardBorder, shape)
            .pressable(scale = 0.97f) {
                HapticsManager.selection(view)
                onOpen()
            }
    ) {
        Box(
            modifier = Modifier
                .padding(start = 8.dp, end = 8.dp, top = 8.dp)
                .fillMaxWidth()
                .aspectRatio(1f)
                .clip(RoundedCornerShape(13.dp))
                .background(Color.White)
        ) {
            ShimmerImage(
                model = request,
                contentDescription = product.name,
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(10.dp),
                letterFallbackFor = product.name
            )
            val discount = product.discountPercent
            if (discount != null && discount > 0) {
                Text(
                    text = "$discount% OFF",
                    color = Color.White,
                    fontSize = 9.5.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 0.3.sp,
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(6.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(Color(0xFFC0261C))
                        .padding(horizontal = 6.dp, vertical = 3.dp)
                )
            }
        }
        Text(
            text = product.name,
            color = SpotlightColors.Ink,
            fontSize = 13.sp,
            lineHeight = 17.sp,
            fontWeight = FontWeight.SemiBold,
            maxLines = 2,
            minLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 11.dp, end = 11.dp, top = 9.dp)
        )
        Text(
            text = product.unit,
            color = SpotlightColors.InkSoft,
            fontSize = 11.5.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(start = 11.dp, end = 11.dp, top = 2.dp)
        )
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 11.dp, end = 9.dp, top = 8.dp, bottom = 10.dp)
        ) {
            Column(Modifier.weight(1f)) {
                Text(product.displayPrice, color = SpotlightColors.Price, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, maxLines = 1)
                product.displayOriginalPrice?.let {
                    Text(it, color = SpotlightColors.InkSoft, fontSize = 11.sp, textDecoration = TextDecoration.LineThrough, maxLines = 1)
                }
            }
            when {
                !product.isAvailable -> Text(
                    "Sold out",
                    color = SpotlightColors.InkSoft,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(9.dp))
                        .background(Color.Black.copy(alpha = 0.06f))
                        .padding(horizontal = 9.dp, vertical = 8.dp)
                )
                quantity == 0 -> Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(width = 62.dp, height = 34.dp)
                        .clip(RoundedCornerShape(9.dp))
                        .background(SpotlightColors.ButtonFill)
                        .pressable(scale = 0.92f) {
                            HapticsManager.light(view)
                            onAdd()
                        }
                ) {
                    Text("ADD", color = SpotlightColors.ButtonText, fontSize = 13.sp, fontWeight = FontWeight.Black, letterSpacing = 0.5.sp)
                }
                else -> Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .height(34.dp)
                        .clip(RoundedCornerShape(9.dp))
                        .background(SpotlightColors.ButtonFill)
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(width = 26.dp, height = 34.dp)
                            .pressable(scale = 0.85f) {
                                HapticsManager.light(view)
                                onDecrement()
                            }
                    ) { Text("−", color = SpotlightColors.ButtonText, fontSize = 16.sp, fontWeight = FontWeight.Black) }
                    Text("$quantity", color = SpotlightColors.ButtonText, fontSize = 13.sp, fontWeight = FontWeight.Black)
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(width = 26.dp, height = 34.dp)
                            .pressable(scale = 0.85f) {
                                HapticsManager.light(view)
                                onAdd()
                            }
                    ) { Text("+", color = SpotlightColors.ButtonText, fontSize = 16.sp, fontWeight = FontWeight.Black) }
                }
            }
        }
    }
}
