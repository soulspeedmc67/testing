package com.dashit.app.ui.storefront

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.animation.core.tween
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.statusBars
import androidx.compose.runtime.derivedStateOf
import androidx.compose.foundation.lazy.rememberLazyListState
import com.dashit.app.ui.components.HomeFeedSkeleton
import com.dashit.app.ui.components.ProductGridSkeleton
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.isImeVisible
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
import androidx.compose.foundation.lazy.itemsIndexed
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
import androidx.compose.runtime.withFrameNanos
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
import com.dashit.app.core.design.slideInFromLeft
import com.dashit.app.data.model.Category
import com.dashit.app.data.model.DeliveryAddress
import com.dashit.app.data.model.Order
import com.dashit.app.data.model.OrderStatus
import com.dashit.app.data.model.Product
import com.dashit.app.data.repository.OrderRepository
import com.dashit.app.ui.address.AddressMenuPopup
import com.dashit.app.ui.address.AddressPinPicker
import com.dashit.app.ui.address.AddressSearchScreen
import com.dashit.app.ui.address.PinStart
import com.dashit.app.data.AddressBook
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.boundsInWindow
import androidx.compose.ui.geometry.Rect
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

@OptIn(ExperimentalFoundationApi::class, ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
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
    // Photos the home feed shows first, saved ahead of time on Wi-Fi.
    val photoContext = LocalContext.current
    LaunchedEffect(rails, categoryTiles) {
        com.dashit.app.data.ProductPhotos.prefetch(
            photoContext,
            categoryTiles.flatMap { it.previewImages } + rails.flatMap { rail -> rail.products.take(6).map { it.img } }
        )
    }
    val filteredProducts by storefrontVm.filteredProducts.collectAsState()
    val filteredProductRows = remember(filteredProducts) { filteredProducts.chunked(3) }
    val tobaccoProducts by storefrontVm.tobaccoProducts.collectAsState()
    val isBrowsing by storefrontVm.isBrowsing.collectAsState()
    val selectedCategory by storefrontVm.selectedCategory.collectAsState()
    val searchQuery by storefrontVm.searchQuery.collectAsState()

    val cartItems by cartVm.items.collectAsState()
    // How many of each item are in the cart, worked out once per cart change, not once per card.
    val cartQty = remember(cartItems) {
        cartItems.groupingBy { it.productId }.fold(0) { total, item -> total + item.qty }
    }
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
    // The "Deliver to" menu, address search and the full-screen pin picker.
    var isAddressMenuOpen by remember { mutableStateOf(false) }
    var isAddressSearchOpen by remember { mutableStateOf(false) }
    var pinStart by remember { mutableStateOf<PinStart?>(null) }
    var addressAnchor by remember { mutableStateOf<Rect?>(null) }
    // Search grows out of the search bar, so it zooms from where it was tapped.
    var searchBarY by remember { mutableStateOf(0f) }
    var screenHeight by remember { mutableStateOf(1f) }
    val isAddressSheetOpen = isAddressMenuOpen || isAddressSearchOpen || pinStart != null
    // Full-page search over the home feed; the tab bar steps aside while it's open.
    var isSearchOpen by remember { mutableStateOf(false) }
    val isKeyboardOpen = WindowInsets.isImeVisible
    val savedCurrentAddress by AddressBook.current.collectAsState()
    val currentAddress = savedCurrentAddress ?: remember { DeliveryAddress() }
    val productSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val cartSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val checkoutSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
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
        isAddressMenuOpen = false
        isAddressSearchOpen = false
        pinStart = null
        detailProduct = null
        delay(if (covered) 600 else 200)
        celebrationOrder = order
    }

    BackHandler(enabled = isAddressSheetOpen || isProfileOpen || trackingOrderId != null || detailProduct != null || isCheckoutOpen || isCartSheetOpen || isSearchOpen || !isBrowsing || activeTab != NavigationTab.HOME) {
        when {
            // The address screens handle their own back.
            isAddressSheetOpen -> Unit
            isProfileOpen -> isProfileOpen = false
            trackingOrderId != null -> trackingOrderId = null
            detailProduct != null -> detailProduct = null
            isCheckoutOpen -> {
                isCheckoutOpen = false
                isCartSheetOpen = true
            }
            isCartSheetOpen -> isCartSheetOpen = false
            isSearchOpen -> isSearchOpen = false
            !isBrowsing -> storefrontVm.clearFilter()
            activeTab != NavigationTab.HOME -> activeTab = NavigationTab.HOME
        }
    }

    // The floating tab bar slides away while scrolling down and returns on the
    // way back up, as on iPhone. Every list under this Box feeds it.
    var isDockShown by remember { mutableStateOf(true) }
    val hideDistance = with(LocalDensity.current) { 28.dp.toPx() }
    val dockScroll = remember(hideDistance) {
        object : NestedScrollConnection {
            private var travelled = 0f
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                val dy = available.y
                if (dy == 0f) return Offset.Zero
                // A change of direction starts the count again.
                if ((dy < 0f) != (travelled < 0f)) travelled = 0f
                travelled += dy
                if (travelled <= -hideDistance && isDockShown) isDockShown = false
                if (travelled >= hideDistance / 2 && !isDockShown) isDockShown = true
                return Offset.Zero
            }
        }
    }
    LaunchedEffect(activeTab, isSearchOpen, trackingOrderId, isProfileOpen) { isDockShown = true }
    // Bottom clearance for what floats above the bar: it drops to the screen's edge when the bar is away.
    val dockInset by animateDpAsState(if (isDockShown) 76.dp else 14.dp, label = "dock_inset")

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DashitColors.Surface)
            .nestedScroll(dockScroll)
            .onGloballyPositioned { screenHeight = it.size.height.toFloat().coerceAtLeast(1f) }
    ) {
        if (trackingOrderId != null) {
            LiveTrackingMapScreen(
                orderId = trackingOrderId!!,
                products = allProducts,
                onBack = { trackingOrderId = null }
            )
        } else {
            when (activeTab) {
                NavigationTab.HOME -> {
                    val homeList = rememberLazyListState()
                    // Opening a category, search or "all" shows its list from the
                    // top. The scroll position of the page before it stayed, which
                    // left the new list scrolled past its end: a blank screen.
                    // Item 1 is the pinned search bar, so the list starts right under it.
                    val showingKey = selectedCategory to searchQuery
                    var shownBefore by remember { mutableStateOf<Pair<String?, String>?>(null) }
                    // Switching shelves shows skeleton cards for a moment, then the
                    // new items fade in, instead of the old grid jumping into the new one.
                    var isSwitching by remember { mutableStateOf(false) }
                    LaunchedEffect(showingKey) {
                        if (shownBefore != null && shownBefore != showingKey) {
                            isSwitching = true
                            withFrameNanos { }
                            // Only when scrolled past the search bar: with the header
                            // in view the list already starts at the top.
                            if (homeList.firstVisibleItemIndex >= 1) homeList.scrollToItem(1)
                            delay(240)
                            isSwitching = false
                        }
                        shownBefore = showingKey
                    }
                    // The search bar only needs room for the status bar once it
                    // sticks to the top; above that the header already has it.
                    val searchPinned by remember { derivedStateOf { homeList.firstVisibleItemIndex > 0 } }
                    val statusBarTop = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
                    val searchTopInset by animateDpAsState(if (searchPinned) statusBarTop else 0.dp, label = "search_inset")
                    LazyColumn(
                        state = homeList,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 140.dp)
                    ) {
                    // 1. Top Header: ETA + Address + Profile
                    item(key = "header") {
                        StorefrontHeader(
                            address = currentAddress,
                            onOpenAddressPicker = {
                                HapticsManager.light(view)
                                isAddressMenuOpen = true
                            },
                            onAddressRowPlaced = { addressAnchor = it },
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
                        .padding(top = searchTopInset + 4.dp, bottom = 8.dp)
                ) {
                    // Search Bar
                    SearchBarField(
                        modifier = Modifier.onGloballyPositioned { searchBarY = it.boundsInWindow().center.y },
                        onOpen = {
                            HapticsManager.light(view)
                            isSearchOpen = true
                        }
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
                // Welcome line, straight on the page
                item(key = "welcome_hero_banner") {
                    Box(modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 2.dp)) {
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
                                val qty = cartQty[product.id] ?: 0
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
                            text = if (isSwitching) " " else "${filteredProducts.size} items",
                            color = DashitColors.TextMuted,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                val chunkedProducts = filteredProductRows
                if (isSwitching) {
                    item(key = "switch_skeleton") {
                        ProductGridSkeleton(
                            columns = 3,
                            rows = 4,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 5.dp)
                        )
                    }
                } else items(chunkedProducts, key = { it.first().id }) { rowProducts ->
                    Row(
                        modifier = Modifier
                            .animateItem(fadeInSpec = tween(260), placementSpec = null, fadeOutSpec = null)
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 5.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        rowProducts.forEach { product ->
                            val qty = cartQty[product.id] ?: 0
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

        // Search fades and rises in over the page, which stays where it was (so
        // closing search returns to the same place in the feed).
        AnimatedVisibility(
            visible = isSearchOpen && !isProfileOpen && trackingOrderId == null,
            enter = fadeIn(tween(180)) + scaleIn(
                androidx.compose.animation.core.spring(dampingRatio = 0.86f, stiffness = 380f),
                initialScale = 0.88f,
                transformOrigin = TransformOrigin(0.5f, (searchBarY / screenHeight).coerceIn(0f, 1f))
            ),
            exit = fadeOut(tween(160)) + scaleOut(
                tween(200, easing = androidx.compose.animation.core.FastOutLinearInEasing),
                targetScale = 0.92f,
                transformOrigin = TransformOrigin(0.5f, (searchBarY / screenHeight).coerceIn(0f, 1f))
            )
        ) {
            // Opaque and swallowing touches, so nothing underneath reacts.
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(DashitColors.Surface)
                    .pointerInput(Unit) { detectTapGestures { } }
            ) {
                SearchScreen(
                    products = allProducts,
                    tobaccoProducts = tobaccoProducts,
                    categories = categories,
                    cartItems = cartItems,
                    onOpenProduct = { detailProduct = it },
                    onAdd = { cartVm.add(it) },
                    onDecrement = { cartVm.decrementLatest(it.id) },
                    onClose = { isSearchOpen = false }
                )
            }
        }

        // The live order, docked above the tab bar like the iOS app; the cart bar stacks on top.
        AnimatedVisibility(
            visible = activeOrder != null && trackingOrderId == null && !isProfileOpen && !isSearchOpen,
            enter = fadeIn() + scaleIn(initialScale = 0.6f, transformOrigin = TransformOrigin(0.5f, 1f)),
            exit = fadeOut() + scaleOut(targetScale = 0.6f, transformOrigin = TransformOrigin(0.5f, 1f)),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = dockInset)
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
            visible = cartItems.isNotEmpty() && !(isSearchOpen && isKeyboardOpen),
            enter = fadeIn(DashitMotion.snappySpring()),
            exit = fadeOut(DashitMotion.snappySpring()),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(
                    bottom = when {
                        isSearchOpen -> 16.dp
                        activeOrder != null && trackingOrderId == null -> dockInset + 68.dp
                        else -> dockInset
                    }
                )
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
        AnimatedVisibility(
            visible = !isSearchOpen && isDockShown,
            enter = slideInVertically(tween(260, easing = androidx.compose.animation.core.FastOutSlowInEasing)) { it } + fadeIn(tween(200)),
            exit = slideOutVertically(tween(220, easing = androidx.compose.animation.core.FastOutLinearInEasing)) { it } + fadeOut(tween(160)),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            BottomNavBar(
                selectedTab = activeTab,
                modifier = Modifier
                    .padding(bottom = 6.dp)
                    .navigationBarsPadding(),
                onTabSelected = { activeTab = it }
            )
        }

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
                onDecrement = { prod -> cartVm.decrementLatest(prod.id) },
                similar = remember(detailProduct, allProducts) {
                    val current = detailProduct!!
                    allProducts
                        .filter { it.cat.equals(current.cat, true) && it.id != current.id && !it.isAgeRestricted }
                        .sortedBy { it.img.isBlank() }
                        .take(9)
                },
                quantityOf = { p -> cartQty[p.id] ?: 0 },
                onOpenProduct = { detailProduct = it }
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

        // Profile slides in from the right over the shop, which stays as it was underneath.
        AnimatedVisibility(
            visible = isProfileOpen,
            enter = slideInHorizontally(tween(320, easing = androidx.compose.animation.core.FastOutSlowInEasing)) { it } + fadeIn(tween(120)),
            exit = slideOutHorizontally(tween(260, easing = androidx.compose.animation.core.FastOutSlowInEasing)) { it }
        ) {
            ProfileScreen(
                user = signedInUser,
                addressSummary = currentAddress.displaySummary,
                onBack = { isProfileOpen = false },
                onOpenAddress = { pinStart = PinStart(locateOnOpen = AddressBook.current.value == null) },
                onSignOut = { isProfileOpen = false }
            )
        }

        // "Deliver to": grows out of the header's address row.
        if (isAddressMenuOpen) {
            AddressMenuPopup(
                anchor = addressAnchor,
                onSearch = { isAddressSearchOpen = true },
                onPickOnMap = { pinStart = PinStart(locateOnOpen = AddressBook.current.value == null) },
                onDismiss = { isAddressMenuOpen = false }
            )
        }
        AnimatedVisibility(
            visible = isAddressSearchOpen,
            enter = slideInHorizontally(tween(300, easing = androidx.compose.animation.core.FastOutSlowInEasing)) { it },
            exit = slideOutHorizontally(tween(240)) { it }
        ) {
            AddressSearchScreen(
                onBack = { isAddressSearchOpen = false },
                onUseMyLocation = { pinStart = PinStart(locateOnOpen = true, isNew = true) },
                onPick = { place -> pinStart = PinStart(place.lat, place.lng, place.title, isNew = true) }
            )
        }
        AnimatedVisibility(
            visible = pinStart != null,
            enter = slideInHorizontally(tween(320, easing = androidx.compose.animation.core.FastOutSlowInEasing)) { it },
            exit = slideOutHorizontally(tween(240)) { it }
        ) {
            // Kept while sliding out, so the picker doesn't blank mid-animation.
            val held = remember { arrayOf(PinStart()) }
            pinStart?.let { held[0] = it }
            val start = held[0]
            AddressPinPicker(
                start = start,
                onBack = { pinStart = null },
                onSaved = {
                    pinStart = null
                    isAddressSearchOpen = false
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
    onAddressRowPlaced: (Rect) -> Unit,
    onOpenProfile: () -> Unit
) {
    val view = LocalView.current
    val isDark = DashitColors.isDark
    // Dark: the warm gold glow. Light: the web header's soft peach.
    val headline = if (isDark) Color.White else DashitColors.TextPrimary
    val kicker = if (isDark) Color(0xFFFDE68A) else Color(0xFFB45309)
    val addressTint = if (isDark) Color(0xFFFFECC4) else DashitColors.TextSecondary
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    colors = if (isDark) listOf(
                        Color(0xFF8C5D08),
                        Color(0xFF4C3004),
                        DashitColors.Surface
                    ) else listOf(
                        Color(0xFFFFD9B8),
                        Color(0xFFFFEBDA),
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
                    color = kicker,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp
                )

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = "8 minutes",
                    color = headline,
                    fontSize = 30.sp,
                    fontWeight = FontWeight.Black,
                    lineHeight = 34.sp
                )

                Spacer(modifier = Modifier.height(4.dp))

                // Location selector opening bottom sheet
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier
                        .onGloballyPositioned { onAddressRowPlaced(it.boundsInWindow()) }
                        .pressable(scale = 0.96f) {
                        HapticsManager.light(view)
                        onOpenAddressPicker()
                    }
                ) {
                    Text(
                        text = address.displaySummary,
                        color = addressTint,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    Icon(
                        imageVector = Icons.Default.KeyboardArrowDown,
                        contentDescription = "Change address",
                        tint = addressTint,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            // Top Right Profile Avatar Button (Wallet removed)
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(if (isDark) Color(0xFF2C2214) else Color.White.copy(alpha = 0.7f))
                    .border(1.dp, if (isDark) Color(0xFF5A4420) else Color(0xFFF2C9A4), CircleShape)
                    .pressable(scale = 0.90f) {
                        onOpenProfile()
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = "Profile",
                    tint = headline,
                    modifier = Modifier.size(22.dp)
                )
            }
        }
    }
}

/** Opens the search page; typing happens there. */
@Composable
private fun SearchBarField(
    modifier: Modifier = Modifier,
    onOpen: () -> Unit
) {
    val searchShape = RoundedCornerShape(16.dp)

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .height(48.dp)
            .clip(searchShape)
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, searchShape)
            .clickable(onClickLabel = "Search products") { onOpen() }
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
                Text(
                    text = "Search \"ganesh idol\"",
                    color = DashitColors.TextMuted,
                    fontSize = 14.sp
                )
            }

            Icon(
                imageVector = Icons.Default.Mic,
                contentDescription = "Voice Search",
                tint = DashitColors.TextPrimary,
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
        itemsIndexed(allTabs, key = { _, cat -> cat.id }) { index, cat ->
            val isSelected = if (cat.id == "all") selectedCategory == null else selectedCategory.equals(cat.name, ignoreCase = true)
            val icon = getCategoryIcon(cat.name)

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    // Slide in from the left, one after another, on the first look after launch.
                    .slideInFromLeft("categoryTabs", index, isReady = categories.isNotEmpty())
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
                    tint = if (isSelected) DashitColors.TextPrimary else DashitColors.TextMuted,
                    modifier = Modifier.size(24.dp)
                )

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = cat.name,
                    color = if (isSelected) DashitColors.TextPrimary else DashitColors.TextMuted,
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
                        .background(if (isSelected) DashitColors.TextPrimary else Color.Transparent)
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
        "snacks" -> Icons.Default.Fastfood
        "drinks & juices", "drinks" -> Icons.Default.LocalDrink
        "vegetables & fruits", "vegetables" -> Icons.Default.Eco
        "sweets & chocolates", "bakery" -> Icons.Default.Cake
        else -> Icons.Default.GridView
    }
}
