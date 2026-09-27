package com.dashit.app.core.design

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = DashitColors.BrandOrange,
    onPrimary = Color.White,
    primaryContainer = DashitColors.BrandOrange,
    onPrimaryContainer = Color.White,
    secondary = DashitColors.BrandAccent,
    onSecondary = Color.White,
    background = DashitColors.Surface,
    onBackground = DashitColors.TextPrimary,
    surface = DashitColors.SurfaceRaised,
    onSurface = DashitColors.TextPrimary,
    surfaceVariant = DashitColors.SurfaceMuted,
    onSurfaceVariant = DashitColors.TextSecondary,
    outline = DashitColors.Hairline,
    outlineVariant = DashitColors.HairlineSoft
)

@Composable
fun DashitTheme(
    darkTheme: Boolean = true, // Default to obsidian dark matching references
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
