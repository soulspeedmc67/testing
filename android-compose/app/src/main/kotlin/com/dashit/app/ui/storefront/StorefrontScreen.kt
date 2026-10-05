package com.dashit.app.ui.storefront

import androidx.compose.runtime.saveable.rememberSaveable
import com.dashit.app.data.DeliveryEta
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
import androidx.compose.material.icons.filled.*
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
import androidx.compose.ui.layout.positionInWindow
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Animatable
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
    // Tells the launch splash the feed is built (products, tiles and rails, the
    // last to be worked out), so it lifts onto a finished screen.
    val isFeedBuilt = allProducts.isNotEmpty() && categoryTiles.isNotEmpty() && rails.isNotEmpty()
    LaunchedEffect(isFeedBuilt) {
        if (isFeedBuilt) com.dashit.app.core.design.AppReveal.homeReady()
    }
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
    // Where the feed's search bar is, kept without state so scrolling doesn't recompose.
    val searchBar = remember { SearchBarBounds() }
    // The search page grows out of the bar (0) to the whole screen (1) and back.
    val searchZoom = remember { Animatable(0f) }
    var isSearchShown by remember { mutableStateOf(false) }
    var searchFrom by remember { mutableStateOf(Rect.Zero) }
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

    /* With no address yet, a sheet explains why we want their location before Android asks for it. */
    var isLocationAskOpen by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(1500)
        if (AddressBook.current.value == null) isLocationAskOpen = true
    }
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
                        modifier = Modifier.onGloballyPositioned { searchBar.rect = it.boundsInWindow() },
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
                            text = "Shop by category",
                            color = DashitColors.TextPrimary,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            modifier = Modifier.padding(start = 16.dp, top = 18.dp, bottom = 12.dp)
                        )
                    }

                    // 3-Column Collage Grid in Rows of 3
                    // A few everyday categories, not all of them: the rest are on the Categories tab.
                    val homeTiles = categoryTiles.filter { com.dashit.app.data.Departments.isEveryday(it.name) }
                        .ifEmpty { categoryTiles }.take(6)
                    val chunkedTiles = homeTiles.chunked(3)
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
                rails.filter { com.dashit.app.data.Departments.isEveryday(it.title) }.ifEmpty { rails.take(7) }.forEach { rail ->
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

        // Search grows out of the bar that was tapped into the whole screen, and
        // folds back into it; the feed underneath stays where it was.
        LaunchedEffect(isSearchOpen) {
            if (isSearchOpen) {
                searchFrom = searchBar.rect
                isSearchShown = true
                // The page's first frame is the heavy one: let it draw (still
                // invisible at 0) before the clock starts, or the start is skipped.
                withFrameNanos { }
                withFrameNanos { }
                searchZoom.animateTo(1f, tween(460, easing = SearchZoomEasing))
            } else if (isSearchShown) {
                searchFrom = searchBar.rect
                searchZoom.animateTo(0f, tween(300, easing = SearchFoldEasing))
                isSearchShown = false
            }
        }
        if (isSearchShown && !isProfileOpen && trackingOrderId == null) {
            val statusTop = WindowInsets.statusBars.getTop(LocalDensity.current).toFloat()
            var origin by remember { mutableStateOf(Offset.Zero) }
            // The panel: from the bar's rounded rectangle to the screen.
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .onGloballyPositioned { origin = it.positionInWindow() }
                    .graphicsLayer {
                        val p = searchZoom.value
                        // The shape fills a little ahead of the page's glide, so
                        // its lower edge doesn't creep over the feed at the end.
                        val g = 1 - (1 - p) * (1 - p)
                        val bar = searchBarRect(searchFrom, origin, statusTop)
                        val panel = Rect(
                            bar.left * (1 - g),
                            bar.top * (1 - g),
                            bar.right + (size.width - bar.right) * g,
                            bar.bottom + (size.height - bar.bottom) * g
                        )
                        val radius = 16.dp.toPx() * (1 - g)
                        shape = object : Shape {
                            override fun createOutline(size: Size, layoutDirection: LayoutDirection, density: Density) =
                                Outline.Rounded(RoundRect(panel, CornerRadius(radius)))
                        }
                        clip = true
                        // Solid except while it is still about the bar's size, so
                        // the page and the feed are never seen through each other.
                        alpha = (g / 0.12f).coerceAtMost(1f)
                    }
                    .background(DashitColors.Surface)
                    // Opaque and swallowing touches, so nothing underneath reacts.
                    .pointerInput(Unit) { detectTapGestures { } }
            ) {
                // The page rides with the panel: its field starts where the tapped
                // bar was and settles in its place at the top.
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer {
                            val p = searchZoom.value
                            val bar = searchBarRect(searchFrom, origin, statusTop)
                            translationX = (bar.left - 48.dp.toPx()) * (1 - p)
                            translationY = (bar.top - (statusTop + 6.dp.toPx())) * (1 - p)
                        }
                ) {
                    SearchScreen(
                        products = allProducts,
                        tobaccoProducts = tobaccoProducts,
                        categories = categories,
                        cartItems = cartItems,
                        onOpenProduct = { detailProduct = it },
                        onAdd = { cartVm.add(it) },
                        onDecrement = { cartVm.decrementLatest(it.id) },
                        onPickCategory = {
                            storefrontVm.clearFilter()
                            storefrontVm.selectCategory(it)
                            isSearchOpen = false
                        },
                        onClose = { isSearchOpen = false }
                    )
                }
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
                val pillRoute = com.dashit.app.ui.orders.rememberRouteProgress(order, liveTracking?.takeIf { order.status == OrderStatus.OUT_FOR_DELIVERY })
                OrderStatusPill(
                    order = order,
                    tracking = liveTracking,
                    routeEtaMinutes = pillRoute.etaMinutes(liveTracking?.speed),
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
                        .sortedWith(compareBy({ !it.isAvailable }, { it.img.isBlank() }))
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
        if (isLocationAskOpen) {
            DeliveryAreaSheet(
                title = "Where should we deliver?",
                message = "We deliver within 8 km of our store in Anantnag. Share your location and we'll tell you straight away if we reach you.",
                primary = "Use my current location",
                secondary = "Not now",
                onPrimary = {
                    isLocationAskOpen = false
                    pinStart = PinStart(locateOnOpen = true, isNew = true)
                },
                onDismiss = { isLocationAskOpen = false }
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

                // From the address, the store's switch and high demand, as on the iPhone app.
                val quote = remember(address.latitude, address.longitude) {
                    com.dashit.app.data.DeliveryEta.quote(address.latitude, address.longitude)
                }
                val store by com.dashit.app.data.StoreStatus.state.collectAsState()
                val eta = remember(quote, store) { com.dashit.app.data.StoreStatus.etaMinutes(quote) }
                Text(
                    text = when {
                        !store.isOpen -> "Closed now"
                        eta == null -> "Not here yet"
                        else -> "$eta minutes"
                    },
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
    val clean = name.lowercase().trim()
    return when {
        clean == "all" -> Icons.Default.ShoppingBag
        clean.contains("fruit") -> Icons.Default.LocalFlorist
        clean.contains("staple") || clean.contains("atta") || clean.contains("rice") || clean.contains("dal") -> Icons.Default.Grain
        clean.contains("biscuit") || clean.contains("cookie") -> Icons.Default.Cookie
        clean.contains("bakery") || clean.contains("bread") -> Icons.Default.BakeryDining
        clean.contains("snack") || clean.contains("chip") || clean.contains("namkeen") -> Icons.Default.Fastfood
        clean.contains("drink") || clean.contains("juice") || clean.contains("beverage") -> Icons.Default.LocalDrink
        clean.contains("tea") || clean.contains("coffee") -> Icons.Default.Coffee
        clean.contains("dairy") || clean.contains("milk") || clean.contains("egg") -> Icons.Default.Egg
        clean.contains("instant") || clean.contains("maggi") || clean.contains("noodle") -> Icons.Default.RamenDining
        clean.contains("chicken") || clean.contains("meat") || clean.contains("fish") -> Icons.Default.SetMeal
        clean.contains("sweet") || clean.contains("chocolate") || clean.contains("candy") -> Icons.Default.Cake
        clean.contains("ice cream") -> Icons.Default.Icecream
        clean.contains("spice") || clean.contains("masala") -> Icons.Default.Whatshot
        clean.contains("sauce") || clean.contains("spread") -> Icons.Default.WaterDrop
        clean.contains("dry fruit") || clean.contains("nut") -> Icons.Default.Forest
        clean.contains("personal") || clean.contains("beauty") || (clean.contains("care") && !clean.contains("home") && !clean.contains("baby") && !clean.contains("pet")) -> Icons.Default.Spa
        clean.contains("home") || clean.contains("clean") -> Icons.Default.CleaningServices
        clean.contains("kitchen") -> Icons.Default.Kitchen
        clean.contains("baby") -> Icons.Default.ChildCare
        clean.contains("pet") -> Icons.Default.Pets
        clean.contains("stationery") || clean.contains("book") -> Icons.Default.Edit
        clean.contains("electronic") || clean.contains("appliance") -> Icons.Default.Bolt
        clean.contains("toy") || clean.contains("game") -> Icons.Default.SportsEsports
        clean.contains("vegetable") || clean.contains("veggie") -> Icons.Default.Eco
        clean.contains("gift") -> Icons.Default.CardGiftcard
        clean.contains("season") || clean.contains("festival") -> Icons.Default.Celebration
        else -> Icons.Default.GridView
    }
}

/** The feed search bar's bounds in the window, written on every layout. */
private class SearchBarBounds {
    var rect: Rect = Rect.Zero
}

/** Quick to leave, long to settle: Material's emphasized curve, for opening. */
private val SearchZoomEasing = CubicBezierEasing(0.2f, 0f, 0f, 1f)

/** Gentle to start, quick into the bar: closing doesn't linger at bar size. */
private val SearchFoldEasing = CubicBezierEasing(0.3f, 0f, 0.8f, 0.15f)

/**
 * The tapped bar inside the search overlay's own coordinates. The bounds
 * include the bar's 16 dp side margins; without bounds yet, the bar's place
 * at the top of the feed.
 */
private fun androidx.compose.ui.unit.Density.searchBarRect(from: Rect, origin: Offset, statusTop: Float): Rect {
    val inset = 16.dp.toPx()
    if (from == Rect.Zero) {
        return Rect(inset, statusTop + 6.dp.toPx(), inset + 300.dp.toPx(), statusTop + 54.dp.toPx())
    }
    return Rect(from.left + inset - origin.x, from.top - origin.y, from.right - inset - origin.x, from.bottom - origin.y)
}

/** A short bottom sheet with one message and two choices, for the delivery-area notices. */
@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
private fun DeliveryAreaSheet(
    title: String,
    message: String,
    primary: String,
    secondary: String,
    onPrimary: () -> Unit,
    onDismiss: () -> Unit
) {
    androidx.compose.material3.ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = DashitColors.SurfaceRaised
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp)
                .padding(bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(text = title, color = DashitColors.TextPrimary, fontSize = 19.sp, fontWeight = FontWeight.Bold)
            Text(text = message, color = DashitColors.TextSecondary, fontSize = 14.sp, lineHeight = 20.sp)
            Text(
                text = primary,
                color = Color.White,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                modifier = Modifier
                    .padding(top = 6.dp)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(DashitColors.BrandOrange)
                    .clickable { onPrimary() }
                    .padding(vertical = 14.dp)
            )
            Text(
                text = secondary,
                color = DashitColors.TextMuted,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .clickable { onDismiss() }
                    .padding(vertical = 10.dp)
            )
        }
    }
}
