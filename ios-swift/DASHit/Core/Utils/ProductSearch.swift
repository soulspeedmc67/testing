import Foundation
import SwiftUI

/// Search over the catalogue the shopper can see (tobacco and other 18+ items
/// are already left out when the catalogue loads). Every word typed has to
/// match the name, category or badge; names that start with the text rank
/// first, then in-stock and popular items.
enum ProductSearch {
    static func normalized(_ text: String) -> String {
        text.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: .current)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// A product with its search text already folded, so typing doesn't
    /// re-fold thousands of names on every key press.
    struct Entry {
        let product: Product
        let name: String
        let category: String
        let badge: String
        let popularity: Int
    }

    static func entries(for products: [Product]) -> [Entry] {
        products.map { product in
            Entry(
                product: product,
                name: normalized(product.name),
                category: normalized(product.cat),
                badge: normalized(product.badge ?? ""),
                popularity: popularity(product)
            )
        }
    }

    /// Products matching `query`, best match first.
    static func results(for query: String, in products: [Product]) -> [Product] {
        results(for: query, in: entries(for: products))
    }

    static func results(for query: String, in entries: [Entry]) -> [Product] {
        let q = normalized(query)
        guard !q.isEmpty else { return [] }
        let words = q.split(whereSeparator: \.isWhitespace).map(String.init)
        return entries
            .compactMap { entry -> (entry: Entry, rank: Int)? in
                rank(entry, query: q, words: words).map { (entry: entry, rank: $0) }
            }
            .sorted { a, b in
                if a.rank != b.rank { return a.rank < b.rank }
                if a.entry.product.isAvailable != b.entry.product.isAvailable { return a.entry.product.isAvailable }
                if a.entry.popularity != b.entry.popularity { return a.entry.popularity > b.entry.popularity }
                return a.entry.name < b.entry.name
            }
            .map(\.entry.product)
    }

    /// Category names the text points at, closest first.
    static func categories(for query: String, in names: [String], limit: Int = 3) -> [String] {
        let q = normalized(query)
        guard !q.isEmpty else { return [] }
        return names
            .compactMap { name -> (name: String, rank: Int)? in
                let n = normalized(name)
                if n.hasPrefix(q) { return (name, 0) }
                if words(in: n).contains(where: { $0.hasPrefix(q) }) { return (name, 1) }
                return nil
            }
            .sorted { $0.rank < $1.rank }
            .prefix(limit)
            .map(\.name)
    }

    /// `text` with the part matching `query` in bold.
    static func highlighted(_ text: String, matching query: String) -> Text {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty,
              let range = text.range(of: q, options: [.caseInsensitive, .diacriticInsensitive]) else {
            return Text(verbatim: text)
        }
        let before = Text(verbatim: String(text[..<range.lowerBound]))
        let match = Text(verbatim: String(text[range])).fontWeight(.bold).foregroundColor(.textPrimary)
        let after = Text(verbatim: String(text[range.upperBound...]))
        return Text("\(before)\(match)\(after)")
    }

    /// Lower is better; nil when a typed word matches nothing.
    private static func rank(_ entry: Entry, query: String, words queryWords: [String]) -> Int? {
        let name = entry.name
        let cat = entry.category
        let badge = entry.badge
        for word in queryWords where !(name.contains(word) || cat.contains(word) || badge.contains(word)) {
            return nil
        }
        if name.hasPrefix(query) { return 0 }
        if words(in: name).contains(where: { $0.hasPrefix(query) }) { return 1 }
        if name.contains(query) { return 2 }
        if queryWords.allSatisfy({ name.contains($0) }) { return 3 }
        return 4
    }

    private static func words(in text: String) -> [Substring] {
        text.split(whereSeparator: { !$0.isLetter && !$0.isNumber })
    }

    private static func popularity(_ product: Product) -> Int {
        Int(product.ratingCount ?? "") ?? 0
    }
}

/// The shopper's last few searches, newest first. Kept on this device only.
@MainActor
final class RecentSearches: ObservableObject {
    static let shared = RecentSearches()

    private static let key = "dashit_recent_searches"
    private static let limit = 8

    @Published private(set) var terms: [String]

    private init() {
        terms = UserDefaults.standard.stringArray(forKey: Self.key) ?? []
    }

    func record(_ term: String) {
        let clean = term.trimmingCharacters(in: .whitespacesAndNewlines)
        guard clean.count >= 2 else { return }
        var list = terms.filter { $0.caseInsensitiveCompare(clean) != .orderedSame }
        list.insert(clean, at: 0)
        save(Array(list.prefix(Self.limit)))
    }

    func remove(_ term: String) {
        save(terms.filter { $0 != term })
    }

    func clear() {
        save([])
    }

    private func save(_ list: [String]) {
        terms = list
        UserDefaults.standard.set(list, forKey: Self.key)
    }
}
