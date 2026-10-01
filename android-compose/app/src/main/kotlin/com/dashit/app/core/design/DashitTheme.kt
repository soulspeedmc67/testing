package com.dashit.app.core.design

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/** Material's colours from the current DashitColors (light or dark). */
private fun colorScheme(dark: Boolean) = if (dark) {
    darkColorScheme(
        primary = DashitColors.BrandOrange, onPrimary = Color.White,
        primaryContainer = DashitColors.BrandOrange, onPrimaryContainer = Color.White,
        secondary = DashitColors.BrandAccent, onSecondary = Color.White,
        background = DashitColors.Surface, onBackground = DashitColors.TextPrimary,
        surface = DashitColors.SurfaceRaised, onSurface = DashitColors.TextPrimary,
        surfaceVariant = DashitColors.SurfaceMuted, onSurfaceVariant = DashitColors.TextSecondary,
        outline = DashitColors.Hairline, outlineVariant = DashitColors.HairlineSoft
    )
} else {
    lightColorScheme(
        primary = DashitColors.BrandOrange, onPrimary = Color.White,
        primaryContainer = DashitColors.BrandOrange, onPrimaryContainer = Color.White,
        secondary = DashitColors.BrandAccent, onSecondary = Color.White,
        background = DashitColors.Surface, onBackground = DashitColors.TextPrimary,
        surface = DashitColors.SurfaceRaised, onSurface = DashitColors.TextPrimary,
        surfaceVariant = DashitColors.SurfaceMuted, onSurfaceVariant = DashitColors.TextSecondary,
        outline = DashitColors.Hairline, outlineVariant = DashitColors.HairlineSoft
    )
}

@Composable
fun DashitTheme(
    darkTheme: Boolean = when (ThemePreference.mode) {
        ThemePreference.Mode.SYSTEM -> isSystemInDarkTheme()
        ThemePreference.Mode.LIGHT -> false
        ThemePreference.Mode.DARK -> true
    },
    content: @Composable () -> Unit
) {
    // Set before anything reads a colour, so the first frame is right.
    DashitColors.isDark = darkTheme
    MaterialTheme(
        colorScheme = colorScheme(darkTheme),
        content = content
    )
}
