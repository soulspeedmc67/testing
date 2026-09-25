package com.dashit.app.ui.categories

import com.dashit.app.ui.components.SkeletonBlock
import com.dashit.app.ui.components.ProductGridSkeleton
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.ui.components.ShimmerImage
import coil.request.ImageRequest
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.model.CategoryTile
import com.dashit.app.data.model.Product
import com.dashit.app.ui.components.ProductCard
import com.dashit.app.viewmodel.CartViewModel
import com.dashit.app.viewmodel.StorefrontViewModel

@Composable
fun CategoriesScreen(
    storefrontVm: StorefrontViewModel,
    cartVm: CartViewModel = CartViewModel.shared,
    onOpenProductDetail: (Product) -> Unit
) {
    val view = LocalView.current
    val categoryTiles by storefrontVm.categoryTiles.collectAsState()
    val allProducts by storefrontVm.products.collectAsState()
    val cartItems by cartVm.items.collectAsState()

    var selectedTileId by remember(categoryTiles) {
        mutableStateOf(categoryTiles.firstOrNull()?.id ?: "")
    }

    val selectedTile = categoryTiles.firstOrNull { it.id == selectedTileId }
        ?: categoryTiles.firstOrNull()

    val filteredProducts = remember(selectedTile, allProducts) {
        if (selectedTile == null) emptyList()
        else allProducts.filter { it.cat.equals(selectedTile.name, ignoreCase = true) }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DashitColors.Surface)
            .statusBarsPadding()
    ) {
        // Top Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Categories",
                color = DashitColors.TextPrimary,
                fontSize = 26.sp,
                fontWeight = FontWeight.Black
            )
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(DashitColors.Hairline)
        )

        // Split view: Left Sidebar (88dp) + Right Product Grid
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
            // Left Category Sidebar
            LazyColumn(
                modifier = Modifier
                    .width(88.dp)
                    .fillMaxHeight()
                    .background(DashitColors.SurfaceRaised),
                contentPadding = PaddingValues(top = 8.dp, bottom = 120.dp)
            ) {
                items(categoryTiles, key = { it.id }) { tile ->
                    val isSelected = tile.id == selectedTile?.id
                    SidebarItem(
                        tile = tile,
                        isSelected = isSelected,
                        onSelect = {
                            if (!isSelected) {
                                HapticsManager.selection(view)
                                selectedTileId = tile.id
                            }
                        }
                    )
                }
            }

            Box(
                modifier = Modifier
                    .width(1.dp)
                    .fillMaxHeight()
                    .background(DashitColors.Hairline)
            )

            // Right Product Grid Pane
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .background(DashitColors.Surface)
                    .padding(horizontal = 12.dp)
            ) {
                if (allProducts.isEmpty()) {
                    // Skeletons until the live catalogue arrives.
                    SkeletonBlock(width = 120.dp, height = 17.dp, modifier = Modifier.padding(top = 14.dp, bottom = 12.dp))
                    ProductGridSkeleton(columns = 2, rows = 3)
                } else {
                    // Header with category name and count
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp, bottom = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = selectedTile?.name ?: "Products",
                            color = DashitColors.TextPrimary,
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold
                        )

                        Text(
                            text = "${filteredProducts.size} items",
                            color = DashitColors.TextMuted,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    // 2-Column Product Grid
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 140.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(filteredProducts, key = { it.id }) { product ->
                            val qty = cartItems.filter { it.productId == product.id }.sumOf { it.qty }
                            ProductCard(
                                product = product,
                                quantity = qty,
                                modifier = Modifier.fillMaxWidth(),
                                onOpen = { onOpenProductDetail(product) },
                                onAdd = { cartVm.add(product) },
                                onIncrement = { cartVm.add(product) },
                                onDecrement = { cartVm.decrementLatest(product.id) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SidebarItem(
    tile: CategoryTile,
    isSelected: Boolean,
    onSelect: () -> Unit
) {
    val context = LocalContext.current
    val previewUrl = tile.previewImages.firstOrNull()

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(if (isSelected) DashitColors.Surface else Color.Transparent)
            .pressable(scale = 0.94f) { onSelect() }
            .padding(vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            // Circular Thumbnail Image
            Box(
                modifier = Modifier
                    .size(52.dp)
                    .clip(CircleShape)
                    .background(DashitColors.SurfaceMuted)
                    .border(
                        width = if (isSelected) 2.dp else 1.dp,
                        color = if (isSelected) DashitColors.BrandOrange else DashitColors.Hairline,
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                if (!previewUrl.isNullOrEmpty()) {
                    ShimmerImage(
                        model = ImageRequest.Builder(context)
                            .data(previewUrl)
                            .crossfade(true)
                            .build(),
                        contentDescription = tile.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }

            Text(
                text = tile.name,
                color = if (isSelected) DashitColors.TextPrimary else DashitColors.TextMuted,
                fontSize = 11.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                textAlign = TextAlign.Center,
                lineHeight = 13.sp,
                maxLines = 2,
                modifier = Modifier.padding(horizontal = 4.dp)
            )
        }

        // Active Orange Indicator Pill on right edge
        if (isSelected) {
            Box(
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .width(3.5.dp)
                    .height(36.dp)
                    .clip(RoundedCornerShape(topStart = 3.dp, bottomStart = 3.dp))
                    .background(DashitColors.BrandOrange)
            )
        }
    }
}
