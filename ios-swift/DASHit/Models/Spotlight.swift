import Foundation

/// The spotlight: the shop's one special, gold tab in the home screen's
/// category strip, with the owner's groups and items. Stored on
/// `config/spotlight`; the website (`src/lib/spotlight.js`) and Android
/// (`Spotlight.kt`) read the same fields:
///
///     enabled, tabLabel, title, subtitle,
///     items: [{ id, name, img, price, mrp, unit }]     items on their own, no group needed
///     sections: [{ id, name, img, items: [same] }]     optional groups, each a photo tile
///
/// Every item is a real product (`id` is its products/{id}); the copy kept on
/// the item shows until the product file has it.
struct Spotlight: Equatable {
    /// What `selectedCategory` holds while the spotlight tab is picked. Never a real category name.
    static let tabId = "__spotlight"

    struct Item: Equatable, Identifiable {
        let id: String
        let name: String
        let img: String
        let price: Double
        let mrp: Double
        let unit: String
    }

    struct Section: Equatable, Identifiable {
        let id: String
        var name: String
        var img: String
        var items: [Item]
    }

    /// A group as shoppers see it: its items as live shop products.
    struct ShownSection: Identifiable {
        let id: String
        let name: String
        let img: String
        let products: [Product]
    }

    var enabled: Bool = false
    var tabLabel: String = "Specials"
    var title: String = "Festive Specials"
    var subtitle: String = ""
    /// Items on their own, in no group.
    var items: [Item] = []
    var sections: [Section] = []

    static let maxSections = 12
    static let maxItems = 40

    init() {}

    init(data: [String: Any]) {
        enabled = (data["enabled"] as? Bool) ?? false
        tabLabel = Self.clean(data["tabLabel"], 14) ?? "Specials"
        title = Self.clean(data["title"], 40) ?? "Festive Specials"
        subtitle = Self.clean(data["subtitle"], 80) ?? ""
        items = Self.parseItems(data["items"])
        let rawSections = (data["sections"] as? [[String: Any]]) ?? []
        sections = rawSections.prefix(Self.maxSections).compactMap { raw in
            guard let id = raw["id"] as? String, !id.isEmpty else { return nil }
            return Section(
                id: id,
                name: Self.clean(raw["name"], 32) ?? "",
                img: ((raw["img"] as? String) ?? "").trimmingCharacters(in: .whitespaces),
                items: Self.parseItems(raw["items"])
            )
        }
    }

    /// A list of items as saved: tidy, each once, at most `maxItems`.
    private static func parseItems(_ value: Any?) -> [Item] {
        var seen = Set<String>()
        let items: [Item] = ((value as? [[String: Any]]) ?? []).compactMap { item in
            guard let itemId = idString(item["id"]), seen.insert(itemId).inserted else { return nil }
            let price = number(item["price"])
            let mrp = number(item["mrp"])
            return Item(
                id: itemId,
                name: clean(item["name"], 90) ?? "",
                img: ((item["img"] as? String) ?? "").trimmingCharacters(in: .whitespaces),
                price: price,
                mrp: mrp > price ? mrp : 0,
                unit: clean(item["unit"], 24) ?? ""
            )
        }
        return Array(items.prefix(maxItems))
    }

    private static func itemFields(_ item: Item) -> [String: Any] {
        ["id": item.id, "name": item.name, "img": item.img, "price": item.price, "mrp": item.mrp, "unit": item.unit]
    }

    /// Something for shoppers to see: an item on its own or in a group.
    var hasAnyItem: Bool { !items.isEmpty || sections.contains { !$0.items.isEmpty } }

    /// The document saved on `config/spotlight` (the admin's Save).
    var fields: [String: Any] {
        [
            "enabled": enabled,
            "tabLabel": tabLabel.trimmingCharacters(in: .whitespacesAndNewlines),
            "title": title.trimmingCharacters(in: .whitespacesAndNewlines),
            "subtitle": subtitle.trimmingCharacters(in: .whitespacesAndNewlines),
            "items": items.map(Self.itemFields),
            "sections": sections.map { section in
                [
                    "id": section.id,
                    "name": section.name.trimmingCharacters(in: .whitespacesAndNewlines),
                    "img": section.img,
                    "items": section.items.map(Self.itemFields)
                ] as [String: Any]
            }
        ]
    }

    /// What's wrong before it can be saved, in plain words (same rules as the website).
    var problems: [String] {
        var list: [String] = []
        if tabLabel.trimmingCharacters(in: .whitespaces).isEmpty { list.append("Give the tab a name.") }
        if title.trimmingCharacters(in: .whitespaces).isEmpty { list.append("Give the page a heading.") }
        for item in items where !Self.isPhoto(item.img) {
            list.append("“\(item.name)” needs a photo.")
        }
        for section in sections {
            let name = section.name.trimmingCharacters(in: .whitespaces)
            if name.isEmpty { list.append("Every group needs a name.") }
            if !Self.isPhoto(section.img) { list.append("“\(name.isEmpty ? "A group" : name)” needs a photo.") }
            for item in section.items where !Self.isPhoto(item.img) {
                list.append("“\(item.name)” in “\(name)” needs a photo.")
            }
        }
        if enabled && !hasAnyItem {
            list.append("Add at least one item before switching it on.")
        }
        var seen = Set<String>()
        return list.filter { seen.insert($0).inserted }
    }

    /// The groups shoppers see: only those with items, each item as the shop's
    /// live product (price, stock) when the catalogue has it, its copy otherwise.
    func shownSections(products byId: [String: Product]) -> [ShownSection] {
        guard enabled else { return [] }
        return sections.compactMap { section in
            let products = Self.resolve(section.items, cat: section.name, byId: byId)
            guard !products.isEmpty else { return nil }
            return ShownSection(id: section.id, name: section.name, img: section.img, products: products)
        }
    }

    /// The items on their own, as shoppers see them.
    func shownItems(products byId: [String: Product]) -> [Product] {
        guard enabled else { return [] }
        return Self.resolve(items, cat: tabLabel, byId: byId)
    }

    private static func resolve(_ items: [Item], cat: String, byId: [String: Product]) -> [Product] {
        items.compactMap { item -> Product? in
            if let live = byId[item.id] { return live }
            guard !item.name.isEmpty, item.price > 0 else { return nil }
            return Product(
                id: item.id,
                name: item.name,
                unit: item.unit,
                price: item.price,
                originalPrice: item.mrp > item.price ? item.mrp : nil,
                img: item.img,
                cat: cat
            )
        }
        .filter { !$0.isAgeRestricted }
    }

    /// A ready-made prompt for an AI image tool (ChatGPT, Gemini…) to make a photo
    /// that sits well on the gold tiles; the same words as the website's `photoPrompt`.
    static func photoPrompt(group: Bool, name: String, unit: String = "") -> String {
        let clean = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if group {
            let what = clean.isEmpty ? "this collection" : clean
            return "A product photo of 3 to 4 items that together represent \"\(what)\", arranged as a neat group and photographed together, cut out on a plain pure white background, soft natural shadow underneath, bright even studio lighting, warm festive feel, items filling the lower two thirds of the frame, no text, no logos added, no people, portrait 4:5, high resolution."
        }
        let what = clean.isEmpty ? "this product" : clean
        let size = unit.trimmingCharacters(in: .whitespacesAndNewlines)
        return "A studio product photo of \(what)\(size.isEmpty ? "" : " (\(size))"), the whole product centred and fully in frame, on a plain pure white background, soft natural shadow, bright even lighting, true-to-life colours, no text, no extra logos, no props, no hands, square 1:1, high resolution."
    }

    /// The copy an item keeps of a shop product.
    static func item(from product: Product) -> Item {
        Item(
            id: product.id,
            name: product.name,
            img: product.img,
            price: product.price,
            mrp: (product.originalPrice ?? 0) > product.price ? (product.originalPrice ?? 0) : 0,
            unit: product.unit
        )
    }

    static func isPhoto(_ link: String) -> Bool {
        let text = link.trimmingCharacters(in: .whitespaces).lowercased()
        return (text.hasPrefix("https://") || text.hasPrefix("http://")) && text.count > 10
    }

    static func newSectionId() -> String {
        "g" + String(Int(Date().timeIntervalSince1970 * 1000), radix: 36) + String(Int.random(in: 0..<1296), radix: 36)
    }

    private static func clean(_ value: Any?, _ max: Int) -> String? {
        guard let text = value as? String else { return nil }
        let squeezed = text.split(whereSeparator: \.isWhitespace).joined(separator: " ")
        return squeezed.isEmpty ? nil : String(squeezed.prefix(max))
    }

    private static func number(_ value: Any?) -> Double {
        if let n = value as? NSNumber { return max(0, n.doubleValue) }
        if let s = value as? String, let d = Double(s) { return max(0, d) }
        return 0
    }

    private static func idString(_ value: Any?) -> String? {
        if let s = value as? String, !s.isEmpty { return s }
        if let n = value as? NSNumber { return n.stringValue }
        return nil
    }
}
