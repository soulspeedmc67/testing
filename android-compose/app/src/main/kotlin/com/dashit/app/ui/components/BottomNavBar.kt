package com.dashit.app.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.keyframes
import androidx.compose.animation.core.spring
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.IntOffset
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable

enum class NavigationTab(val title: String) {
    HOME("Home"),
    ORDERS("Order Again"),
    CATEGORIES("Categories")
}

/**
 * Floating tab bar, as on the iPhone app: a compact capsule lifted off the
 * screen edge, thin outline icons, and for the active tab a filled orange icon
 * that springs up while a soft orange highlight glides over to it.
 */
@Composable
fun BottomNavBar(
    selectedTab: NavigationTab,
    modifier: Modifier = Modifier,
    onTabSelected: (NavigationTab) -> Unit
) {
    val view = LocalView.current
    val barShape = RoundedCornerShape(50)
    val tabs = NavigationTab.entries
    val selectedIndex = tabs.indexOf(selectedTab)
    val highlight by animateFloatAsState(
        targetValue = selectedIndex.toFloat(),
        animationSpec = spring(dampingRatio = 0.78f, stiffness = 420f),
        label = "tab_highlight"
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp),
        contentAlignment = Alignment.Center
    ) {
        BoxWithConstraints(
            modifier = Modifier
                .widthIn(max = 312.dp)
                .fillMaxWidth()
                .height(62.dp)
                .shadow(22.dp, barShape, ambientColor = Color.Black.copy(alpha = 0.5f), spotColor = Color.Black.copy(alpha = 0.5f))
                .clip(barShape)
                .background(DashitColors.SurfaceOverlay.copy(alpha = 0.97f))
                .border(1.dp, Brush.verticalGradient(listOf(DashitColors.EdgeHighlight, DashitColors.Hairline)), barShape)
                .padding(6.dp)
        ) {
            val slot = maxWidth / tabs.size
            // The highlight glides between tabs.
            Box(
                Modifier
                    .offset { IntOffset((slot * highlight).roundToPx(), 0) }
                    .width(slot)
                    .fillMaxHeight()
                    .clip(barShape)
                    .background(DashitColors.BrandOrange.copy(alpha = 0.13f))
            )
            Row(Modifier.fillMaxSize()) {
                tabs.forEach { tab ->
                    val isSelected = tab == selectedTab
                    val (filledIcon, outlinedIcon) = getTabIcons(tab)
                    // A little spring up each time the tab is chosen.
                    val bounce = remember { Animatable(0f) }
                    LaunchedEffect(isSelected) {
                        if (isSelected) {
                            bounce.snapTo(0f)
                            bounce.animateTo(1f, keyframes {
                                durationMillis = 420
                                -0.9f at 120
                                0.25f at 260
                                0f at 420
                            })
                        }
                    }
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .pressable(scale = 0.9f) {
                                if (!isSelected) {
                                    HapticsManager.selection(view)
                                    onTabSelected(tab)
                                }
                            },
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = if (isSelected) filledIcon else outlinedIcon,
                            contentDescription = tab.title,
                            tint = if (isSelected) DashitColors.BrandAccent else DashitColors.TextSecondary,
                            modifier = Modifier
                                .size(22.dp)
                                .graphicsLayer { translationY = bounce.value * 4.dp.toPx() }
                        )
                        Spacer(Modifier.height(3.dp))
                        Text(
                            text = tab.title,
                            color = if (isSelected) DashitColors.BrandAccent else DashitColors.TextSecondary,
                            fontSize = 10.5.sp,
                            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                            maxLines = 1
                        )
                    }
                }
            }
        }
    }
}

private fun getTabIcons(tab: NavigationTab): Pair<ImageVector, ImageVector> {
    return when (tab) {
        NavigationTab.HOME -> Icons.Filled.Home to Icons.Outlined.Home
        NavigationTab.CATEGORIES -> Icons.Filled.GridView to Icons.Outlined.GridView
        NavigationTab.ORDERS -> Icons.Filled.ShoppingBag to Icons.Outlined.ShoppingBag
    }
}
