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
            return list
        }

        static func money(_ value: Double) -> String {
            value.rounded() == value ? String(Int(value)) : String(format: "%.2f", value)
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
            let qty = Int(qtyValue.rounded())

            let match = (barcode.isEmpty ? nil : byId[barcode.lowercased()])
                ?? (name.isEmpty ? nil : byName[name.lowercased()])
            let id = match?.id ?? (barcode.isEmpty ? "csv-\(slug(name))" : barcode)

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
                img: value(.image).isEmpty ? (match?.img ?? "") : value(.image),
                qty: qty,
                price: price,
                mrp: number(value(.mrp)),
                existing: match,
                include: true,
                problem: nil
            )
            if match == nil && price == nil {
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
    name,category,quantity,price,mrp,unit,brand,barcode
    Onion,Vegetables,40,35,45,1 kg,,
    Full Cream Milk,Dairy,60,36,38,500 ml,Amul,
    Dishwash Gel Lemon,Kitchen Care,25,115,130,500 ml,Vim,

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
        case "quantity", "qty", "stock", "units", "count", "pcs", "pieces", "nos", "amount":
            return .qty
        case "price", "sellingprice", "sp", "rate", "saleprice", "ourprice":
            return .price
        case "mrp", "originalprice", "listprice", "mrpprice":
            return .mrp
        case "unit", "size", "pack", "packsize", "weight", "uom", "volume":
            return .unit
        case "brand", "company", "make", "manufacturer":
            return .brand
        case "barcode", "sku", "ean", "code", "id", "productid", "itemcode":
            return .barcode
        case "image", "img", "imageurl", "photo", "picture":
            return .image
        default:
            return nil
        }
    }

    // MARK: - Helpers

    /// "₹1,250", "Rs 35" and " 40 " all read as numbers.
    private static func number(_ raw: String) -> Double? {
        var text = raw.lowercased()
            .replacingOccurrences(of: "₹", with: "")
            .replacingOccurrences(of: "rs.", with: "")
            .replacingOccurrences(of: "rs", with: "")
            .replacingOccurrences(of: ",", with: "")
            .trimmingCharacters(in: .whitespaces)
        if text.hasSuffix(".") { text.removeLast() }
        guard !text.isEmpty else { return nil }
        return Double(text)
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
