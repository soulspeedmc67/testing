import Foundation

/// Reads a stock file (a CSV saved from Excel, or rows pasted in) into a list
/// the owner checks before anything is saved. Columns are matched by name the
/// same way the web console does, so one file works in both.
public enum CSVStockImport {
    public enum Mode: String, CaseIterable, Identifiable {
        case add, set
        public var id: String { rawValue }
        public var title: String { self == .add ? "Add to my stock" : "Replace my count" }
        public var hint: String {
            self == .add ? "Adds these numbers to what you have." : "These numbers become your stock."
        }
    }

    public struct Item: Identifiable, Hashable {
        /// The product's id: the existing one, or the new one this file creates.
        public let id: String
        public let row: Int
        public var name: String
        public var category: String
        public var unit: String
        public var brand: String
        public var img: String
        public var qty: Int
        public var price: Double?
        public var mrp: Double?
        public let existing: Product?
        public var include: Bool
        /// Set when the line can't be saved as it is.
        public var problem: String?

        public var isNew: Bool { existing == nil }
        /// The file gives a photo link this item doesn't have yet.
        public var hasNewPhoto: Bool { !img.isEmpty && img != existing?.img }
        public var currentStock: Int { existing?.stock ?? 0 }
        public var shownPrice: Double { price ?? existing?.price ?? 0 }

        public func newStock(_ mode: Mode) -> Int {
            isNew || mode == .set ? qty : currentStock + qty
        }

        /// What changes on an item that's already in the shop.
        public func changes(from distributor: String) -> [String] {
            guard let existing else { return [] }
            var list: [String] = []
            if let price, price != existing.price {
                list.append("Price ₹\(Self.money(existing.price)) → ₹\(Self.money(price))")
            }
            let before = Distributor.resolvedName(existing.distributor)
            if before != distributor {
                list.append("From \(before) → \(distributor)")
            }
            if hasNewPhoto {
                list.append("New photo")
            }
            return list
        }

        static func money(_ value: Double) -> String {
            if let whole = Int(exactly: value) { return String(whole) }
            return value.isFinite ? String(format: "%.2f", value) : "—"
        }
    }

    public struct Plan {
        public var items: [Item]
        /// Rows that were left out, and why.
        public var skipped: [String]
        public var missingName: Bool
    }

    // MARK: - Reading

    public static func plan(from text: String, existing products: [Product]) -> Plan {
        let rows = parseRows(text)
        guard let header = rows.first else {
            return Plan(items: [], skipped: [], missingName: true)
        }
        var columns: [Field: Int] = [:]
        for (index, title) in header.enumerated() {
            if let field = field(for: title), columns[field] == nil {
                columns[field] = index
            }
        }
        let missingName = columns[.name] == nil && columns[.barcode] == nil

        var byId: [String: Product] = [:]
        var byName: [String: Product] = [:]
        for product in products {
            byId[product.id.lowercased()] = product
            byName[product.name.lowercased()] = product
        }

        var items: [Item] = []
        var indexById: [String: Int] = [:]
        var skipped: [String] = []

        for (offset, cells) in rows.dropFirst().enumerated() {
            let rowNo = offset + 2
            func value(_ field: Field) -> String {
                guard let i = columns[field], i < cells.count else { return "" }
                return cells[i].trimmingCharacters(in: .whitespacesAndNewlines)
            }
            let name = value(.name)
            let barcode = value(.barcode)
            if name.isEmpty && barcode.isEmpty {
                if cells.contains(where: { !$0.trimmingCharacters(in: .whitespaces).isEmpty }) {
                    skipped.append("Row \(rowNo): no name")
                }
                continue
            }
            guard let qtyValue = number(value(.qty)) else {
                skipped.append("Row \(rowNo): \(name.isEmpty ? barcode : name) has no quantity")
                continue
            }
            guard qtyValue >= 0 else {
                skipped.append("Row \(rowNo): \(name.isEmpty ? barcode : name) has a negative quantity")
                continue
            }
            guard qtyValue <= maxQuantity else {
                skipped.append("Row \(rowNo): \(name.isEmpty ? barcode : name) has a quantity that's too big")
                continue
            }
            let qty = Int(qtyValue.rounded())

            let match = (barcode.isEmpty ? nil : byId[barcode.lowercased()] ?? byId[safeCode(barcode).lowercased()])
                ?? (name.isEmpty ? nil : byName[name.lowercased()])
            let id = match?.id ?? newId(barcode: barcode, name: name)

            // The same item twice in one file: add the rows together.
            if let existingIndex = indexById[id] {
                items[existingIndex].qty += qty
                continue
            }

            let price = number(value(.price))
            var item = Item(
                id: id,
                row: rowNo,
                name: name.isEmpty ? (match?.name ?? barcode) : name,
                category: value(.category).isEmpty ? (match?.cat ?? "") : value(.category),
                unit: value(.unit).isEmpty ? (match?.unit ?? "") : value(.unit),
                brand: value(.brand),
                img: imageURL(value(.image)) ?? match?.img ?? "",
                qty: qty,
                price: price,
                mrp: number(value(.mrp)),
                existing: match,
                include: true,
                problem: nil
            )
            if !isValidDocumentID(id) {
                item.problem = "This item's code can't be saved"
                item.include = false
            } else if (price ?? 0) < 0 || (item.mrp ?? 0) < 0 {
                item.problem = "Price can't be below zero"
                item.include = false
            } else if match == nil && price == nil {
                item.problem = "New item needs a price"
                item.include = false
            }
            indexById[id] = items.count
            items.append(item)
        }
        return Plan(items: items, skipped: skipped, missingName: missingName)
    }

    /// A small file to start from.
    public static let sample = """
    name,category,quantity,price,mrp,unit,brand,barcode,image
    Onion,Vegetables,40,35,45,1 kg,,,
    Full Cream Milk,Dairy,60,36,38,500 ml,Amul,,https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400
    Dishwash Gel Lemon,Kitchen Care,25,115,130,500 ml,Vim,,

    """

    /// Pasted into ChatGPT, Gemini or Claude along with a bill, invoice or
    /// price list, it writes a file this importer reads. Same text as
    /// `AI_IMPORT_PROMPT` in the web's `src/lib/csvInventory.js`.
    public static let aiPrompt = """
    Turn the file I've attached (a bill, invoice, price list or photo of one) into a stock list for my grocery shop, as CSV.

    Reply with only the CSV: no explanation before or after it.

    The first line must be exactly:
    name,category,quantity,price,mrp,unit,brand,barcode,image

    Then one line for each product:
    - name: the product's name as a shopper would search for it, without the pack size. Example: Amul Taaza Toned Milk
    - category: a short shop category, such as Dairy, Bakery, Fruits, Vegetables, Staples, Snacks, Biscuits, Beverages, Instant Food, Spices, Personal Care, Home Care or Kitchen Care. Spell the same category the same way every time.
    - quantity: how many single packs or pieces came in, as a whole number. If the bill counts cases or boxes, multiply by the number of pieces in each.
    - price: the price I sell one piece at, in rupees. If the document doesn't show a selling price, use the MRP.
    - mrp: the MRP printed for one piece, in rupees. Leave it empty if it isn't shown.
    - unit: the pack size, such as 500 ml, 1 kg or 10 pcs.
    - brand: the brand, or empty.
    - barcode: the barcode or item code if the document shows one, otherwise empty. Never make one up.
    - image: a direct https link to a clear photo of the product (ending in .jpg, .jpeg, .png or .webp), only if you can look it up and check that it opens. Otherwise leave it empty. Never make up a link.

    Rules:
    - Numbers only in quantity, price and mrp: no ₹, Rs or commas.
    - If a value has a comma in it, put that value in double quotes.
    - Leave out totals, taxes, discounts, delivery charges and anything that isn't a product.
    - If you can't read a number clearly, leave that cell empty instead of guessing.
    """

    // MARK: - Columns

    private enum Field { case name, category, qty, price, mrp, unit, brand, barcode, image }

    private static func field(for title: String) -> Field? {
        let key = title.lowercased().filter { $0.isLetter || $0.isNumber }
        switch key {
        case "name", "product", "productname", "item", "itemname", "title", "description":
            return .name
        case "category", "cat", "type", "section", "department":
            return .category
        case "quantity", "qty", "stock", "units", "count", "pcs", "pieces", "nos", "amount",
             "noofitems", "numberofitems", "totalqty", "qtyreceived", "receivedqty":
            return .qty
        case "price", "sellingprice", "sp", "rate", "saleprice", "ourprice", "unitprice", "sellingrate",
             "priceinrs", "pricers", "priceinr":
            return .price
        case "mrp", "originalprice", "listprice", "mrpprice":
            return .mrp
        case "unit", "size", "pack", "packsize", "weight", "uom", "volume":
            return .unit
        case "brand", "company", "make", "manufacturer":
            return .brand
        case "barcode", "sku", "ean", "code", "id", "productid", "itemcode":
            return .barcode
        case "image", "img", "imageurl", "photo", "picture", "imagelink", "imagelinks", "photourl",
             "photolink", "picturelink", "pictureurl", "imgurl", "thumbnail":
            return .image
        default:
            return nil
        }
    }

    // MARK: - Helpers

    /// More than any shop holds; also keeps the count well inside `Int`.
    private static let maxQuantity = 1_000_000.0

    /// "₹1,250", "Rs 35" and " 40 " all read as numbers. "nan", "inf" and
    /// "1e999" don't: Swift reads them as numbers that can't become an `Int`.
    static func number(_ raw: String) -> Double? {
        var text = raw.lowercased()
            .replacingOccurrences(of: "₹", with: "")
            .replacingOccurrences(of: "rs.", with: "")
            .replacingOccurrences(of: "rs", with: "")
            .replacingOccurrences(of: ",", with: "")
            .trimmingCharacters(in: .whitespaces)
        if text.hasSuffix(".") { text.removeLast() }
        guard !text.isEmpty, let value = Double(text), value.isFinite else { return nil }
        return value
    }

    /// A photo link the shop can show, or nil. Only web links are kept, and
    /// Google Drive / Dropbox share links become direct links to the picture.
    static func imageURL(_ raw: String) -> String? {
        var link = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !link.isEmpty else { return nil }
        if link.hasPrefix("//") { link = "https:" + link }
        guard let url = URL(string: link),
              let scheme = url.scheme?.lowercased(), scheme == "https" || scheme == "http",
              let host = url.host?.lowercased(), !host.isEmpty else { return nil }
        if host == "drive.google.com" {
            // .../file/d/<id>/view or ...?id=<id>
            let parts = url.pathComponents
            let fileId = parts.firstIndex(of: "d").flatMap { $0 + 1 < parts.count ? parts[$0 + 1] : nil }
                ?? URLComponents(url: url, resolvingAgainstBaseURL: false)?
                    .queryItems?.first(where: { $0.name == "id" })?.value
            if let fileId, !fileId.isEmpty {
                return "https://drive.google.com/uc?export=view&id=\(fileId)"
            }
        }
        if host.hasSuffix("dropbox.com"), var components = URLComponents(url: url, resolvingAgainstBaseURL: false) {
            var items = (components.queryItems ?? []).filter { $0.name != "dl" && $0.name != "raw" }
            items.append(URLQueryItem(name: "raw", value: "1"))
            components.queryItems = items
            return components.string ?? link
        }
        return link
    }

    /// A "/" in a code (e.g. "OIL/1L") would split the database path, so it
    /// becomes "-".
    private static func safeCode(_ barcode: String) -> String {
        barcode.replacingOccurrences(of: "/", with: "-")
    }

    /// The id for an item this file adds: its barcode, or one made from its name.
    static func newId(barcode: String, name: String) -> String {
        let code = safeCode(barcode)
        if !code.isEmpty && isValidDocumentID(code) { return code }
        return "csv-\(slug(name.isEmpty ? barcode : name))"
    }

    /// Firestore stops the app (it doesn't throw) on a document id that is
    /// empty, has a "/", is "." or "..", looks like "__name__", or is over
    /// 1500 bytes. Nothing reaches `document(_:)` without passing this.
    public static func isValidDocumentID(_ id: String) -> Bool {
        !id.isEmpty
            && !id.contains("/")
            && id != "." && id != ".."
            && !(id.hasPrefix("__") && id.hasSuffix("__"))
            && id.utf8.count <= 1500
    }

    private static func slug(_ text: String) -> String {
        let lowered = text.lowercased().map { $0.isLetter || $0.isNumber ? $0 : "-" }
        let joined = String(lowered).split(separator: "-").joined(separator: "-")
        return joined.isEmpty ? String(Int(Date().timeIntervalSince1970)) : String(joined.prefix(40))
    }

    /// Splits the text into rows of cells: commas, tabs or semicolons, with
    /// quoted cells ("Rice, 1 kg") kept whole. Markdown fences are ignored.
    static func parseRows(_ text: String) -> [[String]] {
        let clean = text
            .replacingOccurrences(of: "\u{FEFF}", with: "")
            .replacingOccurrences(of: "\r\n", with: "\n")
            .replacingOccurrences(of: "\r", with: "\n")
        let lines = clean.split(separator: "\n", omittingEmptySubsequences: true)
            .map(String.init)
            .filter { !$0.trimmingCharacters(in: .whitespaces).hasPrefix("```") }
        guard let first = lines.first else { return [] }
        let candidates: [Character] = [",", "\t", ";"]
        let separator = candidates.max { a, b in
            first.filter { $0 == a }.count < first.filter { $0 == b }.count
        } ?? ","

        return lines.map { line in
            var cells: [String] = []
            var current = ""
            var inQuotes = false
            let chars = Array(line)
            var i = 0
            while i < chars.count {
                let ch = chars[i]
                if ch == "\"" {
                    if inQuotes && i + 1 < chars.count && chars[i + 1] == "\"" {
                        current.append("\"")
                        i += 1
                    } else {
                        inQuotes.toggle()
                    }
                } else if ch == separator && !inQuotes {
                    cells.append(current)
                    current = ""
                } else {
                    current.append(ch)
                }
                i += 1
            }
            cells.append(current)
            return cells
        }
    }
}
