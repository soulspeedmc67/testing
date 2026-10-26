package com.dashit.app.ui.wallet

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

/**
 * The wallet button in the home header, left of the profile button, showing
 * what is left. Tapping it opens [WalletSheet].
 */
@Composable
fun WalletChip(balance: Int, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val view = LocalView.current
    val isDark = DashitColors.isDark
    Row(
        modifier = modifier
            .height(38.dp)
            .clip(CircleShape)
            .background(if (isDark) Color(0xFF2C2214) else Color.White.copy(alpha = 0.7f))
            .border(1.dp, if (isDark) Color(0xFF5A4420) else Color(0xFFF2C9A4), CircleShape)
            .pressable(scale = 0.94f) {
                HapticsManager.light(view)
                onClick()
            }
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Icon(
            imageVector = Icons.Default.AccountBalanceWallet,
            contentDescription = "Wallet",
            tint = DashitColors.BrandOrange,
            modifier = Modifier.size(18.dp)
        )
        Text(
            text = "₹$balance",
            color = if (isDark) Color.White else DashitColors.TextPrimary,
            fontSize = 14.sp,
            fontWeight = FontWeight.ExtraBold
        )
    }
}

/**
 * The wallet as a bottom sheet. With [celebrate] it is the welcome: the icon
 * springs in, the amount counts up and a short sprinkle of confetti falls.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WalletSheet(balance: Int, maxPerOrder: Int, credit: Int, celebrate: Boolean, onDismiss: () -> Unit) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val iconScale = remember { Animatable(0.6f) }
    var shown by remember { mutableIntStateOf(0) }

    LaunchedEffect(balance) {
        iconScale.animateTo(1f, spring(dampingRatio = 0.55f, stiffness = Spring.StiffnessMediumLow))
    }
    LaunchedEffect(balance) {
        if (balance <= 0) {
            shown = 0
            return@LaunchedEffect
        }
        val counter = Animatable(0f)
        kotlinx.coroutines.delay(250)
        counter.animateTo(balance.toFloat(), tween(1100, easing = FastOutSlowInEasing)) { shown = value.toInt() }
        shown = balance
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = DashitColors.SurfaceOverlay,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
    ) {
        Box(Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(horizontal = 24.dp)
                    .padding(top = 8.dp, bottom = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .scale(iconScale.value)
                        .clip(RoundedCornerShape(18.dp))
                        .background(DashitColors.BrandOrange),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.AccountBalanceWallet, contentDescription = null, tint = Color.White, modifier = Modifier.size(32.dp))
                }
                Spacer(Modifier.height(16.dp))
                Text(
                    text = if (celebrate) "You got ₹$credit!" else "Your wallet",
                    color = DashitColors.TextPrimary,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = if (celebrate) "A welcome gift from DASHit, just for you." else "Money you can spend on your orders.",
                    color = DashitColors.TextSecondary,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center
                )
                Spacer(Modifier.height(20.dp))
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(DashitColors.SurfaceMuted)
                        .border(1.dp, DashitColors.Hairline, RoundedCornerShape(16.dp))
                        .padding(vertical = 16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("BALANCE", color = DashitColors.TextMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Text("₹$shown", color = DashitColors.TextPrimary, fontSize = 40.sp, fontWeight = FontWeight.Black)
                }
                Spacer(Modifier.height(16.dp))
                Text(
                    text = if (balance > 0) "It comes off your delivery and handling charges by itself when you order, up to ₹$maxPerOrder each time."
                    else if (credit > 0) "You've used your wallet credit. Thanks for ordering with us!"
                    else "No credit in your wallet right now. Credit from DASHit will show up here.",
                    color = DashitColors.TextSecondary,
                    fontSize = 13.5.sp,
                    textAlign = TextAlign.Center
                )
                Spacer(Modifier.height(20.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(DashitColors.BrandOrange)
                        .pressable(scale = 0.98f) { onDismiss() },
                    contentAlignment = Alignment.Center
                ) {
                    Text(if (celebrate) "Start shopping" else "Got it", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                }
            }
            if (celebrate) Confetti(Modifier.matchParentSize())
        }
    }
}

private class Speck(val angle: Float, val speed: Float, val size: Float, val color: Color, val spin: Float)

/** A short, quiet sprinkle that rises from the icon and falls away. */
@Composable
private fun Confetti(modifier: Modifier = Modifier) {
    val progress = remember { Animatable(0f) }
    val specks = remember {
        val palette = listOf(Color(0xFFFF5B00), Color(0xFFFFB27A), Color(0xFFFFFFFF), Color(0xFF061838))
        List(36) {
            Speck(
                angle = (-Math.PI.toFloat() * (0.15f + 0.7f * Random.nextFloat())),
                speed = 160f + 220f * Random.nextFloat(),
                size = 3f + 4f * Random.nextFloat(),
                color = palette[it % palette.size],
                spin = Random.nextFloat()
            )
        }
    }
    LaunchedEffect(Unit) { progress.animateTo(1f, tween(1700, easing = FastOutSlowInEasing)) }
    Canvas(modifier = modifier) {
        val t = progress.value
        if (t >= 1f) return@Canvas
        val origin = Offset(size.width / 2f, 64.dp.toPx() + 40.dp.toPx())
        val gravity = 520f
        specks.forEach { s ->
            val seconds = t * 1.7f
            val x = origin.x + cos(s.angle) * s.speed * seconds * density
            val y = origin.y + (sin(s.angle) * s.speed * seconds + 0.5f * gravity * seconds * seconds) * density
            drawCircle(color = s.color.copy(alpha = (1f - t).coerceIn(0f, 1f)), radius = s.size * density, center = Offset(x, y))
        }
    }
}
