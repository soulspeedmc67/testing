package com.dashit.app.ui.components

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.Icon
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.RestockRequests
import kotlinx.coroutines.launch

private val Asked = Color(0xFF16A34A)

/**
 * Shown instead of ADD on an item that is out of stock: "Notify me" tells the
 * shop someone wants it (the owner sees it under "Restock requests") and the
 * shopper gets a "Back in stock" notification once it's there. Tapping again
 * takes the request back.
 */
@Composable
fun NotifyMeButton(
    productId: String,
    productName: String,
    modifier: Modifier = Modifier,
    width: Dp = 72.dp,
    height: Dp = 32.dp,
    cornerRadius: Dp = 10.dp,
    fontSize: TextUnit = 11.sp
) {
    val view = LocalView.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val askedIds by RestockRequests.asked.collectAsState()
    val asked = productId in askedIds
    var busy by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(cornerRadius)
    val tint = if (asked) Asked else DashitColors.BrandOrange

    Row(
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .width(width)
            .height(height)
            .clip(shape)
            .background(if (asked) Asked.copy(alpha = 0.10f) else DashitColors.SurfaceRaised)
            .border(1.2.dp, tint.copy(alpha = if (asked) 0.5f else 1f), shape)
            .semantics {
                contentDescription = if (asked) "You'll be told when $productName is back. Tap to cancel."
                else "Notify me when $productName is back"
            }
            .pressable(scale = 0.92f) {
                if (busy) return@pressable
                HapticsManager.light(view)
                busy = true
                scope.launch {
                    val message = runCatching { RestockRequests.toggle(productId) }.fold(
                        onSuccess = { nowAsked -> if (nowAsked) "We'll tell you when it's back" else "Okay, we won't remind you" },
                        onFailure = { it.message ?: "Couldn't save that. Please try again." }
                    )
                    busy = false
                    Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
                }
            }
    ) {
        Icon(
            imageVector = when {
                asked -> Icons.Filled.Check
                busy -> Icons.Filled.NotificationsActive
                else -> Icons.Outlined.Notifications
            },
            contentDescription = null,
            tint = tint,
            modifier = Modifier.size(if (height >= 40.dp) 17.dp else 12.dp)
        )
        Spacer(Modifier.width(3.dp))
        Text(
            text = if (asked) "Asked" else "Notify me",
            color = tint,
            fontWeight = FontWeight.ExtraBold,
            fontSize = fontSize,
            maxLines = 1
        )
    }
}
