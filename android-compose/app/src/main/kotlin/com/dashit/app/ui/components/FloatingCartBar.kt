package com.dashit.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.FlyToCartManager
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.model.CartBillBreakdown
import com.dashit.app.data.model.CartItem
import kotlinx.coroutines.delay

@Composable
fun FloatingCartBar(
    items: List<CartItem>,
    bill: CartBillBreakdown,
    modifier: Modifier = Modifier,
    onTap: () -> Unit
) {
    val view = LocalView.current
    val isVisible = items.isNotEmpty()
    val bounceTrigger by FlyToCartManager.bounceTrigger.collectAsState()

    var isBouncing by remember { mutableStateOf(false) }

    LaunchedEffect(bounceTrigger) {
        if (bounceTrigger > 0L) {
            isBouncing = true
            HapticsManager.light(view)
            delay(180)
            isBouncing = false
        }
    }

    val animatedScale by animateFloatAsState(
        targetValue = if (isBouncing) 1.05f else 1.0f,
        animationSpec = spring(dampingRatio = 0.45f, stiffness = 600f),
        label = "cart_bounce"
    )

    AnimatedVisibility(
        visible = isVisible,
        enter = slideInVertically(initialOffsetY = { it }, animationSpec = tween(280)) + fadeIn(),
        exit = slideOutVertically(targetOffsetY = { it }, animationSpec = tween(240)) + fadeOut(),
        modifier = modifier
    ) {
        val lastItems = items.takeLast(3).reversed()
        val totalCount = items.sumOf { it.qty }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 28.dp)
                .scale(animatedScale)
                .onGloballyPositioned { coordinates ->
                    val pos = coordinates.positionInRoot()
                    val size = coordinates.size
                    // Center of cart bar
                    FlyToCartManager.registerTarget(
                        androidx.compose.ui.geometry.Offset(
                            pos.x + size.width / 2f,
                            pos.y + size.height / 2f
                        )
                    )
                }
                .shadow(
                    elevation = 14.dp,
                    shape = CircleShape,
                    ambientColor = Color.Black.copy(alpha = 0.5f),
                    spotColor = DashitColors.BlinkitGreenDark
                )
                .clip(CircleShape)
                .background(DashitColors.BlinkitGreen)
                .pressable(scale = 0.97f) {
                    HapticsManager.medium(view)
                    onTap()
                }
                .padding(horizontal = 8.dp, vertical = 5.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // White capsule housing the overlapping product thumbnails (compact)
                Box(
                    modifier = Modifier
                        .height(36.dp)
                        .clip(RoundedCornerShape(18.dp))
                        .background(Color.White)
                        .padding(horizontal = 3.dp, vertical = 3.dp),
                    contentAlignment = Alignment.CenterStart
                ) {
                    Box(
                        modifier = Modifier.width((28 + (lastItems.size - 1) * 14).dp),
                        contentAlignment = Alignment.CenterStart
                    ) {
                        lastItems.forEachIndexed { index, item ->
                            Box(
                                modifier = Modifier
                                    .offset(x = (index * 14).dp)
                                    .size(28.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFF1F5F9))
                                    .border(1.2.dp, Color.White, CircleShape)
                            ) {
                                AsyncImage(
                                    model = ImageRequest.Builder(LocalContext.current)
                                        .data(item.img)
                                        .crossfade(200)
                                        .build(),
                                    contentDescription = null,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .matchParentSize()
                                        .clip(CircleShape)
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.width(10.dp))

                // Cart texts (View cart • N Items)
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "View cart",
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )

                    val subtext = "$totalCount ${if (totalCount == 1) "Item" else "Items"} · ₹${bill.grandTotal.toInt()}"

                    Text(
                        text = subtext,
                        color = Color.White.copy(alpha = 0.95f),
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                // Dark Green Circular Chevron Disc (compact)
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(DashitColors.BlinkitGreenDark),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                        contentDescription = "Open Cart",
                        tint = Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}
