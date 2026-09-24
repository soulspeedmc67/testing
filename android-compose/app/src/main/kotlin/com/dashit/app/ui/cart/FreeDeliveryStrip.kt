package com.dashit.app.ui.cart

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.LocalShipping
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.DashitMotion
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.data.model.CartBillBreakdown
import com.dashit.app.viewmodel.CartViewModel
import kotlinx.coroutines.delay

/**
 * Free-delivery progress at the top of the cart: one line of copy over a
 * hairline bar. It never blocks checkout; under ₹299 the order just carries
 * the ₹25 fee.
 */
@Composable
internal fun FreeDeliveryStrip(bill: CartBillBreakdown) {
    if (bill.subtotal <= 0) return

    val unlocked = bill.subtotal >= CartBillBreakdown.FREE_DELIVERY_THRESHOLD
    val progress by animateFloatAsState(
        targetValue = (bill.subtotal / CartBillBreakdown.FREE_DELIVERY_THRESHOLD).coerceIn(0.0, 1.0).toFloat(),
        animationSpec = DashitMotion.houseSpring(),
        label = "free_delivery_progress"
    )
    val cardShape = RoundedCornerShape(14.dp)

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(cardShape)
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, cardShape)
            .padding(horizontal = 14.dp, vertical = 12.dp)
    ) {
        AnimatedContent(
            targetState = unlocked,
            transitionSpec = {
                (fadeIn() + slideInVertically { it / 3 }) togetherWith (fadeOut() + slideOutVertically { -it / 3 })
            },
            label = "free_delivery_state"
        ) { isUnlocked ->
            if (isUnlocked) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.CheckCircle,
                        contentDescription = null,
                        tint = DashitColors.Positive,
                        modifier = Modifier.size(17.dp)
                    )
                    Text(
                        text = "You've unlocked free delivery",
                        color = DashitColors.Positive,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.LocalShipping,
                            contentDescription = null,
                            tint = DashitColors.BrandOrange,
                            modifier = Modifier.size(17.dp)
                        )
                        Text(
                            text = buildAnnotatedString {
                                append("Add ")
                                withStyle(SpanStyle(color = DashitColors.TextPrimary, fontWeight = FontWeight.Bold)) {
                                    append("₹${bill.amountNeededForFreeDelivery.toInt()}")
                                }
                                append(" more for free delivery")
                            },
                            color = DashitColors.TextSecondary,
                            fontSize = 13.sp
                        )
                    }
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(3.dp)
                            .clip(CircleShape)
                            .background(DashitColors.SurfaceMuted)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(progress)
                                .fillMaxHeight()
                                .clip(CircleShape)
                                .background(DashitColors.BrandOrange)
                        )
                    }
                }
            }
        }
    }
}

/**
 * Drops a "Free delivery unlocked" toast from the top when the cart crosses
 * ₹299. Placed on the storefront and inside each sheet that can add items, with
 * [enabled] true only on whichever is in front, so it always shows on top.
 */
@Composable
fun FreeDeliveryToastHost(
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    insideSheet: Boolean = false
) {
    val celebration by CartViewModel.shared.freeDeliveryCelebration.collectAsState()
    val isEnabled by rememberUpdatedState(enabled)
    var lastSeen by remember { mutableIntStateOf(celebration) }
    var visible by remember { mutableStateOf(false) }
    val view = LocalView.current

    LaunchedEffect(celebration) {
        if (celebration == lastSeen) return@LaunchedEffect
        lastSeen = celebration
        if (!isEnabled) return@LaunchedEffect
        HapticsManager.success(view)
        visible = true
        delay(2600)
        visible = false
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .then(if (insideSheet) Modifier else Modifier.statusBarsPadding())
            .padding(top = 10.dp),
        contentAlignment = Alignment.TopCenter
    ) {
        AnimatedVisibility(
            visible = visible,
            enter = slideInVertically(spring(dampingRatio = 0.8f, stiffness = Spring.StiffnessMediumLow)) { -it } +
                fadeIn() + scaleIn(initialScale = 0.96f),
            exit = slideOutVertically { -it / 2 } + fadeOut()
        ) {
            FreeDeliveryToast()
        }
    }
}

@Composable
private fun FreeDeliveryToast() {
    val ring = remember { Animatable(0f) }
    val check = remember { Animatable(0.4f) }
    LaunchedEffect(Unit) {
        check.animateTo(1f, spring(dampingRatio = 0.45f, stiffness = Spring.StiffnessMedium))
    }
    LaunchedEffect(Unit) {
        delay(150)
        ring.animateTo(1f, tween(durationMillis = 900, easing = FastOutSlowInEasing))
    }

    Row(
        modifier = Modifier
            .shadow(18.dp, CircleShape, clip = false)
            .background(DashitColors.SurfaceRaised, CircleShape)
            .border(1.dp, DashitColors.Hairline, CircleShape)
            .padding(start = 8.dp, end = 20.dp, top = 8.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(modifier = Modifier.size(32.dp), contentAlignment = Alignment.Center) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .graphicsLayer {
                        val scale = 0.7f + ring.value * 1.2f
                        scaleX = scale
                        scaleY = scale
                        alpha = (1f - ring.value) * 0.9f
                    }
                    .border(2.dp, DashitColors.Positive, CircleShape)
            )
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .graphicsLayer {
                        scaleX = check.value
                        scaleY = check.value
                    }
                    .background(DashitColors.Positive, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
        Column {
            Text(
                text = "Free delivery unlocked",
                color = DashitColors.TextPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "You're saving ₹${CartBillBreakdown.STANDARD_DELIVERY_FEE.toInt()} on this order",
                color = DashitColors.TextMuted,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium
            )
        }
    }
}
