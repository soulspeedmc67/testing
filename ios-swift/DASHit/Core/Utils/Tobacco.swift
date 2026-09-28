import Foundation

/// The tobacco section, the same way the website does it (`src/lib/tobacco.js`)
/// and the way Blinkit sells cigarettes:
///
/// - Tobacco never shows while browsing: not on the home feed, in categories,
///   rails or ordinary search results. India's COTPA 2003 bars advertising it.
/// - Searching for it shows a "Looking for tobacco products?" card. "View
///   items" asks for the declaration (18+, not near a school or college, photo
///   ID at the door), and only then does the tobacco list open.
/// - Packs are drawn as plain, unbranded boxes instead of brand photos.
///
/// App Store guideline 1.4.3 doesn't allow facilitating tobacco sales; the
/// owner chose to show it in the iPhone app anyway (September 2026).
enum Tobacco {
    /// Set once the shopper has made the declaration. "v2" because it covers
    /// more than the old 18+ question, so that answer is asked again.
    static let declarationKey = "dashit_tobacco_declaration_v2"

    static let healthWarning = "Tobacco causes cancer. Tobacco products are injurious to health."
    static let termsURL = URL(string: "https://dashit.co.in/terms/#tobacco")!

    /// What the shopper confirms, in the website's words. The first two are
    /// the COTPA conditions, the third the ID check at the door.
    static let declarations: [(symbol: String, isRule: Bool, text: String)] = [
        ("nosign", true, "You are 18 or older (or the higher legal age in your area) and not buying tobacco on behalf of anyone underage."),
        ("nosign", true, "Your delivery location is not in or around a school or college premises."),
        ("person.text.rectangle", false, "You will show a government photo ID at the door. Our rider cannot hand over tobacco without age proof.")
    ]

    /// Parts of words that mean "I want tobacco" even when no product name
    /// has them, including plurals and common misspellings.
    private static let intentStems = [
        "cig", "cugar", "sigar", "smoking", "tobac", "bidi", "beedi", "hookah", "shisha",
        "vape", "nicotin", "gutkha", "zarda", "khaini", "snuff", "rolling paper"
    ]

    /// Whole words only, so "smoky chips" and "classic curd" stay groceries.
    private static let intentWords = [
        "smoke", "smokes", "marlboro", "gold flake", "goldflake", "wills", "navy cut", "benson",
        "esse", "four square", "red and white", "capstan", "davidoff", "dunhill", "ice burst"
    ]

    static func isQuery(_ query: String) -> Bool {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard q.count >= 3 else { return false }
        if intentStems.contains(where: { q.contains($0) }) { return true }
        let padded = " " + q.split(whereSeparator: \.isWhitespace).joined(separator: " ") + " "
        return intentWords.contains { padded.contains(" \($0) ") }
    }

    /// Tobacco items for a search: name matches first, then, when
    /// the search is plainly for tobacco ("cigarettes"), the rest of the range.
    static func matches(for query: String, in tobacco: [Product]) -> [Product] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard q.count >= 3 else { return [] }
        func isDirect(_ product: Product) -> Bool {
            product.name.lowercased().contains(q)
        }
        let direct = tobacco.filter(isDirect)
        guard isQuery(q) else { return direct }
        return direct + tobacco.filter { !isDirect($0) }
    }

    /// Whether the tobacco card belongs under this search.
    static func showsCard(for query: String, in tobacco: [Product]) -> Bool {
        !tobacco.isEmpty && (isQuery(query) || !matches(for: query, in: tobacco).isEmpty)
    }
}
