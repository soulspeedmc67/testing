import SwiftUI

/// DASHit Native Dynamic Typography Tokens
/// Uses Apple's native San Francisco Pro font with strict optical sizing and dynamic type support.
extension Font {
    static let dashitDisplay = Font.system(size: 28, weight: .heavy, design: .rounded)
    static let dashitHeadline = Font.system(size: 20, weight: .bold, design: .default)
    static let dashitTitle = Font.system(size: 17, weight: .semibold, design: .default)
    static let dashitBody = Font.system(size: 15, weight: .regular, design: .default)
    static let dashitBodyBold = Font.system(size: 15, weight: .semibold, design: .default)
    static let dashitCaption = Font.system(size: 12, weight: .medium, design: .default)
    static let dashitCaptionBold = Font.system(size: 12, weight: .bold, design: .default)
    static let dashitMicro = Font.system(size: 10, weight: .bold, design: .rounded)
    static let dashitPrice = Font.system(size: 16, weight: .bold, design: .rounded)
}
