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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import com.dashit.app.data.Departments
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
    // How many of each item are in the cart, worked out once per cart change, not once per card.
    val cartQty = remember(cartItems) {
        cartItems.groupingBy { it.productId }.fold(0) { total, item -> total + item.qty }
    }

    /* A few departments on the left, not every category: the categories of the
       picked department are chips on the right, and the shelves inside the
       picked category are chips under those. */
    val departments = remember(categoryTiles) { Departments.of(categoryTiles) }
    var selectedDeptId by remember { mutableStateOf("") }
    val selectedDept = departments.firstOrNull { it.id == selectedDeptId } ?: departments.firstOrNull()

    var selectedTileId by remember(selectedDept?.id) { mutableStateOf("") }
    val selectedTile = selectedDept?.tiles?.firstOrNull { it.id == selectedTileId }
        ?: selectedDept?.tiles?.firstOrNull()

    var selectedSub by remember(selectedTile?.id) { mutableStateOf("") }

    val shelfProducts = remember(selectedTile, allProducts) {
        if (selectedTile == null) emptyList()
        else allProducts.filter { it.cat.equals(selectedTile.name, ignoreCase = true) }
    }
    // The shelves inside this category, biggest first.
    val subShelves = remember(shelfProducts) {
        shelfProducts.filter { it.sub.isNotBlank() }.groupingBy { it.sub }.eachCount()
            .entries.sortedByDescending { it.value }.map { it.key }
    }
    val filteredProducts = remember(shelfProducts, selectedSub) {
        if (selectedSub.isBlank()) shelfProducts else shelfProducts.filter { it.sub == selectedSub }
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
                items(departments, key = { it.id }) { dept ->
                    val isSelected = dept.id == selectedDept?.id
                    SidebarItem(
                        tile = CategoryTile(
                            id = dept.id,
                            name = dept.name,
                            previewImages = dept.tiles.firstOrNull()?.previewImages.orEmpty(),
                            productCount = dept.tiles.sumOf { it.productCount }
                        ),
                        isSelected = isSelected,
                        onSelect = {
                            if (!isSelected) {
                                HapticsManager.selection(view)
                                selectedDeptId = dept.id
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
                    // The categories inside the picked department.
                    ChipRow(
                        labels = selectedDept?.tiles.orEmpty().map { it.id to it.name },
                        selectedId = selectedTile?.id.orEmpty(),
                        filled = true,
                        modifier = Modifier.padding(top = 10.dp),
                        onSelect = { id ->
                            HapticsManager.selection(view)
                            selectedTileId = id
                        }
                    )
                    // The shelves inside the picked category.
                    if (subShelves.size > 1) {
                        ChipRow(
                            labels = listOf("" to "All") + subShelves.map { it to it },
                            selectedId = selectedSub,
                            filled = false,
                            modifier = Modifier.padding(top = 8.dp),
                            onSelect = { selectedSub = it }
                        )
                    }

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
                    // Each shelf starts at its first item, not where the last one was left.
                    val gridState = rememberLazyGridState()
                    LaunchedEffect(selectedTile?.id, selectedSub) { gridState.scrollToItem(0) }
                    LazyVerticalGrid(
                        state = gridState,
                        columns = GridCells.Fixed(2),
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 140.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(filteredProducts, key = { it.id }) { product ->
                            val qty = cartQty[product.id] ?: 0
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

/** A row of chips that scrolls sideways. `filled` marks the picked one in midnight, else in orange outline. */
@Composable
private fun ChipRow(
    labels: List<Pair<String, String>>,
    selectedId: String,
    filled: Boolean,
    modifier: Modifier = Modifier,
    onSelect: (String) -> Unit
) {
    LazyRow(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(labels, key = { it.first }) { (id, label) ->
            val isSelected = id == selectedId
            val shape = RoundedCornerShape(if (filled) 12.dp else 50.dp)
            val background = when {
                isSelected && filled -> DashitColors.TextPrimary
                else -> DashitColors.SurfaceRaised
            }
            val borderColor = when {
                isSelected && !filled -> DashitColors.BrandOrange
                isSelected -> DashitColors.TextPrimary
                else -> DashitColors.Hairline
            }
            val textColor = when {
                isSelected && filled -> DashitColors.Surface
                isSelected -> DashitColors.BrandAccent
                else -> DashitColors.TextSecondary
            }
            Text(
                text = label,
                color = textColor,
                fontSize = if (filled) 13.sp else 12.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                maxLines = 1,
                modifier = Modifier
                    .clip(shape)
                    .background(background)
                    .border(1.dp, borderColor, shape)
                    .clickable { onSelect(id) }
                    .padding(horizontal = 12.dp, vertical = if (filled) 8.dp else 6.dp)
            )
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
