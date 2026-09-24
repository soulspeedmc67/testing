import SwiftUI
import UIKit

/// DASHit design tokens. Same roles and brand colours as the web app
/// (`src/styles/globals.css`); on iOS the dark surfaces are deeper and neutral
/// rather than slate, and the light page is a soft grey so white cards lift off
/// it. Every token resolves per trait collection, so the whole app follows the
/// Appearance setting (Light / Dark / Automatic) without views branching on it.
extension Color {
    // MARK: Brand
    /// Brand orange fill for primary actions.
    static let brandOrange = Color(hex: 0xFF5B00)
    /// Orange for text and icons; lightened on dark so it clears 4.5:1.
    static let brandAccent = Color.adaptive(light: 0xFF5B00, dark: 0xFF6A1A)
    /// Secondary brand colour.
    static let midnight = Color(hex: 0x061838)

    // MARK: Surfaces, loudest last
    static let surfaceSunken = Color.adaptive(light: 0xECEEF2, dark: 0x050507)
    /// The page ground.
    static let surface = Color.adaptive(light: 0xF5F6F8, dark: 0x0B0B0E)
    /// Cards and rows on the page.
    static let surfaceRaised = Color.adaptive(light: 0xFFFFFF, dark: 0x151519)
    /// Bottom sheets, overlays and floating chrome.
    static let surfaceOverlay = Color.adaptive(light: 0xFFFFFF, dark: 0x1B1B21)
    /// Chips, steppers, image wells and quiet fills.
    static let surfaceMuted = Color.adaptive(light: 0xF0F2F5, dark: 0x222228)
    /// Top of the home header's warm backdrop: the web header's peach in light,
    /// a deep ember glow in dark. Fades into `surface`.
    static let headerGlow = Color.adaptive(light: 0xFFE3CC, dark: 0x2A1405)
    /// The live order card is the web tracker's plain black panel in both themes.
    static let trackerCard = Color(hex: 0x16171B)

    // MARK: Text, loudest to quietest
    static let textPrimary = Color.adaptive(light: 0x0F172A, dark: 0xF5F5F7)
    static let textSecondary = Color.adaptive(light: 0x475569, dark: 0xC7C7CC)
    static let textMuted = Color.adaptive(light: 0x64748B, dark: 0x9A9AA1)
    static let textFaint = Color.adaptive(light: 0x94A3B8, dark: 0x6C6C73)

    // MARK: Hairlines
    static let hairlineSoft = Color.adaptive(light: 0xEEF0F3, dark: 0x19191E)
    static let hairline = Color.adaptive(light: 0xE4E7EC, dark: 0x24242A)
    static let hairlineStrong = Color.adaptive(light: 0xD0D5DD, dark: 0x33333B)

    // MARK: Semantic (darker on light so the text stays readable)
    static let positive = Color.adaptive(light: 0x16A34A, dark: 0x22C55E)
    static let caution = Color.adaptive(light: 0xD97706, dark: 0xF59E0B)
    static let danger = Color.adaptive(light: 0xE11D48, dark: 0xF43F5E)

    /// Drop shadow for floating chrome: soft on light, deep on dark.
    static let floatingShadow = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor.black.withAlphaComponent(0.55)
            : UIColor(red: 15 / 255, green: 23 / 255, blue: 42 / 255, alpha: 0.12)
    })

    /// Top edge of a card border: a faint light catch in dark mode so cards
    /// read as lit surfaces; the plain hairline in light mode.
    static let edgeHighlight = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor.white.withAlphaComponent(0.09)
            : UIColor(hex: 0xE4E7EC)
    })

    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }

    static func adaptive(light: UInt32, dark: UInt32) -> Color {
        Color(uiColor: UIColor { traits in
            UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }
}

extension UIColor {
    convenience init(hex: UInt32) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }
}
