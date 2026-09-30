package com.dashit.app.ui.checkout

import androidx.compose.ui.platform.LocalContext
import com.dashit.app.data.OnlinePayment
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

    // "cod", or "upi:<package>" for a UPI app on this phone. The last choice is kept.
    val prefs = remember { context.getSharedPreferences("dashit_prefs", android.content.Context.MODE_PRIVATE) }
    var paymentMethod by remember { mutableStateOf(prefs.getString(LAST_PAYMENT_KEY, null) ?: "cod") }
    var upiApps by remember { mutableStateOf<List<OnlinePayment.UpiApp>?>(null) }
    LaunchedEffect(Unit) {
        val apps = OnlinePayment.upiApps(context)
        upiApps = apps
        // The app used last time was uninstalled: back to cash on delivery.
        if (paymentMethod.startsWith("upi:") && apps.none { "upi:${it.packageName}" == paymentMethod }) paymentMethod = "cod"
    }
    val chosenApp = upiApps?.firstOrNull { "upi:${it.packageName}" == paymentMethod }
    var isSubmitting by remember { mutableStateOf(false) }
    var progressText by remember { mutableStateOf("Placing order...") }
    var orderSuccess by remember { mutableStateOf(false) }
    val coupon by cartVm.coupon.collectAsState()
    val signedInUser by AuthRepository.user.collectAsState()
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isSignInOpen by remember { mutableStateOf(false) }
    var placedEta by remember { mutableStateOf(8) }

    /** Same gates as the web and iOS checkouts, then the real order write. */
    fun placeOrder(customer: UserProfile) {
        errorMessage = null
        if (items.isEmpty()) {
            errorMessage = "Your cart is empty."
            return
        }
        val store = StoreStatus.state.value
        if (!store.isOpen) {
            errorMessage = "The store is closed right now. ${store.closeReason}".trim()
            HapticsManager.warning(view)
            return
        }
        val quote = DeliveryEta.quote(address.latitude, address.longitude)
        if (!quote.isDeliverable) {
            errorMessage = "Delivery isn't available at this address yet. It's ${quote.distanceText} from our Anantnag hub, and we deliver within 5 km."
            HapticsManager.warning(view)
            return
        }
        val eta = StoreStatus.etaMinutes(quote) ?: 8
        val code = Order.newCode()
        val app = chosenApp
        val paysOnline = app != null
        val order = Order(
            id = code,
            userId = customer.id,
            items = items.map { it.copy() },
            subtotal = bill.subtotal,
            deliveryFee = bill.deliveryFee,
            discount = bill.couponDiscount,
            grandTotal = bill.grandTotal,
            deliveryAddress = address,
            paymentMethod = if (paysOnline) "Paid online" else "Cash on Delivery",
            paymentStatus = if (paysOnline) "paid" else "pending",
            etaMinutes = eta,
            otp = Order.newDeliveryCode(),
            couponCode = coupon?.takeIf { bill.couponDiscount > 0 || it.waivesDelivery == true }?.code
        )
        isSubmitting = true
        progressText = if (app != null) "Waiting for ${app.name}..." else "Placing order..."
        prefs.edit().putString(LAST_PAYMENT_KEY, paymentMethod).apply()
        HapticsManager.medium(view)
        // Not tied to this sheet: once money is taken, the order is placed
        // even if the sheet or the screen goes away meanwhile.
        OnlinePayment.scope.launch {
            // Paying by UPI: the payment is taken and confirmed first, and only
            // a confirmed payment places the order.
            var receipt: OnlinePayment.Receipt? = null
            if (app != null) {
                val activity = context.findActivity()
                try {
                    if (activity == null) throw OnlinePayment.PaymentException("Online payment isn't available right now. Choose cash on delivery.")
                    receipt = OnlinePayment.pay(activity, code, bill.grandTotal, customer, app) {
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
                    GuaranteeCard()

                    // 3. Payment Method Card
                    PaymentCard(
                        upiApps = upiApps,
                        selectedMethod = paymentMethod,
                        onSelectMethod = {
                            HapticsManager.selection(view)
                            paymentMethod = it
                        }
                    )

                    // 4. Order Total Card
                    OrderTotalCard(total = bill.grandTotal)

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
                                .background(if (isSubmitting) DashitColors.SurfaceMuted else DashitColors.BrandOrange)
                                .pressable(scale = 0.98f) {
                                    if (!isSubmitting) {
                                        val customer = signedInUser
                                        if (customer == null || customer.name.isNullOrBlank()) {
                                            // Orders need a signed-in shopper with a name: confirm the number (and name) first.
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
                                    text = chosenApp?.let { "Pay ₹${bill.grandTotal.toInt()} with ${it.name}" }
                                        ?: "Place Order • ₹${bill.grandTotal.toInt()}",
                                    color = Color.White,
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
        com.dashit.app.ui.auth.PhoneSignInSheet(
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
private fun GuaranteeCard() {
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
                text = "Delivery in 8 minutes",
                color = DashitColors.TextPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "1.2 km · Fulfilled from DASHit Anantnag Dark Store",
                color = DashitColors.TextMuted,
                fontSize = 11.5.sp
            )
        }
    }
}

@Composable
private fun PaymentCard(
    upiApps: List<OnlinePayment.UpiApp>?,
    selectedMethod: String,
    onSelectMethod: (String) -> Unit
) {
    val cardShape = RoundedCornerShape(14.dp)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(cardShape)
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, cardShape)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = "Pay with",
            color = DashitColors.TextPrimary,
            fontSize = 14.5.sp,
            fontWeight = FontWeight.Bold
        )

        // The UPI apps on this phone: picking one opens it straight away at "Pay".
        upiApps?.forEach { app ->
            PaymentMethodRow(
                title = app.name,
                isSelected = selectedMethod == "upi:${app.packageName}",
                onSelect = { onSelectMethod("upi:${app.packageName}") }
            ) { UpiAppIcon(app) }
        }

        PaymentMethodRow(
            title = "Cash on delivery",
            isSelected = selectedMethod == "cod",
            onSelect = { onSelectMethod("cod") }
        ) {
            Icon(
                imageVector = Icons.Default.Payments,
                contentDescription = null,
                tint = if (selectedMethod == "cod") DashitColors.BrandOrange else DashitColors.TextMuted,
                modifier = Modifier.size(22.dp)
            )
        }

        if (upiApps != null && upiApps.isEmpty()) {
            Text(
                text = "To pay online, install a UPI app like Google Pay or PhonePe.",
                color = DashitColors.TextMuted,
                fontSize = 12.sp
            )
        }
    }
}

/** The app's own icon; Razorpay's logo for it if the phone didn't give one. */
@Composable
private fun UpiAppIcon(app: OnlinePayment.UpiApp) {
    val modifier = Modifier.size(28.dp).clip(RoundedCornerShape(7.dp))
    val bitmap = remember(app.packageName) { app.icon?.asImageBitmap() }
    when {
        bitmap != null -> Image(bitmap = bitmap, contentDescription = null, modifier = modifier)
        app.logoUrl != null -> coil.compose.AsyncImage(
            model = app.logoUrl,
            contentDescription = null,
            contentScale = ContentScale.Fit,
            modifier = modifier
        )
        else -> Icon(
            imageVector = Icons.Default.AccountBalanceWallet,
            contentDescription = null,
            tint = DashitColors.TextMuted,
            modifier = Modifier.size(22.dp)
        )
    }
}

@Composable
private fun PaymentMethodRow(
    title: String,
    isSelected: Boolean,
    onSelect: () -> Unit,
    icon: @Composable () -> Unit
) {
    val shape = RoundedCornerShape(10.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(if (isSelected) DashitColors.BrandOrange.copy(alpha = 0.12f) else DashitColors.SurfaceMuted)
            .border(
                1.dp,
                if (isSelected) DashitColors.BrandOrange.copy(alpha = 0.4f) else Color.Transparent,
                shape
            )
            .clickable { onSelect() }
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(modifier = Modifier.size(28.dp), contentAlignment = Alignment.Center) { icon() }

        Text(
            text = title,
            color = DashitColors.TextPrimary,
            fontSize = 14.sp,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium,
            modifier = Modifier.weight(1f)
        )

        Icon(
            imageVector = if (isSelected) Icons.Default.RadioButtonChecked else Icons.Default.RadioButtonUnchecked,
            contentDescription = null,
            tint = if (isSelected) DashitColors.BrandOrange else DashitColors.TextMuted,
            modifier = Modifier.size(18.dp)
        )
    }
}

@Composable
private fun OrderTotalCard(total: Double) {
    val cardShape = RoundedCornerShape(14.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(cardShape)
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, cardShape)
            .padding(14.dp),
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

