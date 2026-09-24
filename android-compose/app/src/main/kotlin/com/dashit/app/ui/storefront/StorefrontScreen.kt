package com.dashit.app.ui.storefront

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForwardIos
import androidx.compose.material.icons.filled.Cake
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.Celebration
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Coffee
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material.icons.filled.Fastfood
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Headphones
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Kitchen
import androidx.compose.material.icons.filled.LocalDrink
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.ShoppingBasket
import androidx.compose.material.icons.filled.Spa
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.activity.compose.BackHandler
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.DashitMotion
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.model.Category
import com.dashit.app.data.model.DeliveryAddress
import com.dashit.app.data.model.Order
import com.dashit.app.data.model.OrderStatus
import com.dashit.app.data.model.Product
import com.dashit.app.data.repository.OrderRepository
import com.dashit.app.ui.address.AddressSelectionSheet
import com.dashit.app.ui.cart.CartSheet
import com.dashit.app.ui.categories.CategoriesScreen
import com.dashit.app.ui.checkout.CheckoutSheet
import com.dashit.app.ui.components.BottomNavBar
import com.dashit.app.ui.components.CategoryCollageTile
import com.dashit.app.ui.components.FloatingCartBar
import com.dashit.app.ui.components.FlyToCartOverlay
import com.dashit.app.ui.components.HeroBanner
import com.dashit.app.ui.components.NavigationTab
import com.dashit.app.ui.components.ProductCard
import com.dashit.app.ui.components.WelcomeHeroBanner
import com.dashit.app.ui.orders.LiveTrackingMapScreen
import com.dashit.app.ui.orders.OrdersScreen
import com.dashit.app.ui.profile.ProfileScreen
import com.dashit.app.ui.sheet.ProductDetailSheet
import com.dashit.app.viewmodel.CartViewModel
import com.dashit.app.viewmodel.StorefrontViewModel
import androidx.compose.foundation.clickable
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.zIndex
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalFoundationApi::class, ExperimentalMaterial3Api::class)
@Composable
fun StorefrontScreen(
    storefrontVm: StorefrontViewModel,
    cartVm: CartViewModel = CartViewModel.shared
) {
    val view = LocalView.current
    val scope = rememberCoroutineScope()

    val offers by storefrontVm.offers.collectAsState()
    val categories by storefrontVm.categories.collectAsState()
    val categoryTiles by storefrontVm.categoryTiles.collectAsState()
    val rails by storefrontVm.rails.collectAsState()
    val filteredProducts by storefrontVm.filteredProducts.collectAsState()
    val isBrowsing by storefrontVm.isBrowsing.collectAsState()
    val selectedCategory by storefrontVm.selectedCategory.collectAsState()
    val searchQuery by storefrontVm.searchQuery.collectAsState()

    val cartItems by cartVm.items.collectAsState()
    val bill by cartVm.bill.collectAsState()
    val orders by OrderRepository.shared.orders.collectAsState()
    val activeDeliveryOrder = orders.firstOrNull { it.status != OrderStatus.DELIVERED && it.status != OrderStatus.CANCELLED }

    var activeTab by remember { mutableStateOf(NavigationTab.HOME) }
    var detailProduct by remember { mutableStateOf<Product?>(null) }
    var activeTrackingOrder by remember { mutableStateOf<Order?>(null) }
    var isCartSheetOpen by remember { mutableStateOf(false) }
    var isCheckoutOpen by remember { mutableStateOf(false) }
    var isProfileOpen by remember { mutableStateOf(false) }
    var isAddressSheetOpen by remember { mutableStateOf(false) }
    var currentAddress by remember { mutableStateOf(DeliveryAddress()) }
    var recentOrderPlacedTime by remember { mutableStateOf<Long?>(null) }
    var showTopOrderBanner by remember { mutableStateOf(false) }

    LaunchedEffect(recentOrderPlacedTime) {
        if (recentOrderPlacedTime != null) {
            showTopOrderBanner = true
            delay(10000)
            showTopOrderBanner = false
        }
    }

    val productSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val cartSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val checkoutSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val addressSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    BackHandler(enabled = isAddressSheetOpen || isProfileOpen || activeTrackingOrder != null || detailProduct != null || isCheckoutOpen || isCartSheetOpen || !isBrowsing || activeTab != NavigationTab.HOME) {
        when {
            isAddressSheetOpen -> isAddressSheetOpen = false
            isProfileOpen -> isProfileOpen = false
            activeTrackingOrder != null -> activeTrackingOrder = null
            detailProduct != null -> detailProduct = null
            isCheckoutOpen -> {
                isCheckoutOpen = false
                isCartSheetOpen = true
            }
            isCartSheetOpen -> isCartSheetOpen = false
            !isBrowsing -> storefrontVm.clearFilter()
            activeTab != NavigationTab.HOME -> activeTab = NavigationTab.HOME
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DashitColors.Surface)
    ) {
        if (isProfileOpen) {
            ProfileScreen(
                onSignOut = { isProfileOpen = false }
            )
        } else if (activeTrackingOrder != null) {
            LiveTrackingMapScreen(
                initialOrder = activeTrackingOrder!!,
                orderRepo = OrderRepository.shared,
                onBack = { activeTrackingOrder = null }
            )
        } else {
            when (activeTab) {
                NavigationTab.HOME -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 140.dp)
                    ) {
                    // 1. Top Header: ETA + Address + Profile
                    item(key = "header") {
                        StorefrontHeader(
                            address = currentAddress,
                            onOpenAddressPicker = {
                                HapticsManager.light(view)
                                isAddressSheetOpen = true
                            },
                            onOpenProfile = {
                                HapticsManager.selection(view)
                                isProfileOpen = true
                            }
                        )
                    }

            // 2. Sticky Pinned Search Bar & Horizontal Category Tabs (Seamless status bar blend)
            stickyHeader(key = "search_and_tabs") {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(DashitColors.Surface)
                        .statusBarsPadding()
                        .padding(top = 4.dp, bottom = 8.dp)
                ) {
                    // Search Bar
                    SearchBarField(
                        query = searchQuery,
                        onQueryChange = { storefrontVm.setSearchQuery(it) }
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Horizontal Category Tabs with icons and active orange bar
                    CategoryTabsRow(
                        categories = categories,
                        selectedCategory = selectedCategory,
                        onSelectCategory = { storefrontVm.selectCategory(it) }
                    )
                }
            }

            // 3. Main Feed Content
            if (isBrowsing) {
                // Welcome Festive Banner (matching reference screenshot)
                item(key = "welcome_hero_banner") {
                    Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) {
                        WelcomeHeroBanner(
                            onTap = {
                                if (offers.isNotEmpty()) {
                                    storefrontVm.selectCategory(offers.first().category)
                                }
                            }
                        )
                    }
                }

                // "Bestsellers" Blinkit 3-Column Collage Tiles
                if (categoryTiles.isNotEmpty()) {
                    item(key = "bestsellers_title") {
                        Text(
                            text = "Bestsellers",
                            color = DashitColors.TextPrimary,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            modifier = Modifier.padding(start = 16.dp, top = 18.dp, bottom = 12.dp)
                        )
                    }

                    // 3-Column Collage Grid in Rows of 3
                    val chunkedTiles = categoryTiles.chunked(3)
                    items(chunkedTiles, key = { it.first().id }) { rowTiles ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 5.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            rowTiles.forEach { tile ->
                                CategoryCollageTile(
                                    tile = tile,
                                    modifier = Modifier.weight(1f),
                                    onTap = { storefrontVm.selectCategory(tile.name) }
                                )
                            }
                            // Fill remaining space if last row has < 3 tiles
                            repeat(3 - rowTiles.size) {
                                Spacer(modifier = Modifier.weight(1f))
                            }
                        }
                    }
                }

                // Everyday Rails (Dairy, Snacks, Vegetables, etc.)
                rails.forEach { rail ->
                    item(key = "rail_title_${rail.id}") {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(start = 16.dp, end = 16.dp, top = 26.dp, bottom = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = rail.title,
                                color = DashitColors.TextPrimary,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold
                            )

                            Row(
                                modifier = Modifier.pressable(scale = 0.94f) {
                                    HapticsManager.selection(view)
                                    storefrontVm.selectCategory(rail.title)
                                },
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(3.dp)
                            ) {
                                Text(
                                    text = "See all",
                                    color = DashitColors.BrandOrange,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Icon(
                                    imageVector = Icons.AutoMirrored.Filled.ArrowForwardIos,
                                    contentDescription = "See all",
                                    tint = DashitColors.BrandOrange,
                                    modifier = Modifier.size(11.dp)
                                )
                            }
                        }
                    }

                    item(key = "rail_items_${rail.id}") {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(rail.products, key = { it.id }) { product ->
                                val qty = cartItems.filter { it.productId == product.id }.sumOf { it.qty }
                                ProductCard(
                                    product = product,
                                    quantity = qty,
                                    modifier = Modifier.width(118.dp),
                                    onOpen = { detailProduct = product },
                                    onAdd = { cartVm.add(product) },
                                    onIncrement = { cartVm.add(product) },
                                    onDecrement = { cartVm.decrementLatest(product.id) }
                                )
                            }
                        }
                    }
                }
            } else {
                // Filtered 3-Column Product Grid (Matches Screenshot 2)
                item(key = "filtered_header") {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = selectedCategory ?: "Search results",
                            color = DashitColors.TextPrimary,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold
                        )

                        Text(
                            text = "${filteredProducts.size} items",
                            color = DashitColors.TextMuted,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                val chunkedProducts = filteredProducts.chunked(3)
                items(chunkedProducts, key = { it.first().id }) { rowProducts ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 5.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        rowProducts.forEach { product ->
                            val qty = cartItems.filter { it.productId == product.id }.sumOf { it.qty }
                            ProductCard(
                                product = product,
                                quantity = qty,
                                modifier = Modifier.weight(1f),
                                onOpen = { detailProduct = product },
                                onAdd = { cartVm.add(product) },
                                onIncrement = { cartVm.add(product) },
                                onDecrement = { cartVm.decrementLatest(product.id) }
                            )
                        }
                        repeat(3 - rowProducts.size) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        }
    }
    NavigationTab.CATEGORIES -> {
        CategoriesScreen(
            storefrontVm = storefrontVm,
            cartVm = cartVm,
            onOpenProductDetail = { detailProduct = it }
        )
    }
    NavigationTab.ORDERS -> {
        OrdersScreen(
            orderRepo = OrderRepository.shared,
            cartVm = cartVm,
            onOpenCart = { isCartSheetOpen = true },
            onTrackOrder = { activeTrackingOrder = it }
        )
    }
}

        // Top Order Status Announcement (Visible for 10 seconds max after order placed)
        AnimatedVisibility(
            visible = showTopOrderBanner && activeDeliveryOrder != null,
            enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut(),
            modifier = Modifier
                .align(Alignment.TopCenter)
                .statusBarsPadding()
                .padding(top = 10.dp, start = 16.dp, end = 16.dp)
                .zIndex(10f)
        ) {
            TopOrderAnnouncementBanner(
                order = activeDeliveryOrder!!,
                onTrack = {
                    showTopOrderBanner = false
                    activeTrackingOrder = activeDeliveryOrder
                },
                onDismiss = { showTopOrderBanner = false }
            )
        }

        // Sleek Live Order Tracking Pill (Dynamic Island / Sleek Pill above navbar)
        if (activeDeliveryOrder != null && activeTab == NavigationTab.HOME && !showTopOrderBanner) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = if (cartItems.isNotEmpty()) 136.dp else 74.dp)
                    .navigationBarsPadding()
                    .padding(horizontal = 24.dp)
                    .shadow(12.dp, RoundedCornerShape(22.dp), spotColor = DashitColors.BlinkitGreen)
                    .clip(RoundedCornerShape(22.dp))
                    .background(Color(0xF0131F17))
                    .border(1.dp, DashitColors.BlinkitGreen.copy(alpha = 0.55f), RoundedCornerShape(22.dp))
                    .pressable(scale = 0.96f) {
                        HapticsManager.medium(view)
                        activeTrackingOrder = activeDeliveryOrder
                    }
                    .padding(horizontal = 14.dp, vertical = 8.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(DashitColors.BlinkitGreen.copy(alpha = 0.22f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = "🛵", fontSize = 14.sp)
                    }

                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(5.dp)
                        ) {
                            Text(
                                text = "Arriving in ${activeDeliveryOrder.etaMinutes ?: 8} mins",
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "•",
                                color = DashitColors.BlinkitGreen,
                                fontSize = 10.sp
                            )
                            Text(
                                text = activeDeliveryOrder.driverName ?: "Tariq on route",
                                color = DashitColors.Positive,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFF233827))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(2.dp)
                        ) {
                            Text(
                                text = "Track",
                                color = DashitColors.FestiveGold,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowForwardIos,
                                contentDescription = null,
                                tint = DashitColors.FestiveGold,
                                modifier = Modifier.size(9.dp)
                            )
                        }
                    }
                }
            }
        }

        // Floating Cart Bar (Above Bottom Nav)
        AnimatedVisibility(
            visible = cartItems.isNotEmpty(),
            enter = fadeIn(DashitMotion.snappySpring()),
            exit = fadeOut(DashitMotion.snappySpring()),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 76.dp)
                .navigationBarsPadding()
        ) {
            FloatingCartBar(
                items = cartItems,
                bill = bill,
                onTap = {
                    HapticsManager.medium(view)
                    isCartSheetOpen = true
                }
            )
        }

        // Floating Bottom Navigation Bar
        BottomNavBar(
            selectedTab = activeTab,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 6.dp)
                .navigationBarsPadding(),
            onTabSelected = { activeTab = it }
        )

        // Product Detail Bottom Sheet
        if (detailProduct != null) {
            val qty = cartItems.filter { it.productId == detailProduct!!.id }.sumOf { it.qty }
            ProductDetailSheet(
                product = detailProduct,
                quantity = qty,
                sheetState = productSheetState,
                onDismiss = { detailProduct = null },
                onAdd = { prod, variant -> cartVm.add(prod, variant) },
                onIncrement = { prod, variant -> cartVm.add(prod, variant) },
                onDecrement = { prod -> cartVm.decrementLatest(prod.id) }
            )
        }

        // Cart Bottom Sheet
        if (isCartSheetOpen) {
            CartSheet(
                cartVm = cartVm,
                sheetState = cartSheetState,
                onDismiss = { isCartSheetOpen = false },
                onProceedToCheckout = {
                    isCartSheetOpen = false
                    isCheckoutOpen = true
                }
            )
        }

        // Checkout Bottom Sheet
        if (isCheckoutOpen) {
            CheckoutSheet(
                cartVm = cartVm,
                orderRepo = OrderRepository.shared,
                sheetState = checkoutSheetState,
                onDismiss = { isCheckoutOpen = false },
                onOrderPlaced = { orderId ->
                    isCheckoutOpen = false
                    val placed = OrderRepository.shared.orders.value.firstOrNull { it.id == orderId }
                        ?: OrderRepository.shared.orders.value.firstOrNull()
                    if (placed != null) {
                        recentOrderPlacedTime = System.currentTimeMillis()
                        showTopOrderBanner = true
                    } else {
                        activeTab = NavigationTab.ORDERS
                    }
                }
            )
        }

        // Address Selection Sheet (Search, Map Pinpoint, Saved Addresses)
        if (isAddressSheetOpen) {
            AddressSelectionSheet(
                currentAddress = currentAddress,
                sheetState = addressSheetState,
                onDismiss = { isAddressSheetOpen = false },
                onSelectAddress = { newAddr ->
                    currentAddress = newAddr
                    isAddressSheetOpen = false
                }
            )
        }
        }

        // Parabolic Fly-To-Cart Badge Overlay (Always active at root)
        FlyToCartOverlay()
    }
}

@Composable
private fun TopOrderAnnouncementBanner(
    order: Order,
    onTrack: () -> Unit,
    onDismiss: () -> Unit
) {
    val bannerShape = RoundedCornerShape(20.dp)
    var progress by remember { mutableStateOf(1f) }

    LaunchedEffect(Unit) {
        val startTime = System.currentTimeMillis()
        val totalDuration = 10000L
        while (progress > 0f) {
            val elapsed = System.currentTimeMillis() - startTime
            progress = ((totalDuration - elapsed).toFloat() / totalDuration).coerceIn(0f, 1f)
            delay(50)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(20.dp, bannerShape, spotColor = DashitColors.BlinkitGreen)
            .clip(bannerShape)
            .background(
                Brush.horizontalGradient(
                    listOf(
                        Color(0xFF0C1F13),
                        Color(0xFF173622),
                        Color(0xFF102818)
                    )
                )
            )
            .border(1.2.dp, DashitColors.BlinkitGreen.copy(alpha = 0.85f), bannerShape)
            .clickable { onTrack() }
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(DashitColors.BlinkitGreen.copy(alpha = 0.25f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "🛵", fontSize = 18.sp)
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Order Placed! Arriving in ${order.etaMinutes ?: 8} mins",
                        color = Color.White,
                        fontSize = 13.5.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = order.tracking?.statusText ?: "Store is packing your items • Tap to track",
                        color = DashitColors.Positive,
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(DashitColors.BlinkitGreen)
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "Track",
                        color = Color.Black,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                }

                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Dismiss",
                    tint = DashitColors.TextMuted,
                    modifier = Modifier
                        .size(20.dp)
                        .clip(CircleShape)
                        .clickable { onDismiss() }
                )
            }

            // 10-second countdown indicator bar
            Box(
                modifier = Modifier
                    .fillMaxWidth(progress)
                    .height(2.5.dp)
                    .background(DashitColors.BlinkitGreen)
            )
        }
    }
}

@Composable
private fun StorefrontHeader(
    address: DeliveryAddress,
    onOpenAddressPicker: () -> Unit,
    onOpenProfile: () -> Unit
) {
    val view = LocalView.current
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF8C5D08),
                        Color(0xFF4C3004),
                        DashitColors.Surface
                    )
                )
            )
            .statusBarsPadding()
            .padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                modifier = Modifier
                    .weight(1f, fill = false)
                    .padding(end = 10.dp)
            ) {
                Text(
                    text = "DASHit in",
                    color = Color(0xFFFDE68A),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp
                )

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = "8 minutes",
                    color = Color.White,
                    fontSize = 30.sp,
                    fontWeight = FontWeight.Black,
                    lineHeight = 34.sp
                )

                Spacer(modifier = Modifier.height(4.dp))

                // Location selector opening bottom sheet
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier.pressable(scale = 0.96f) {
                        HapticsManager.light(view)
                        onOpenAddressPicker()
                    }
                ) {
                    Text(
                        text = address.displaySummary,
                        color = Color(0xFFFFECC4),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    Icon(
                        imageVector = Icons.Default.KeyboardArrowDown,
                        contentDescription = "Change address",
                        tint = Color(0xFFFFECC4),
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            // Top Right Profile Avatar Button (Wallet removed)
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF2C2214))
                    .border(1.dp, Color(0xFF5A4420), CircleShape)
                    .pressable(scale = 0.90f) {
                        onOpenProfile()
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = "Profile",
                    tint = Color.White,
                    modifier = Modifier.size(22.dp)
                )
            }
        }
    }
}

@Composable
private fun SearchBarField(
    query: String,
    onQueryChange: (String) -> Unit
) {
    val searchShape = RoundedCornerShape(16.dp)

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .height(48.dp)
            .clip(searchShape)
            .background(Color(0xFF181C26))
            .border(1.dp, DashitColors.Hairline, searchShape)
            .padding(horizontal = 14.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(
                imageVector = Icons.Default.Search,
                contentDescription = "Search",
                tint = DashitColors.TextMuted,
                modifier = Modifier.size(20.dp)
            )

            Box(modifier = Modifier.weight(1f)) {
                if (query.isEmpty()) {
                    Text(
                        text = "Search \"ganesh idol\"",
                        color = DashitColors.TextMuted,
                        fontSize = 14.sp
                    )
                }
                BasicTextField(
                    value = query,
                    onValueChange = onQueryChange,
                    textStyle = TextStyle(
                        color = DashitColors.TextPrimary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    ),
                    cursorBrush = SolidColor(DashitColors.BrandOrange),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            Icon(
                imageVector = Icons.Default.Mic,
                contentDescription = "Voice Search",
                tint = Color.White,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

@Composable
private fun CategoryTabsRow(
    categories: List<Category>,
    selectedCategory: String?,
    onSelectCategory: (String?) -> Unit
) {
    val view = LocalView.current
    val allTabs = remember(categories) {
        if (categories.any { it.id.equals("all", ignoreCase = true) }) {
            categories
        } else {
            listOf(Category(id = "all", name = "All")) + categories
        }
    }

    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        items(allTabs, key = { it.id }) { cat ->
            val isSelected = if (cat.id == "all") selectedCategory == null else selectedCategory.equals(cat.name, ignoreCase = true)
            val icon = getCategoryIcon(cat.name)

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .pressable(scale = 0.92f) {
                        HapticsManager.selection(view)
                        if (cat.id == "all") {
                            onSelectCategory(null)
                        } else {
                            onSelectCategory(cat.name)
                        }
                    }
                    .padding(vertical = 4.dp)
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = cat.name,
                    tint = if (isSelected) Color.White else DashitColors.TextMuted,
                    modifier = Modifier.size(24.dp)
                )

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = cat.name,
                    color = if (isSelected) Color.White else DashitColors.TextMuted,
                    fontSize = 11.5.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                )

                Spacer(modifier = Modifier.height(4.dp))

                // Active white indicator bar
                Box(
                    modifier = Modifier
                        .width(22.dp)
                        .height(2.5.dp)
                        .clip(RoundedCornerShape(1.dp))
                        .background(if (isSelected) Color.White else Color.Transparent)
                )
            }
        }
    }
}

private fun getCategoryIcon(name: String): ImageVector {
    return when (name.lowercase()) {
        "all" -> Icons.Default.ShoppingBag
        "ganeshotsav", "seasonal" -> Icons.Default.Celebration
        "electronics" -> Icons.Default.Headphones
        "beauty" -> Icons.Default.Spa
        "gifting" -> Icons.Default.CardGiftcard
        "dairy", "dairy, bread & eggs" -> Icons.Default.Coffee
        "chips & namkeen", "snacks" -> Icons.Default.Fastfood
        "drinks & juices", "drinks" -> Icons.Default.LocalDrink
        "vegetables & fruits", "vegetables" -> Icons.Default.Eco
        "sweets & chocolates", "bakery" -> Icons.Default.Cake
        else -> Icons.Default.GridView
    }
}
