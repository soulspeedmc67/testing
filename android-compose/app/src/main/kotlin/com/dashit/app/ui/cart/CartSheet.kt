package com.dashit.app.ui.cart

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
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
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SheetState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.DashitMotion
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.model.CartBillBreakdown
import com.dashit.app.data.model.CartItem
import com.dashit.app.data.model.Coupon
import com.dashit.app.ui.components.QuantityStepper
import com.dashit.app.viewmodel.CartViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartSheet(
    cartVm: CartViewModel = CartViewModel.shared,
    sheetState: SheetState,
    onDismiss: () -> Unit,
    onProceedToCheckout: () -> Unit
) {
    val view = LocalView.current
    val items by cartVm.items.collectAsState()
    val bill by cartVm.bill.collectAsState()
    val coupon by cartVm.coupon.collectAsState()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = DashitColors.Surface,
        dragHandle = null,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
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
                    Text(
                        text = "Your Cart",
                        color = DashitColors.TextPrimary,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.ExtraBold
                    )

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
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = DashitColors.TextMuted,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .background(DashitColors.Hairline)
                )

                if (items.isEmpty()) {
                    // Empty State
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.ShoppingBag,
                                contentDescription = "Empty cart",
                                tint = DashitColors.TextFaint,
                                modifier = Modifier.size(56.dp)
                            )

                            Text(
                                text = "Your cart is empty",
                                color = DashitColors.TextPrimary,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold
                            )

                            Text(
                                text = "Explore fresh groceries delivered in 8 mins.",
                                color = DashitColors.TextMuted,
                                fontSize = 14.sp
                            )

                            Spacer(modifier = Modifier.height(6.dp))

                            Box(
                                modifier = Modifier
                                    .height(46.dp)
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(DashitColors.BrandOrange)
                                    .pressable(scale = 0.95f) {
                                        HapticsManager.medium(view)
                                        onDismiss()
                                    }
                                    .padding(horizontal = 28.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "Start shopping",
                                    color = Color.White,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                } else {
                    // Cart Content
                    Box(modifier = Modifier.weight(1f)) {
                        val scrollState = rememberScrollState()
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .verticalScroll(scrollState)
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            FreeDeliveryStrip(bill = bill)

                            // 2. Cart Items Card
                            CartItemsCard(
                                items = items,
                                onIncrement = { cartVm.increment(it) },
                                onDecrement = { cartVm.decrement(it) }
                            )

                            // 3. Coupon Row
                            CouponCard(
                                appliedCoupon = coupon,
                                savedAmount = bill.couponDiscount,
                                onApply = {
                                    HapticsManager.selection(view)
                                    cartVm.applyCoupon(
                                        Coupon(
                                            id = "dashfirst",
                                            code = "DASHFIRST",
                                            title = "First Order Deal",
                                            description = "Flat ₹50 OFF on orders above ₹199",
                                            discount = 50.0,
                                            minOrder = 199.0
                                        )
                                    )
                                },
                                onRemove = {
                                    HapticsManager.light(view)
                                    cartVm.applyCoupon(null)
                                }
                            )

                            // 4. Bill Details Card
                            BillDetailsCard(bill = bill)

                            Spacer(modifier = Modifier.height(10.dp))
                        }
                    }

                    // Sticky Bottom Proceed Bar
                    ProceedBottomBar(
                        bill = bill,
                        onProceed = {
                            if (bill.subtotal > 0) {
                                HapticsManager.medium(view)
                                onProceedToCheckout()
                            } else {
                                HapticsManager.error(view)
                            }
                        }
                    )
                }
            }
            FreeDeliveryToastHost(insideSheet = true)
        }
    }
}

@Composable
private fun CartItemsCard(
    items: List<CartItem>,
    onIncrement: (String) -> Unit,
    onDecrement: (String) -> Unit
) {
    val cardShape = RoundedCornerShape(14.dp)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(cardShape)
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, cardShape)
    ) {
        items.forEachIndexed { index, item ->
            if (index > 0) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .padding(start = 76.dp)
                        .background(DashitColors.Hairline)
                )
            }

            CartLineRow(
                item = item,
                onIncrement = { onIncrement(item.id) },
                onDecrement = { onDecrement(item.id) }
            )
        }
    }
}

@Composable
private fun CartLineRow(
    item: CartItem,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit
) {
    val context = LocalContext.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Thumbnail Image
        AsyncImage(
            model = ImageRequest.Builder(context)
                .data(item.img)
                .crossfade(true)
                .build(),
            contentDescription = item.name,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .size(52.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(DashitColors.SurfaceMuted)
        )

        // Title, Unit, Price
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(3.dp)
        ) {
            Text(
                text = item.name,
                color = DashitColors.TextPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            Text(
                text = item.unit,
                color = DashitColors.TextMuted,
                fontSize = 12.sp
            )

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                val totalPrice = item.price * item.qty
                Text(
                    text = "₹${totalPrice.toInt()}",
                    color = DashitColors.TextPrimary,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )

                if (item.originalPrice != null && item.originalPrice > item.price) {
                    val totalOriginal = item.originalPrice * item.qty
                    Text(
                        text = "₹${totalOriginal.toInt()}",
                        color = DashitColors.TextFaint,
                        fontSize = 12.sp,
                        textDecoration = TextDecoration.LineThrough
                    )
                }
            }
        }

        // Stepper
        QuantityStepper(
            quantity = item.qty,
            onAdd = onIncrement,
            onIncrement = onIncrement,
            onDecrement = onDecrement
        )
    }
}

@Composable
private fun CouponCard(
    appliedCoupon: Coupon?,
    savedAmount: Double,
    onApply: () -> Unit,
    onRemove: () -> Unit
) {
    val cardShape = RoundedCornerShape(14.dp)
    val view = LocalView.current

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(cardShape)
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, cardShape)
            .clickable {
                if (appliedCoupon == null) {
                    onApply()
                }
            }
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Icon(
            imageVector = Icons.Default.ConfirmationNumber,
            contentDescription = "Coupon",
            tint = DashitColors.BrandOrange,
            modifier = Modifier.size(18.dp)
        )

        if (appliedCoupon != null) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "‘${appliedCoupon.code}’ applied",
                    color = DashitColors.TextPrimary,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "You save ₹${savedAmount.toInt()}",
                    color = DashitColors.Positive,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            Text(
                text = "Remove",
                color = DashitColors.Danger,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .pressable(scale = 0.94f) {
                        onRemove()
                    }
                    .padding(4.dp)
            )
        } else {
            Text(
                text = "Apply coupon (DASHFIRST: ₹50 OFF)",
                color = DashitColors.TextPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.weight(1f)
            )

            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = DashitColors.TextMuted,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

@Composable
private fun BillDetailsCard(bill: CartBillBreakdown) {
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
            text = "Bill details",
            color = DashitColors.TextPrimary,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold
        )

        BillRow(
            label = "Item total",
            value = "₹${bill.subtotal.toInt()}"
        )

        BillRow(
            label = "Delivery partner fee",
            value = if (bill.deliveryFee == 0.0) "FREE" else "₹${bill.deliveryFee.toInt()}",
            valueColor = if (bill.deliveryFee == 0.0) DashitColors.Positive else DashitColors.TextPrimary
        )

        if (bill.couponDiscount > 0) {
            BillRow(
                label = "Coupon discount",
                value = "-₹${bill.couponDiscount.toInt()}",
                valueColor = DashitColors.Positive
            )
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(DashitColors.Hairline)
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "To pay",
                color = DashitColors.TextPrimary,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold
            )

            Text(
                text = "₹${bill.grandTotal.toInt()}",
                color = DashitColors.TextPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.ExtraBold
            )
        }
    }
}

@Composable
private fun BillRow(
    label: String,
    value: String,
    valueColor: Color = DashitColors.TextPrimary
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            color = DashitColors.TextMuted,
            fontSize = 13.sp
        )

        Text(
            text = value,
            color = valueColor,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun ProceedBottomBar(
    bill: CartBillBreakdown,
    onProceed: () -> Unit
) {
    val canProceed = bill.subtotal > 0

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

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .navigationBarsPadding()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(58.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(if (canProceed) DashitColors.BrandOrange else DashitColors.SurfaceMuted)
                    .pressable(scale = if (canProceed) 0.98f else 1f) {
                        onProceed()
                    }
                    .padding(horizontal = 18.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(verticalArrangement = Arrangement.Center) {
                    Text(
                        text = "₹${bill.grandTotal.toInt()}",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "TOTAL",
                        color = Color.White.copy(alpha = 0.75f),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.6.sp
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "Proceed to checkout",
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(15.dp)
                    )
                }
            }
        }
    }
}
