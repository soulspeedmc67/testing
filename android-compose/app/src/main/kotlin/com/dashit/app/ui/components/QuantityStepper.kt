package com.dashit.app.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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

enum class StepperSize {
    COMPACT,
    REGULAR
}

@Composable
fun QuantityStepper(
    quantity: Int,
    modifier: Modifier = Modifier,
    size: StepperSize = StepperSize.COMPACT,
    isEnabled: Boolean = true,
    onAdd: () -> Unit,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit
) {
    val view = LocalView.current
    val width = if (size == StepperSize.COMPACT) 72.dp else 124.dp
    val height = if (size == StepperSize.COMPACT) 32.dp else 48.dp
    val cornerRadius = if (size == StepperSize.COMPACT) 10.dp else 14.dp
    val shape = RoundedCornerShape(cornerRadius)

    AnimatedContent(
        targetState = quantity > 0,
        transitionSpec = {
            (scaleIn(initialScale = 0.85f, animationSpec = tween(150)) + fadeIn()) togetherWith
                    (scaleOut(targetScale = 0.85f, animationSpec = tween(150)) + fadeOut())
        },
        label = "stepper_transition"
    ) { hasQuantity ->
        if (!hasQuantity) {
            // Unselected: Dark surface pill with vibrant orange border and "ADD"
            Box(
                modifier = modifier
                    .width(width)
                    .height(height)
                    .clip(shape)
                    .background(DashitColors.SurfaceRaised)
                    .border(
                        width = 1.2.dp,
                        color = if (isEnabled) DashitColors.BrandOrange else DashitColors.Hairline,
                        shape = shape
                    )
                    .pressable(scale = 0.92f) {
                        if (isEnabled) {
                            HapticsManager.light(view)
                            onAdd()
                        }
                    },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = if (isEnabled) "ADD" else "Sold out",
                    color = if (isEnabled) DashitColors.BrandOrange else DashitColors.TextFaint,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = if (size == StepperSize.COMPACT) 12.5.sp else 16.sp
                )
            }
        } else {
            // Selected: Solid brand orange pill with − / QTY / +
            Row(
                modifier = modifier
                    .width(width)
                    .height(height)
                    .clip(shape)
                    .background(DashitColors.BrandOrange),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(height)
                        .pressable(scale = 0.78f) {
                            HapticsManager.light(view)
                            onDecrement()
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Remove,
                        contentDescription = "Remove one",
                        tint = Color.White,
                        modifier = Modifier
                            .width(if (size == StepperSize.COMPACT) 14.dp else 18.dp)
                            .height(if (size == StepperSize.COMPACT) 14.dp else 18.dp)
                    )
                }

                Text(
                    text = quantity.toString(),
                    color = Color.White,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = if (size == StepperSize.COMPACT) 13.sp else 17.sp,
                    modifier = Modifier.align(Alignment.CenterVertically)
                )

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(height)
                        .pressable(scale = 0.78f) {
                            HapticsManager.light(view)
                            onIncrement()
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Add one",
                        tint = Color.White,
                        modifier = Modifier
                            .width(if (size == StepperSize.COMPACT) 14.dp else 18.dp)
                            .height(if (size == StepperSize.COMPACT) 14.dp else 18.dp)
                    )
                }
            }
        }
    }
}
