import SwiftUI

/// DASHit Native Design System Colors
/// Matches the high-contrast Obsidian dark theme and vibrant quick-commerce accents.
extension Color {
    // Primary DASHit Brand Colors
    static let dashitEmerald = Color(red: 16/255, green: 185/255, blue: 129/255) // #10B981
    static let dashitEmeraldDark = Color(red: 5/255, green: 150/255, blue: 105/255)
    static let dashitAmber = Color(red: 245/255, green: 158/255, blue: 11/255) // #F59E0B
    static let dashitRose = Color(red: 244/255, green: 63/255, blue: 94/255) // #F43F5E
    
    // Obsidian Dark Surface & Backgrounds
    static let obsidianBlack = Color(red: 9/255, green: 9/255, blue: 11/255) // #09090B
    static let obsidianCard = Color(red: 18/255, green: 18/255, blue: 22/255) // #121216
    static let obsidianElevated = Color(red: 26/255, green: 26/255, blue: 32/255) // #1A1A20
    static let obsidianBorder = Color(red: 39/255, green: 39/255, blue: 46/255) // #27272E
    
    // Light Mode Alternates
    static let dashitBackgroundLight = Color(red: 248/255, green: 249/255, blue: 250/255)
    static let dashitCardLight = Color.white
    static let dashitBorderLight = Color(red: 229/255, green: 231/255, blue: 235/255)
    
    // Semantic Contextual Colors
    static let dashitBackground = Color("DashitBackground", bundle: nil)
    static let dashitCard = Color("DashitCard", bundle: nil)
}
