package com.dashit.app.ui.components

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
    CATEGORIES("Categories"),
    ORDERS("Orders"),
    PROFILE("Profile")
}

@Composable
fun BottomNavBar(
    selectedTab: NavigationTab,
    modifier: Modifier = Modifier,
    onTabSelected: (NavigationTab) -> Unit
) {
    val view = LocalView.current
    val barShape = RoundedCornerShape(26.dp)

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .shadow(20.dp, barShape, ambientColor = Color.Black, spotColor = Color.Black)
            .clip(barShape)
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, barShape)
            .padding(horizontal = 6.dp, vertical = 6.dp)
            .height(60.dp),
        horizontalArrangement = Arrangement.SpaceAround,
        verticalAlignment = Alignment.CenterVertically
    ) {
        NavigationTab.entries.forEach { tab ->
            val isSelected = tab == selectedTab
            val (filledIcon, outlinedIcon) = getTabIcons(tab)

            Column(
                modifier = Modifier
                    .weight(1f)
                    .pressable(scale = 0.90f) {
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
                    tint = if (isSelected) DashitColors.BrandOrange else DashitColors.TextMuted,
                    modifier = Modifier.size(22.dp)
                )

                Text(
                    text = tab.title,
                    color = if (isSelected) DashitColors.TextPrimary else DashitColors.TextMuted,
                    fontSize = 11.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                )
            }
        }
    }
}

private fun getTabIcons(tab: NavigationTab): Pair<ImageVector, ImageVector> {
    return when (tab) {
        NavigationTab.HOME -> Icons.Filled.Home to Icons.Outlined.Home
        NavigationTab.CATEGORIES -> Icons.Filled.GridView to Icons.Outlined.GridView
        NavigationTab.ORDERS -> Icons.Filled.ShoppingBag to Icons.Outlined.ShoppingBag
        NavigationTab.PROFILE -> Icons.Filled.Person to Icons.Outlined.Person
    }
}
