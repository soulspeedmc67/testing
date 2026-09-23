import SwiftUI

/// DASHit design tokens, matching the web app's dark theme (`.dark` in
/// `src/styles/globals.css`) so iOS reads as the same product as web and Android.
extension Color {
    // MARK: Brand
    /// Brand orange fill for primary actions.
    static let brandOrange = Color(hex: 0xFF5B00)
    /// Orange for text and icons on the dark ground; lightened so it clears 4.5:1.
    static let brandAccent = Color(hex: 0xFF6A1A)
    /// Secondary brand colour (floating cart pill, marker glyphs).
    static let midnight = Color(hex: 0x061838)

    // MARK: Surfaces, loudest last
    static let surfaceSunken = Color(hex: 0x0E1117)
    /// The page ground.
    static let surface = Color(hex: 0x14171F)
    /// Cards and rows on the page.
    static let surfaceRaised = Color(hex: 0x1E222D)
    /// Bottom sheets, overlays and the tab bar.
    static let surfaceOverlay = Color(hex: 0x252A37)
    /// Chips, steppers, image wells and quiet fills.
    static let surfaceMuted = Color(hex: 0x2D3342)
    /// The live order card, matching the web tracker.
    static let trackerCard = Color(hex: 0x16171B)

    // MARK: Text, loudest to quietest
    static let textPrimary = Color(hex: 0xF8FAFC)
    static let textSecondary = Color(hex: 0xCBD5E1)
    static let textMuted = Color(hex: 0xA0ABC0)
    static let textFaint = Color(hex: 0x8290A4)

    // MARK: Hairlines
    static let hairlineSoft = Color(hex: 0x212633)
    static let hairline = Color(hex: 0x2A303F)
    static let hairlineStrong = Color(hex: 0x384054)

    // MARK: Semantic
    static let positive = Color(hex: 0x22C55E)
    static let caution = Color(hex: 0xF59E0B)
    static let danger = Color(hex: 0xF43F5E)

    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}
