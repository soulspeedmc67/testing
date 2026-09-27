package com.dashit.app.ui.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable

/** One choice in an [IosActionSheet]. */
data class SheetAction(val label: String, val isDestructive: Boolean = false, val onClick: () -> Unit)

/**
 * An iOS-style action sheet sliding up from the bottom: the title, message and
 * choices grouped in one card, and the safe choice on its own card below.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun IosActionSheet(
    title: String,
    message: String?,
    actions: List<SheetAction>,
    cancelLabel: String,
    onDismiss: () -> Unit
) {
    val view = LocalView.current
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Color.Transparent,
        dragHandle = null,
        tonalElevation = 0.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 10.dp)
                .padding(bottom = 10.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(DashitColors.SurfaceOverlay)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(3.dp)
                ) {
                    Text(title, color = DashitColors.TextMuted, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
                    if (message != null) {
                        Text(message, color = DashitColors.TextMuted, fontSize = 13.sp, textAlign = TextAlign.Center)
                    }
                }
                actions.forEach { action ->
                    SheetDivider()
                    SheetButton(
                        label = action.label,
                        color = if (action.isDestructive) DashitColors.Danger else DashitColors.BrandAccent,
                        weight = FontWeight.Normal
                    ) {
                        if (action.isDestructive) HapticsManager.warning(view) else HapticsManager.light(view)
                        action.onClick()
                    }
                }
            }
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(DashitColors.SurfaceOverlay)
            ) {
                SheetButton(cancelLabel, DashitColors.BrandAccent, FontWeight.SemiBold) {
                    HapticsManager.light(view)
                    onDismiss()
                }
            }
        }
    }
}

/** "Cancel this order?", with the same three choices as the iOS app. */
@Composable
fun CancelOrderSheet(
    onCancelKeepItems: () -> Unit,
    onCancel: () -> Unit,
    onDismiss: () -> Unit
) {
    IosActionSheet(
        title = "Cancel this order?",
        message = "The store will stop preparing it straight away.",
        actions = listOf(
            SheetAction("Cancel and keep items in cart", isDestructive = true, onClick = onCancelKeepItems),
            SheetAction("Cancel order", isDestructive = true, onClick = onCancel)
        ),
        cancelLabel = "Keep order",
        onDismiss = onDismiss
    )
}

@Composable
private fun SheetButton(label: String, color: Color, weight: FontWeight, onClick: () -> Unit) {
    Text(
        text = label,
        color = color,
        fontSize = 17.sp,
        fontWeight = weight,
        textAlign = TextAlign.Center,
        modifier = Modifier
            .fillMaxWidth()
            .pressable(scale = 0.98f, onClick = onClick)
            .padding(vertical = 17.dp)
    )
}

@Composable
private fun SheetDivider() {
    Spacer(Modifier.fillMaxWidth().height(1.dp).background(DashitColors.Hairline))
}
