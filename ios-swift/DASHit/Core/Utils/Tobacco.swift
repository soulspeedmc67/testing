import Foundation

/// The 18+ declaration's wording and where it's remembered.
///
/// The cigarette section is switched OFF in the iPhone app by default: App Store
/// guideline 1.4.3 doesn't allow selling tobacco in an app, so the catalogue
/// store drops every age-restricted item and none of the section's code is in
/// the app. It is built in only when the build is started with the
/// `TOBACCO_SECTION` compilation condition (the "tobacco_ios" box on the
/// ios-swift-build workflow). Such a build can't pass App Store review. It is
/// never switched on remotely (from the admin app or Firestore): a feature
/// turned on after review is what guideline 2.3.1 forbids.
///
/// Switched on, it works like Android and the website: tobacco never shows
/// while browsing; searching for it shows a "Looking for tobacco products?"
/// card, "View items" asks for the declaration, and only then does the list
/// open, with plain packs instead of brand photos.
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

#if TOBACCO_SECTION
extension Tobacco {
    static let healthWarning = "Tobacco causes cancer. Tobacco products are injurious to health."

    private static let intentStems = [
        "cig", "cugar", "sigar", "smoking", "tobac", "bidi", "beedi", "hookah", "shisha",
        "vape", "nicotin", "gutkha", "zarda", "khaini", "snuff", "rolling paper",
    ]

    /// Whole words only, so "smoky chips" and "classic curd" stay groceries.
    private static let intentWords = [
        "smoke", "smokes", "marlboro", "gold flake", "goldflake", "wills", "navy cut", "benson",
        "esse", "four square", "red and white", "capstan", "davidoff", "dunhill", "ice burst",
    ]

    /// Whether a search is plainly for tobacco.
    static func isQuery(_ query: String) -> Bool {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard q.count >= 3 else { return false }
        if intentStems.contains(where: { q.contains($0) }) { return true }
        let padded = " " + q.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ") + " "
        return intentWords.contains { padded.contains(" \($0) ") }
    }

    /// Name matches first, then, when the search is plainly for tobacco, the rest.
    static func matches(_ query: String, in tobacco: [Product]) -> [Product] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard q.count >= 3 else { return [] }
        let direct = tobacco.filter { $0.name.lowercased().contains(q) }
        guard isQuery(q) else { return direct }
        let directIds = Set(direct.map(\.id))
        return direct + tobacco.filter { !directIds.contains($0.id) }
    }

    /// Whether this search shows the "Looking for tobacco products?" card.
    static func showsCard(_ query: String, in tobacco: [Product]) -> Bool {
        !tobacco.isEmpty && (isQuery(query) || !matches(query, in: tobacco).isEmpty)
    }
}
#endif
