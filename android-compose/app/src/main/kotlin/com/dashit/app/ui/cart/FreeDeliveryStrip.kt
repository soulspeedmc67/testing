package com.dashit.app.ui.cart

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.TwoWheeler
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.DashitMotion
import com.dashit.app.data.model.CartBillBreakdown

private val DotSize = 24.dp

/**
 * A slim line with a rider that moves toward free delivery as the cart grows.
 * It never blocks checkout: under ₹299 the order just carries the ₹25 fee.
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
    val accent by animateColorAsState(
        targetValue = if (unlocked) DashitColors.Positive else DashitColors.BrandOrange,
        label = "free_delivery_accent"
    )
    val cardShape = RoundedCornerShape(14.dp)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(cardShape)
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, cardShape)
            .padding(start = 14.dp, end = 14.dp, top = 12.dp, bottom = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        AnimatedContent(
            targetState = unlocked,
            transitionSpec = {
                (slideInVertically { it / 2 } + fadeIn()) togetherWith (slideOutVertically { -it / 2 } + fadeOut())
            },
            label = "free_delivery_message"
        ) { isUnlocked ->
            if (isUnlocked) {
                UnlockedMessage()
            } else {
                Text(
                    text = buildAnnotatedString {
                        withStyle(SpanStyle(color = DashitColors.TextPrimary, fontWeight = FontWeight.ExtraBold)) {
                            append("₹${bill.amountNeededForFreeDelivery.toInt()}")
                        }
                        append(" away from free delivery")
                    },
                    color = DashitColors.TextSecondary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }

        // The rider rides a track inset by half its size, so it never overhangs the line.
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth()
                .height(DotSize),
            contentAlignment = Alignment.CenterStart
        ) {
            val travel = maxWidth - DotSize
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .clip(CircleShape)
                    .background(DashitColors.SurfaceMuted)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(progress)
                        .fillMaxHeight()
                        .clip(CircleShape)
                        .background(accent)
                )
            }
            Box(
                modifier = Modifier
                    .offset(x = travel * progress)
                    .size(DotSize)
                    .clip(CircleShape)
                    .background(DashitColors.SurfaceRaised)
                    .border(1.dp, DashitColors.Hairline, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.TwoWheeler,
                    contentDescription = null,
                    tint = accent,
                    modifier = Modifier.size(14.dp)
                )
            }
        }
    }
}

@Composable
private fun UnlockedMessage() {
    var popped by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { popped = true }
    val checkScale by animateFloatAsState(
        targetValue = if (popped) 1f else 0f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium),
        label = "free_delivery_check"
    )

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Box(
            modifier = Modifier
                .size(16.dp)
                .scale(checkScale)
                .clip(CircleShape)
                .background(DashitColors.Positive),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(11.dp)
            )
        }
        Text(
            text = "Free delivery unlocked",
            color = DashitColors.Positive,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold
        )
    }
}
