package com.dashit.app.core.design

import androidx.compose.ui.graphics.Color

object DashitColors {
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
    val Surface = Color(0xFF0B0B0E)
    val SurfaceSunken = Color(0xFF050507)
    val SurfaceRaised = Color(0xFF151519)
    val SurfaceOverlay = Color(0xFF1B1B21)
    val SurfaceMuted = Color(0xFF222228)
    val TrackerCard = Color(0xFF16171B)

    // Text tokens
    val TextPrimary = Color(0xFFF5F5F7)
    val TextSecondary = Color(0xFFC7C7CC)
    val TextMuted = Color(0xFF9A9AA1)
    val TextFaint = Color(0xFF6C6C73)

    // Hairlines and borders
    val Hairline = Color(0xFF24242A)
    val HairlineSoft = Color(0xFF19191E)
    val HairlineStrong = Color(0xFF33333B)

    // Semantics
    val Positive = Color(0xFF22C55E)
    val Caution = Color(0xFFF59E0B)
    val Danger = Color(0xFFF43F5E)

    /** The 1px top-lit edge iOS draws on raised cards in dark mode. */
    val EdgeHighlight = Color(0x17FFFFFF)
}
