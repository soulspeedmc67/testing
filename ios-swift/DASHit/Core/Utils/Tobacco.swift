import Foundation

/// The 18+ declaration's wording and where it's remembered. The iPhone app
/// never lists tobacco (App Store guideline 1.4.3; the catalogue store drops
/// every age-restricted item), so this only backs the declaration sheet that
/// the product screens keep for any age-restricted item that slips through.
enum Tobacco {
    /// Set once the shopper has made the declaration. "v2" because it covers
    /// more than the old 18+ question.
    static let declarationKey = "dashit_tobacco_declaration_v2"

    static let termsURL = URL(string: "https://dashit.co.in/terms/")!

    /// What the shopper confirms, in the website's words.
    static let declarations: [(symbol: String, isRule: Bool, text: String)] = [
        ("nosign", true, "You are 18 or older (or the higher legal age in your area) and not buying age-restricted items on behalf of anyone underage."),
        ("nosign", true, "Your delivery location is not in or around a school or college premises."),
        ("person.text.rectangle", false, "You will show a government photo ID at the door. Our rider cannot hand over age-restricted items without age proof.")
    ]
}
