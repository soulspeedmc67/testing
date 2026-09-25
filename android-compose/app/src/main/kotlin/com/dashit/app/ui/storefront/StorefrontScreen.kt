package com.dashit.app.ui.storefront

import com.dashit.app.ui.components.HomeFeedSkeleton
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
import com.dashit.app.ui.components.HeroBanner
import com.dashit.app.ui.components.NavigationTab
import com.dashit.app.ui.components.ProductCard
import com.dashit.app.ui.components.WelcomeHeroBanner
import com.dashit.app.ui.orders.DeliveredCelebrationSheet
import com.dashit.app.ui.orders.LiveTrackingMapScreen
import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.ui.platform.LocalContext
import com.dashit.app.data.OrderNotifications
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.layout.widthIn
import androidx.compose.ui.graphics.TransformOrigin
import com.dashit.app.data.auth.AuthRepository
import com.dashit.app.ui.orders.OrderStatusPill
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
    val activeOrder by OrderRepository.shared.activeOrder.collectAsState()
    val liveTracking by OrderRepository.shared.liveTracking.collectAsState()
    val allProducts by storefrontVm.products.collectAsState()
    val signedInUser by AuthRepository.user.collectAsState()

    var activeTab by remember { mutableStateOf(NavigationTab.HOME) }
    var detailProduct by remember { mutableStateOf<Product?>(null) }
    var trackingOrderId by remember { mutableStateOf<String?>(null) }
    var isCartSheetOpen by remember { mutableStateOf(false) }
    var isCheckoutOpen by remember { mutableStateOf(false) }
    var isProfileOpen by remember { mutableStateOf(false) }
    var isAddressSheetOpen by remember { mutableStateOf(false) }
    var currentAddress by remember { mutableStateOf(DeliveryAddress()) }
    val productSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val cartSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val checkoutSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val addressSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val context = LocalContext.current
    val notificationPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }

    // Delivered while the app is open (or before it was reopened): close whatever
    // is in front, then celebrate.
    val deliveredCelebration by OrderRepository.shared.deliveredCelebration.collectAsState()
    var celebrationOrder by remember { mutableStateOf<Order?>(null) }
    LaunchedEffect(deliveredCelebration?.id) {
        val order = deliveredCelebration ?: return@LaunchedEffect
        val covered = trackingOrderId != null || isCartSheetOpen || isCheckoutOpen ||
            isProfileOpen || isAddressSheetOpen || detailProduct != null
        trackingOrderId = null
        isCartSheetOpen = false
        isCheckoutOpen = false
        isProfileOpen = false
        isAddressSheetOpen = false
        detailProduct = null
        delay(if (covered) 600 else 200)
        celebrationOrder = order
    }

    BackHandler(enabled = isAddressSheetOpen || isProfileOpen || trackingOrderId != null || detailProduct != null || isCheckoutOpen || isCartSheetOpen || !isBrowsing || activeTab != NavigationTab.HOME) {
        when {
            isAddressSheetOpen -> isAddressSheetOpen = false
            isProfileOpen -> isProfileOpen = false
            trackingOrderId != null -> trackingOrderId = null
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
                user = signedInUser,
                onSignOut = { isProfileOpen = false }
            )
        } else if (trackingOrderId != null) {
            LiveTrackingMapScreen(
                orderId = trackingOrderId!!,
                products = allProducts,
                onBack = { trackingOrderId = null }
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

                // Skeletons until the live catalogue arrives, then the real feed.
                if (allProducts.isEmpty()) {
                    item(key = "home_skeleton") { HomeFeedSkeleton() }
                } else if (categoryTiles.isNotEmpty()) {
                    // "Bestsellers" Blinkit 3-Column Collage Tiles
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
            onTrackOrder = { trackingOrderId = it.id }
        )
    }
}

        // The live order, docked above the tab bar like the iOS app; the cart bar stacks on top.
        AnimatedVisibility(
            visible = activeOrder != null && trackingOrderId == null && !isProfileOpen,
            enter = fadeIn() + scaleIn(initialScale = 0.6f, transformOrigin = TransformOrigin(0.5f, 1f)),
            exit = fadeOut() + scaleOut(targetScale = 0.6f, transformOrigin = TransformOrigin(0.5f, 1f)),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = 76.dp)
                .padding(horizontal = 24.dp)
                .widthIn(max = 360.dp)
        ) {
            val order = activeOrder
            if (order != null) {
                OrderStatusPill(
                    order = order,
                    tracking = liveTracking,
                    onOpen = { trackingOrderId = order.id },
                    onDismiss = { OrderRepository.shared.retireActiveOrder() }
                )
            }
        }

        // Floating Cart Bar (Above Bottom Nav)
        AnimatedVisibility(
            visible = cartItems.isNotEmpty(),
            enter = fadeIn(DashitMotion.snappySpring()),
            exit = fadeOut(DashitMotion.snappySpring()),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = if (activeOrder != null && trackingOrderId == null) 144.dp else 76.dp)
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

        // Crossing ₹299 while shopping: shown here unless a sheet is in front.
        com.dashit.app.ui.cart.FreeDeliveryToastHost(
            modifier = Modifier.align(Alignment.TopCenter),
            enabled = !isCartSheetOpen && detailProduct == null
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
                address = currentAddress,
                onDismiss = { isCheckoutOpen = false },
                onOrderPlaced = { orderId ->
                    isCheckoutOpen = false
                    // Asked once, right after the first order, when the reason is obvious.
                    if (OrderNotifications.shouldAskPermission(context)) {
                        OrderNotifications.markPermissionAsked(context)
                        notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
                    }
                    // Straight onto the live map, as the iOS app does.
                    trackingOrderId = orderId
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

        celebrationOrder?.let { order ->
            DeliveredCelebrationSheet(
                order = order,
                onReorder = { cartVm.reorder(order.items) },
                onDismiss = {
                    celebrationOrder = null
                    OrderRepository.shared.finishCelebration()
                }
            )
        }
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
