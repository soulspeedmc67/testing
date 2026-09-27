package com.dashit.app.ui.orders

import com.dashit.app.ui.components.OrderListSkeleton
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.Icon
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.ui.components.ShimmerImage
import coil.request.ImageRequest
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.model.Order
import com.dashit.app.data.model.OrderStatus
import com.dashit.app.data.repository.OrderRepository
import com.dashit.app.viewmodel.CartViewModel
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun OrdersScreen(
    orderRepo: OrderRepository = OrderRepository.shared,
    cartVm: CartViewModel = CartViewModel.shared,
    onOpenCart: () -> Unit,
    onTrackOrder: (Order) -> Unit = {}
) {
    val view = LocalView.current
    val orders by orderRepo.orders.collectAsState()
    val ordersLoaded by orderRepo.ordersLoaded.collectAsState()

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
                text = "Order again",
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

        if (!ordersLoaded) {
            OrderListSkeleton(modifier = Modifier.padding(16.dp))
        } else if (orders.isEmpty()) {
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
                        contentDescription = null,
                        tint = DashitColors.TextFaint,
                        modifier = Modifier.size(56.dp)
                    )

                    Text(
                        text = "No orders yet",
                        color = DashitColors.TextPrimary,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )

                    Text(
                        text = "When you order, you can track it live and reorder it from here.",
                        color = DashitColors.TextMuted,
                        fontSize = 14.sp
                    )
                }
            }
        } else {
            // List of Orders
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 140.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                items(orders, key = { it.id }) { order ->
                    OrderCard(
                        order = order,
                        onReorder = {
                            HapticsManager.medium(view)
                            cartVm.reorder(order.items)
                            onOpenCart()
                        },
                        onTrackOrder = {
                            HapticsManager.medium(view)
                            onTrackOrder(order)
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun OrderCard(
    order: Order,
    onReorder: () -> Unit,
    onTrackOrder: () -> Unit
) {
    val cardShape = RoundedCornerShape(16.dp)
    val context = LocalContext.current
    val view = LocalView.current

    val dateFormatted = remember(order.createdAt) {
        val sdf = SimpleDateFormat("d MMM, h:mm a", Locale.getDefault())
        sdf.format(Date(order.createdAt))
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(cardShape)
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, cardShape)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Status Row & Date
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                val statusColor = when (order.status) {
                    OrderStatus.DELIVERED -> DashitColors.Positive
                    OrderStatus.OUT_FOR_DELIVERY -> DashitColors.Caution
                    OrderStatus.PACKING -> DashitColors.BrandOrange
                    OrderStatus.PLACED -> DashitColors.BrandOrange
                    OrderStatus.CANCELLED -> DashitColors.Danger
                }

                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(statusColor)
                )

                Text(
                    text = order.status.title,
                    color = statusColor,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Text(
                text = dateFormatted,
                color = DashitColors.TextMuted,
                fontSize = 12.sp
            )
        }

        // Horizontal Row of Product Thumbnails
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(order.items, key = { it.id }) { item ->
                ShimmerImage(
                    model = ImageRequest.Builder(context)
                        .data(item.img)
                        .crossfade(true)
                        .build(),
                    contentDescription = item.name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(46.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(DashitColors.SurfaceMuted)
                )
            }
        }

        // Items Count & Total Bill
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "${order.items.sumOf { it.qty }} items",
                color = DashitColors.TextSecondary,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium
            )

            Text(
                text = "₹${order.grandTotal.toInt()}",
                color = DashitColors.TextPrimary,
                fontSize = 16.sp,
                fontWeight = FontWeight.ExtraBold
            )
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(DashitColors.Hairline)
        )

        // Actions Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "#${order.id}",
                color = DashitColors.TextMuted,
                fontSize = 11.5.sp,
                fontWeight = FontWeight.SemiBold
            )

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (order.status != OrderStatus.DELIVERED && order.status != OrderStatus.CANCELLED) {
                    // Active order live tracking button
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(DashitColors.BlinkitGreen)
                            .pressable(scale = 0.94f) { onTrackOrder() }
                            .padding(horizontal = 14.dp, vertical = 7.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(5.dp)
                        ) {
                            Text(text = "🛵", fontSize = 13.sp)
                            Text(
                                text = "Track Live Delivery",
                                color = Color.White,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                } else {
                    // View Route Button
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFF202636))
                            .border(1.dp, DashitColors.Hairline, RoundedCornerShape(10.dp))
                            .pressable(scale = 0.94f) { onTrackOrder() }
                            .padding(horizontal = 10.dp, vertical = 7.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "View Route",
                            color = DashitColors.TextSecondary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    // Reorder Button
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(DashitColors.BrandOrange.copy(alpha = 0.15f))
                            .border(1.dp, DashitColors.BrandOrange.copy(alpha = 0.35f), RoundedCornerShape(10.dp))
                            .pressable(scale = 0.94f) { onReorder() }
                            .padding(horizontal = 14.dp, vertical = 7.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(5.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = "Reorder",
                                tint = DashitColors.BrandOrange,
                                modifier = Modifier.size(15.dp)
                            )
                            Text(
                                text = "Reorder",
                                color = DashitColors.BrandOrange,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}
