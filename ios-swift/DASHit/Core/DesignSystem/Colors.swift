import SwiftUI
import UIKit

/// DASHit design tokens, matching the web app's two palettes in
/// `src/styles/globals.css` (`:root` for light, `.dark` for dark). Every token
/// resolves per trait collection, so the whole app follows the Appearance
/// setting (Light / Dark / Automatic) without views branching on it.
extension Color {
    // MARK: Brand
    /// Brand orange fill for primary actions.
    static let brandOrange = Color(hex: 0xFF5B00)
    /// Orange for text and icons; lightened on dark so it clears 4.5:1.
    static let brandAccent = Color.adaptive(light: 0xFF5B00, dark: 0xFF6A1A)
    /// Secondary brand colour.
    static let midnight = Color(hex: 0x061838)

    // MARK: Surfaces, loudest last
    static let surfaceSunken = Color.adaptive(light: 0xF7F8FA, dark: 0x0E1117)
    /// The page ground.
    static let surface = Color.adaptive(light: 0xFFFFFF, dark: 0x14171F)
    /// Cards and rows on the page.
    static let surfaceRaised = Color.adaptive(light: 0xFFFFFF, dark: 0x1E222D)
    /// Bottom sheets, overlays and the tab bar.
    static let surfaceOverlay = Color.adaptive(light: 0xFFFFFF, dark: 0x252A37)
    /// Chips, steppers, image wells and quiet fills.
    static let surfaceMuted = Color.adaptive(light: 0xF1F5F9, dark: 0x2D3342)
    /// The live order card is the web tracker's plain black panel in both themes.
    static let trackerCard = Color(hex: 0x16171B)

    // MARK: Text, loudest to quietest
    static let textPrimary = Color.adaptive(light: 0x0F172A, dark: 0xF8FAFC)
    static let textSecondary = Color.adaptive(light: 0x475569, dark: 0xCBD5E1)
    static let textMuted = Color.adaptive(light: 0x64748B, dark: 0xA0ABC0)
    static let textFaint = Color.adaptive(light: 0x94A3B8, dark: 0x8290A4)

    // MARK: Hairlines
    static let hairlineSoft = Color.adaptive(light: 0xF1F5F9, dark: 0x212633)
    static let hairline = Color.adaptive(light: 0xE2E8F0, dark: 0x2A303F)
    static let hairlineStrong = Color.adaptive(light: 0xCBD5E1, dark: 0x384054)

    // MARK: Semantic (darker on light so the text stays readable)
    static let positive = Color.adaptive(light: 0x16A34A, dark: 0x22C55E)
    static let caution = Color.adaptive(light: 0xD97706, dark: 0xF59E0B)
    static let danger = Color.adaptive(light: 0xE11D48, dark: 0xF43F5E)

    /// Drop shadow for floating chrome: soft on light, deep on dark.
    static let floatingShadow = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor.black.withAlphaComponent(0.45)
            : UIColor(red: 15 / 255, green: 23 / 255, blue: 42 / 255, alpha: 0.14)
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
