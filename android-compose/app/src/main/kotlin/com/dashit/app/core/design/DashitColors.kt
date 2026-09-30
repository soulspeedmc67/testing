package com.dashit.app.core.design

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color

/**
 * The app's colours, light or dark with the phone's setting (the same pairs
 * as the iPhone app's Colors.swift). DashitTheme sets [isDark]; the adaptive
 * tokens read it, so every screen follows without passing a theme around.
 */
object DashitColors {
    var isDark by mutableStateOf(true)

    private fun pick(light: Long, dark: Long) = Color(if (isDark) dark else light)

    // Brand
    val BrandOrange = Color(0xFFFF5B00)
    val BrandAccent = Color(0xFFFF6A1A)
    val Midnight = Color(0xFF061838)
    val BlinkitGreen = Color(0xFF0C831F)
    val BlinkitGreenDark = Color(0xFF075E14)
    val FestiveGold = Color(0xFFE5A11A)
    val FestiveGoldLight = Color(0xFFFFD466)
    val FestiveGoldDark = Color(0xFF6B4300)
    val WalletGreen = Color(0xFF0E4A1C)
    val WalletGreenBorder = Color(0xFF1B7030)

    // Dark surfaces: the iOS app's deep neutrals, which read as more premium
    // on a phone than the web's slate blues.
    val Surface get() = pick(0xFFF5F6F8, 0xFF0B0B0E)
    val SurfaceSunken get() = pick(0xFFECEEF2, 0xFF050507)
    val SurfaceRaised get() = pick(0xFFFFFFFF, 0xFF151519)
    val SurfaceOverlay get() = pick(0xFFFFFFFF, 0xFF1B1B21)
    val SurfaceMuted get() = pick(0xFFF0F2F5, 0xFF222228)
    val TrackerCard = Color(0xFF16171B)

    // Text tokens
    val TextPrimary get() = pick(0xFF0F172A, 0xFFF5F5F7)
    val TextSecondary get() = pick(0xFF475569, 0xFFC7C7CC)
    val TextMuted get() = pick(0xFF64748B, 0xFF9A9AA1)
    val TextFaint get() = pick(0xFF94A3B8, 0xFF6C6C73)

    // Hairlines and borders
    val Hairline get() = pick(0xFFE4E7EC, 0xFF24242A)
    val HairlineSoft get() = pick(0xFFEEF0F3, 0xFF19191E)
    val HairlineStrong get() = pick(0xFFD0D5DD, 0xFF33333B)

    // Semantics
    val Positive get() = pick(0xFF16A34A, 0xFF22C55E)
    val Caution = Color(0xFFF59E0B)
    val Danger get() = pick(0xFFE11D48, 0xFFF43F5E)

    /** The 1px top-lit edge iOS draws on raised cards in dark mode. */
    val EdgeHighlight get() = pick(0x00FFFFFF, 0x17FFFFFF)
}
