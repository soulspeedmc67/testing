package com.dashit.app.ui.checkout

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
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
    val scope = rememberCoroutineScope()
    val bill by cartVm.bill.collectAsState()
    val items by cartVm.items.collectAsState()

    var paymentMethod by remember { mutableStateOf("cod") }
    var isSubmitting by remember { mutableStateOf(false) }
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
        val order = Order(
            id = Order.newCode(),
            userId = customer.id,
            items = items.map { it.copy() },
            subtotal = bill.subtotal,
            deliveryFee = bill.deliveryFee,
            discount = bill.couponDiscount,
            grandTotal = bill.grandTotal,
            deliveryAddress = address,
            paymentMethod = when (paymentMethod) {
                "cod" -> "Cash on Delivery"
                "upi" -> "UPI on Delivery"
                else -> paymentMethod
            },
            // Nothing is charged in the app yet, so no order is ever marked paid here.
            paymentStatus = "pending",
            etaMinutes = eta,
            otp = Order.newDeliveryCode(),
            couponCode = coupon?.takeIf { bill.couponDiscount > 0 || it.waivesDelivery == true }?.code
        )
        isSubmitting = true
        HapticsManager.medium(view)
        scope.launch {
            try {
                orderRepo.placeOrder(order, customer, quote.distanceKm)
                cartVm.clear()
                placedEta = eta
                orderSuccess = true
                HapticsManager.success(view)
                delay(1100)
                onOrderPlaced(order.id)
            } catch (e: Exception) {
                HapticsManager.error(view)
                errorMessage = e.message ?: "We couldn't reach the store to place your order. Check your connection and try again."
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
                                        if (customer == null) {
                                            // Orders need a signed-in shopper: confirm the number first.
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
                                        text = "Placing Order...",
                                        color = Color.White,
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            } else {
                                Text(
                                    text = "Place Order • ₹${bill.grandTotal.toInt()}",
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
        com.dashit.app.ui.auth.PhoneConfirmSheet(
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
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text(
            text = "Payment Method",
            color = DashitColors.TextPrimary,
            fontSize = 14.5.sp,
            fontWeight = FontWeight.Bold
        )

        // COD Option
        PaymentMethodRow(
            title = "Cash on Delivery (Pay at Doorstep)",
            icon = Icons.Default.Payments,
            isSelected = selectedMethod == "cod",
            onSelect = { onSelectMethod("cod") }
        )

        // UPI Option
        PaymentMethodRow(
            title = "UPI / Google Pay / Cards",
            icon = Icons.Default.AccountBalanceWallet,
            isSelected = selectedMethod == "upi",
            onSelect = { onSelectMethod("upi") }
        )
    }
}

@Composable
private fun PaymentMethodRow(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    isSelected: Boolean,
    onSelect: () -> Unit
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
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = if (isSelected) DashitColors.BrandOrange else DashitColors.TextMuted,
            modifier = Modifier.size(20.dp)
        )

        Text(
            text = title,
            color = DashitColors.TextPrimary,
            fontSize = 13.5.sp,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
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
