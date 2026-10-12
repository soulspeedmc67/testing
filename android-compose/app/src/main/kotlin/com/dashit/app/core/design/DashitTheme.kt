package com.dashit.app.core.design

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density
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
    // The phone's text size is followed up to 1.3x. Past that, names and
    // prices no longer fit their cards and buttons and get cut off, so the
    // largest settings show the app at 1.3x instead of breaking it.
    val density = LocalDensity.current
    val readable = Density(density.density, density.fontScale.coerceAtMost(MAX_TEXT_SCALE))
    MaterialTheme(colorScheme = colorScheme(darkTheme)) {
        CompositionLocalProvider(LocalDensity provides readable, content = content)
    }
}

private const val MAX_TEXT_SCALE = 1.3f
