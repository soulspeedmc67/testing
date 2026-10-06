package com.dashit.app.ui.checkout

import kotlin.math.ceil
import androidx.compose.ui.platform.LocalContext
import com.dashit.app.data.OnlinePayment
import com.dashit.app.data.PayOption
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.ui.graphics.graphicsLayer
import androidx.core.graphics.drawable.toBitmap
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.RadioButtonChecked
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SheetState
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.DeliveryEta
import com.dashit.app.data.NightCharge
import com.dashit.app.data.ShopRules
import com.dashit.app.data.StoreStatus
import com.dashit.app.data.auth.AuthRepository
import com.dashit.app.data.model.Order
import com.dashit.app.data.model.UserProfile
import com.dashit.app.data.model.DeliveryAddress
import com.dashit.app.data.repository.OrderRepository
import com.dashit.app.viewmodel.CartViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutSheet(
    cartVm: CartViewModel = CartViewModel.shared,
    orderRepo: OrderRepository = OrderRepository.shared,
    sheetState: SheetState,
    address: DeliveryAddress,
    onDismiss: () -> Unit,
    onOrderPlaced: (orderId: String) -> Unit
) {
    val view = LocalView.current
    val context = LocalContext.current
    val bill by cartVm.bill.collectAsState()
    val items by cartVm.items.collectAsState()

    // "cod", or a way to pay online picked here (a UPI app, any UPI, card,
    // netbanking, wallet, EMI, Pay Later); Razorpay then opens on just that.
    // The last choice is kept.
    val prefs = remember { context.getSharedPreferences("dashit_prefs", android.content.Context.MODE_PRIVATE) }
    val payOptions = remember { PayOption.all(context) }
    var paymentMethod by remember {
        val saved = prefs.getString(LAST_PAYMENT_KEY, null)
        mutableStateOf(
            when {
                saved == null || saved == "cod" -> "cod"
                payOptions.any { it.id == saved } -> saved
                // The older "online" choice, or an app since removed: the first UPI way.
                else -> payOptions.first().id
            }
        )
    }
    val paysOnline = paymentMethod != "cod"
    val payOption = payOptions.firstOrNull { it.id == paymentMethod }
    var isSubmitting by remember { mutableStateOf(false) }
    var progressText by remember { mutableStateOf("Placing order...") }
    var orderSuccess by remember { mutableStateOf(false) }
    val coupon by cartVm.coupon.collectAsState()
    val signedInUser by AuthRepository.user.collectAsState()
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isSignInOpen by remember { mutableStateOf(false) }
    var placedEta by remember { mutableStateOf(8) }

    // After 8 pm, or whenever the shop switches it on, delivery is also charged
    // by distance (NightCharge). The time is refreshed so the charge starts at
    // 8 pm on a sheet that was opened before it.
    val storeState by StoreStatus.state.collectAsState()
    var nowMillis by remember { mutableStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(30_000)
            nowMillis = System.currentTimeMillis()
        }
    }
    val distanceKm = remember(address.latitude, address.longitude) {
        DeliveryEta.quote(address.latitude, address.longitude).distanceKm
    }
    val nightFee = if (bill.subtotal > 0) NightCharge.feeFor(distanceKm, storeState, nowMillis) else 0.0
    // Cash on delivery as the shop has set it (ShopRules): on or off, and
    // whether it is taken at night. When it isn't being taken, move to the
    // first way to pay online.
    val cashNote = storeState.rules.cashUnavailableNote(nowMillis)
    LaunchedEffect(cashNote) {
        if (cashNote != null && paymentMethod == "cod") {
            payOptions.firstOrNull()?.let { paymentMethod = it.id }
        }
    }
    // The cart is under the shop's minimum order.
    val belowMinimum = bill.subtotal > 0 && !bill.isMinOrderSatisfied
    val totalToPay = bill.grandTotal + nightFee

    /** Same gates as the web and iOS checkouts, then the real order write. */
    fun placeOrder(customer: UserProfile) {
        errorMessage = null
        if (items.isEmpty()) {
            errorMessage = "Your cart is empty."
            return
        }
        if (com.dashit.app.data.LaunchGate.isBeforeLaunch) {
            errorMessage = "We start delivering on Monday, 5 Oct at 10:00 AM. You can explore products and build your cart now."
            HapticsManager.warning(view)
            return
        }
        val store = StoreStatus.state.value
        if (!store.isOpen) {
            errorMessage = "The store is closed right now. ${store.closeReason}".trim()
            HapticsManager.warning(view)
            return
        }
        if (!bill.isMinOrderSatisfied) {
            errorMessage = "Add ₹${ceil(bill.amountNeededForMinOrder).toInt()} more to place your order. We deliver orders of ₹${ShopRules.whole(store.rules.minOrderValue)} or more."
            HapticsManager.warning(view)
            return
        }
        if (!paysOnline && !store.rules.allowsCash(System.currentTimeMillis())) {
            errorMessage = if (store.rules.codEnabled) {
                "Cash on delivery isn't available after 8 pm. Please pay online to place your order."
            } else {
                "Cash on delivery isn't available right now. Please pay online to place your order."
            }
            HapticsManager.warning(view)
            return
        }
        val quote = DeliveryEta.quote(address.latitude, address.longitude)
        // The total on screen is at most 30 seconds old. If the night charge came
        // on or went off in that time, show the new total before taking the order.
        val timeNow = System.currentTimeMillis()
        if (NightCharge.feeFor(quote.distanceKm, StoreStatus.state.value, timeNow) != nightFee) {
            nowMillis = timeNow
            errorMessage = "The delivery charge has just changed. Check the total and place your order again."
            HapticsManager.warning(view)
            return
        }
        val eta = StoreStatus.etaMinutes(quote) ?: 8
        val code = Order.newCode()
        val order = Order(
            id = code,
            userId = customer.id,
            items = items.map { it.copy() },
            subtotal = bill.subtotal,
            // The night charge is part of the delivery fee; its share is kept beside it.
            deliveryFee = bill.deliveryFee + nightFee,
            discount = bill.couponDiscount,
            grandTotal = totalToPay,
            nightDeliveryFee = nightFee,
            deliveryAddress = address,
            paymentMethod = if (paysOnline) "Paid online" else "Cash on Delivery",
            paymentStatus = if (paysOnline) "paid" else "pending",
            etaMinutes = eta,
            otp = Order.newDeliveryCode(),
            couponCode = coupon?.takeIf { bill.couponDiscount > 0 || it.waivesDelivery == true }?.code
        )
        isSubmitting = true
        progressText = if (paysOnline) "Opening payment..." else "Placing order..."
        prefs.edit().putString(LAST_PAYMENT_KEY, paymentMethod).apply()
        HapticsManager.medium(view)
        // Not tied to this sheet: once money is taken, the order is placed
        // even if the sheet or the screen goes away meanwhile.
        OnlinePayment.scope.launch {
            // Paying online: the payment is taken and confirmed first, and only
            // a confirmed payment places the order.
            var receipt: OnlinePayment.Receipt? = null
            if (paysOnline) {
                val activity = context.findActivity()
                try {
                    if (activity == null) throw OnlinePayment.PaymentException("Online payment isn't available right now. Choose cash on delivery.")
                    receipt = OnlinePayment.pay(activity, code, order.grandTotal, customer, payOption) {
                        progressText = "Confirming payment..."
                    }
                    progressText = "Placing order..."
                } catch (e: OnlinePayment.PaymentException) {
                    if (e.cancelled) HapticsManager.light(view) else HapticsManager.error(view)
                    errorMessage = e.message
                    isSubmitting = false
                    return@launch
                }
            }
            try {
                orderRepo.placeOrder(order, customer, quote.distanceKm, receipt)
                cartVm.clear()
                placedEta = eta
                orderSuccess = true
                HapticsManager.success(view)
                delay(1100)
                onOrderPlaced(order.id)
            } catch (e: Exception) {
                HapticsManager.error(view)
                errorMessage = if (receipt != null) {
                    "Your payment went through (${receipt.razorpayPaymentId}), but the order couldn't be saved. Message us on WhatsApp with that payment ID and we'll sort it out."
                } else {
                    e.message ?: "We couldn't reach the store to place your order. Check your connection and try again."
                }
            } finally {
                isSubmitting = false
            }
        }
    }

    ModalBottomSheet(
        onDismissRequest = {
            if (!isSubmitting) onDismiss()
        },
        sheetState = sheetState,
        containerColor = DashitColors.Surface,
        dragHandle = null,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.92f)
                .background(DashitColors.Surface)
        ) {
            // Header Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(DashitColors.SurfaceRaised)
                            .border(1.dp, DashitColors.Hairline, CircleShape)
                            .clickable {
                                HapticsManager.light(view)
                                onDismiss()
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = DashitColors.TextPrimary,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    Text(
                        text = "Checkout",
                        color = DashitColors.TextPrimary,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(DashitColors.Hairline)
            )

            if (orderSuccess) {
                // Success Celebration Screen
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .clip(CircleShape)
                                .background(DashitColors.Positive.copy(alpha = 0.15f))
                                .border(2.dp, DashitColors.Positive, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                tint = DashitColors.Positive,
                                modifier = Modifier.size(40.dp)
                            )
                        }

                        Text(
                            text = "Order Placed!",
                            color = DashitColors.TextPrimary,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Black
                        )

                        Text(
                            text = "We'll show your arrival time once a rider picks it up",
                            color = DashitColors.TextMuted,
                            fontSize = 14.sp
                        )

                        Text(
                            text = "Fulfilled from DASHit Anantnag Dark Store",
                            color = DashitColors.TextSecondary,
                            fontSize = 12.5.sp
                        )
                    }
                }
            } else {
                // Scrollable Checkout Summary
                val scrollState = rememberScrollState()
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(scrollState)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // 1. Delivery Address Card
                    AddressCard(address = address)

                    // 2. Delivery Time Guarantee Card
                    GuaranteeCard(address)

                    // 3. Payment Method Card
                    PaymentCard(
                        options = payOptions,
                        selectedMethod = paymentMethod,
                        cashNote = cashNote,
                        onSelectMethod = {
                            HapticsManager.selection(view)
                            paymentMethod = it
                        }
                    )

                    // 4. Order Total Card
                    OrderTotalCard(
                        total = totalToPay,
                        nightFee = nightFee,
                        distanceKm = distanceKm,
                        isNight = NightCharge.isNightHours(nowMillis)
                    )

                    Spacer(modifier = Modifier.height(12.dp))
                }

                // Bottom Fixed CTA
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(DashitColors.Surface)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(1.dp)
                            .background(DashitColors.Hairline)
                    )

                    errorMessage?.let {
                        Text(
                            text = it,
                            color = DashitColors.Danger,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 10.dp)
                        )
                    }
                    if (com.dashit.app.data.LaunchGate.isBeforeLaunch) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 6.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(DashitColors.BrandOrange.copy(alpha = 0.12f))
                                .border(1.dp, DashitColors.BrandOrange.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                                .padding(horizontal = 14.dp, vertical = 10.dp)
                        ) {
                            Text(
                                text = "🚀 Deliveries begin Monday, 5 Oct at 10:00 AM IST in Anantnag. Feel free to browse and prepare your cart!",
                                color = DashitColors.BrandOrange,
                                fontSize = 12.5.sp,
                                fontWeight = FontWeight.SemiBold,
                                lineHeight = 17.sp
                            )
                        }
                    }

                    val isLaunchLocked = com.dashit.app.data.LaunchGate.isBeforeLaunch

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp)
                            .navigationBarsPadding()
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(58.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(
                                    when {
                                        isSubmitting -> DashitColors.SurfaceMuted
                                        isLaunchLocked -> DashitColors.SurfaceRaised
                                        // Grey that white text still reads on, in both themes.
                                        belowMinimum -> Color(0xFF6B7280)
                                        else -> DashitColors.BrandOrange
                                    }
                                )
                                .border(
                                    width = if (isLaunchLocked) 1.dp else 0.dp,
                                    color = if (isLaunchLocked) DashitColors.BrandOrange.copy(alpha = 0.4f) else Color.Transparent,
                                    shape = RoundedCornerShape(16.dp)
                                )
                                .pressable(scale = if (isLaunchLocked) 1f else 0.98f) {
                                    if (isLaunchLocked) {
                                        HapticsManager.warning(view)
                                        errorMessage = "Orders open on Monday, 5 Oct at 10:00 AM. Cart items are saved."
                                    } else if (!isSubmitting) {
                                        val customer = signedInUser
                                        if (customer == null || customer.name.isNullOrBlank() || customer.mobile.isBlank()) {
                                            // Orders need a signed-in shopper with a name and a number the rider can call.
                                            HapticsManager.light(view)
                                            isSignInOpen = true
                                        } else {
                                            placeOrder(customer)
                                        }
                                    }
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            if (isSubmitting) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(20.dp),
                                        color = Color.White,
                                        strokeWidth = 2.5.dp
                                    )
                                    Text(
                                        text = progressText,
                                        color = Color.White,
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            } else {
                                Text(
                                    text = when {
                                        isLaunchLocked -> com.dashit.app.data.LaunchGate.LAUNCH_LABEL
                                        belowMinimum -> "Add ₹${ceil(bill.amountNeededForMinOrder).toInt()} more to order"
                                        !paysOnline -> "Place order · ₹${totalToPay.toInt()} cash"
                                        payOption?.upiApp != null -> "Pay ₹${totalToPay.toInt()} with ${payOption.title}"
                                        else -> "Pay ₹${totalToPay.toInt()}"
                                    },
                                    color = if (isLaunchLocked) DashitColors.BrandOrange else Color.White,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (isSignInOpen) {
        com.dashit.app.ui.auth.SignInSheet(
            onSignedIn = { profile ->
                isSignInOpen = false
                placeOrder(profile)
            },
            onDismiss = { isSignInOpen = false }
        )
    }
}

@Composable
private fun AddressCard(address: DeliveryAddress) {
    val cardShape = RoundedCornerShape(14.dp)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(cardShape)
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, cardShape)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = DashitColors.BrandOrange,
                    modifier = Modifier.size(18.dp)
                )

                Text(
                    text = "Delivering to ${address.nickname}",
                    color = DashitColors.TextPrimary,
                    fontSize = 14.5.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Text(
                text = "Change",
                color = DashitColors.BrandOrange,
                fontSize = 12.5.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Text(
            text = address.formattedSummary,
            color = DashitColors.TextMuted,
            fontSize = 12.sp,
            lineHeight = 16.sp,
            modifier = Modifier.padding(start = 26.dp)
        )
    }
}

@Composable
private fun GuaranteeCard(address: DeliveryAddress) {
    val quote = remember(address.latitude, address.longitude) { DeliveryEta.quote(address.latitude, address.longitude) }
    val eta = StoreStatus.etaMinutes(quote)
    val cardShape = RoundedCornerShape(14.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(cardShape)
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, cardShape)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Icon(
            imageVector = Icons.Default.Bolt,
            contentDescription = null,
            tint = DashitColors.Caution,
            modifier = Modifier.size(24.dp)
        )

        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                text = eta?.let { "Delivery in $it minutes" } ?: "Outside our delivery area",
                color = DashitColors.TextPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "${quote.shortDistanceText} · From the DASHit store in Anantnag",
                color = DashitColors.TextMuted,
                fontSize = 11.5.sp
            )
        }
    }
}

/**
 * How to pay, laid out the way shoppers expect from Blinkit or Zomato: the
 * UPI apps on this phone first, as big logo tiles (the picked app opens
 * straight away at "Pay"), then cards and the other online ways, then cash.
 */
@Composable
private fun PaymentCard(
    options: List<PayOption>,
    selectedMethod: String,
    /** Why cash on delivery can't be chosen right now; null when it can. */
    cashNote: String? = null,
    onSelectMethod: (String) -> Unit
) {
    val view = LocalView.current
    val codEnabled = cashNote == null
    val upiApps = options.filter { it.upiApp != null }
    val others = options.filter { it.upiApp == null }
    // Cards and UPI ID up front; wallets, Pay Later and EMI one tap away.
    val (shown, more) = others.partition { it.method in listOf("upi", "card", "netbanking") }
    var showMore by remember { mutableStateOf(more.any { it.id == selectedMethod }) }
    fun pick(id: String) {
        HapticsManager.selection(view)
        onSelectMethod(id)
    }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Pay with", color = DashitColors.TextPrimary, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)

        if (upiApps.isNotEmpty()) {
            PayGroup(title = "UPI apps", note = "Opens your app straight away") {
                upiApps.chunked(4).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)) {
                        row.forEach { app ->
                            UpiAppTile(app, selected = selectedMethod == app.id, modifier = Modifier.weight(1f)) { pick(app.id) }
                        }
                        repeat(4 - row.size) { Spacer(Modifier.weight(1f)) }
                    }
                }
                Spacer(Modifier.height(6.dp))
            }
        }

        PayGroup(title = "More ways to pay") {
            (shown + if (showMore) more else emptyList()).forEachIndexed { index, option ->
                if (index > 0) PayDivider()
                OnlineOptionRow(option, selected = selectedMethod == option.id) { pick(option.id) }
            }
            if (!showMore && more.isNotEmpty()) {
                PayDivider()
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showMore = true }
                        .padding(horizontal = 14.dp, vertical = 13.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Wallets, Pay Later, EMI",
                        color = DashitColors.BrandAccent,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f)
                    )
                    Icon(Icons.Default.KeyboardArrowDown, contentDescription = null, tint = DashitColors.BrandAccent, modifier = Modifier.size(20.dp))
                }
            }
        }

        PayGroup(title = "Pay on delivery") {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(enabled = codEnabled) { pick("cod") }
                    .alpha(if (codEnabled) 1f else 0.5f)
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MethodBadge(Icons.Default.Payments)
                Column(Modifier.weight(1f)) {
                    Text("Cash on delivery", color = DashitColors.TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                    Text(
                        cashNote ?: "Pay the rider in cash or by UPI at your door",
                        color = DashitColors.TextMuted,
                        fontSize = 12.sp
                    )
                }
                SelectionMark(codEnabled && selectedMethod == "cod")
            }
        }
    }
}

@Composable
private fun PayGroup(title: String, note: String? = null, content: @Composable () -> Unit) {
    val shape = RoundedCornerShape(16.dp)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, shape)
    ) {
        Row(
            modifier = Modifier.padding(start = 14.dp, end = 14.dp, top = 12.dp, bottom = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(title.uppercase(), color = DashitColors.TextMuted, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.8.sp, modifier = Modifier.weight(1f))
            if (note != null) Text(note, color = DashitColors.TextFaint, fontSize = 11.sp)
        }
        content()
    }
}

@Composable
private fun PayDivider() {
    Box(Modifier.fillMaxWidth().padding(start = 62.dp).height(1.dp).background(DashitColors.HairlineSoft))
}

/** Filled orange circle with a tick when picked; an empty ring when not. */
@Composable
private fun SelectionMark(selected: Boolean) {
    Box(
        modifier = Modifier
            .size(22.dp)
            .clip(CircleShape)
            .background(if (selected) DashitColors.BrandOrange else Color.Transparent)
            .border(1.5.dp, if (selected) DashitColors.BrandOrange else DashitColors.HairlineStrong, CircleShape),
        contentAlignment = Alignment.Center
    ) {
        if (selected) Icon(Icons.Default.Check, contentDescription = "Selected", tint = Color.White, modifier = Modifier.size(14.dp))
    }
}

@Composable
private fun MethodBadge(icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Box(
        Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(DashitColors.SurfaceMuted),
        contentAlignment = Alignment.Center
    ) {
        Icon(icon, contentDescription = null, tint = DashitColors.TextSecondary, modifier = Modifier.size(19.dp))
    }
}

/** The app's logo (bundled for the well-known apps, else its own icon). */
@Composable
private fun AppLogo(option: PayOption, size: androidx.compose.ui.unit.Dp) {
    val logo = option.logoRes
    if (logo != null) {
        Image(
            painter = androidx.compose.ui.res.painterResource(logo),
            contentDescription = null,
            modifier = Modifier.size(size).clip(RoundedCornerShape(size / 4.5f))
        )
        return
    }
    val bitmap = remember(option.id) {
        option.icon?.let { runCatching { it.toBitmap(144, 144).asImageBitmap() }.getOrNull() }
    }
    if (bitmap != null) {
        Image(bitmap = bitmap, contentDescription = null, modifier = Modifier.size(size).clip(RoundedCornerShape(size / 4.5f)))
    }
}

@Composable
private fun UpiAppTile(option: PayOption, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .background(if (selected) DashitColors.BrandOrange.copy(alpha = 0.10f) else Color.Transparent)
            .border(1.5.dp, if (selected) DashitColors.BrandOrange else Color.Transparent, RoundedCornerShape(14.dp))
            .pressable(scale = 0.94f, onClick = onClick)
            .padding(vertical = 10.dp, horizontal = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(7.dp)
    ) {
        Box(
            Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(13.dp))
                .background(Color.White)
                .border(1.dp, DashitColors.Hairline, RoundedCornerShape(13.dp)),
            contentAlignment = Alignment.Center
        ) {
            AppLogo(option, size = 40.dp)
        }
        Text(
            text = option.title,
            color = if (selected) DashitColors.BrandAccent else DashitColors.TextPrimary,
            fontSize = 11.5.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            maxLines = 1
        )
    }
}

@Composable
private fun OnlineOptionRow(option: PayOption, selected: Boolean, onClick: () -> Unit) {
    val icon = when (option.method) {
        "card" -> Icons.Default.CreditCard
        "netbanking" -> Icons.Default.AccountBalance
        "wallet" -> Icons.Default.AccountBalanceWallet
        "emi" -> Icons.Default.CalendarMonth
        "paylater" -> Icons.Default.Schedule
        else -> Icons.Default.QrCode2
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        MethodBadge(icon)
        Column(Modifier.weight(1f)) {
            Text(option.title, color = DashitColors.TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            Text(option.subtitle, color = DashitColors.TextMuted, fontSize = 12.sp, maxLines = 1)
        }
        SelectionMark(selected)
    }
}

@Composable
private fun OrderTotalCard(total: Double, nightFee: Double = 0.0, distanceKm: Double = 0.0, isNight: Boolean = true) {
    val cardShape = RoundedCornerShape(14.dp)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(cardShape)
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, cardShape)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // The distance charge is not in the cart's bill: it depends on the address and the hour.
        if (nightFee > 0) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = if (isNight) "Night delivery charge" else "Distance delivery charge",
                        color = DashitColors.TextPrimary,
                        fontSize = 13.5.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "${if (isNight) "After 8 pm, by distance" else "By distance"}: ${"%.1f".format(distanceKm)} km from our store",
                        color = DashitColors.TextSecondary,
                        fontSize = 12.sp
                    )
                }
                Text(
                    text = "₹${nightFee.toInt()}",
                    color = DashitColors.TextPrimary,
                    fontSize = 14.5.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Order Total",
                color = DashitColors.TextPrimary,
                fontSize = 14.5.sp,
                fontWeight = FontWeight.Bold
            )

            Text(
                text = "₹${total.toInt()}",
                color = DashitColors.TextPrimary,
                fontSize = 17.sp,
                fontWeight = FontWeight.ExtraBold
            )
        }
    }
}

private const val LAST_PAYMENT_KEY = "dashit_last_payment_method"

/** The activity behind a Compose context, which the UPI app opens from. */
private fun android.content.Context.findActivity(): android.app.Activity? {
    var current: android.content.Context? = this
    while (current is android.content.ContextWrapper) {
        if (current is android.app.Activity) return current
        current = current.baseContext
    }
    return null
}

