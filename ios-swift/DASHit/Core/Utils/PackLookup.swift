#if ADMIN_APP_TARGET
import Foundation

/// Looks a scanned barcode up on Open Food Facts, then its sister database
/// Open Beauty Facts (toothpaste, soap and the like), the same way the web
/// console does. Photos are saved as links to the database's own copy, never
/// uploaded. They are CC BY-SA, credited on the Terms page.
enum PackLookup {
    struct Pack: Equatable {
        let barcode: String
        let name: String
        let brand: String
        let unit: String
        /// The front photo, full size, or "" when the record has none.
        let photo: String
    }

    private static let sites = ["https://world.openfoodfacts.org", "https://world.openbeautyfacts.org"]
    private static let fields = "code,product_name,product_name_en,brands,quantity,selected_images,image_front_url"
    /// Front photo language preference: English, then Indian languages, then any.
    private static let languages = ["en", "hi", "mr", "ta", "te", "kn", "ml", "bn", "gu", "pa", "or", "as", "ur", "ne", "sa", "in"]

    /// EAN-8, UPC-A, EAN-13 and GTIN-14 are what the databases are keyed by.
    static func isLookupBarcode(_ code: String) -> Bool {
        code.range(of: #"^(\d{8}|\d{12,14})$"#, options: .regularExpression) != nil
    }

    /// The pack for this barcode, or nil when neither database knows it.
    /// Throws only when the internet is unreachable.
    static func find(barcode raw: String) async throws -> Pack? {
        let code = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard isLookupBarcode(code) else { return nil }
        var lastError: Error?
        for site in sites {
            do {
                if let pack = try await fetch(code, from: site) { return pack }
            } catch {
                lastError = error
            }
        }
        if let lastError { throw lastError }
        return nil
    }

    private static func fetch(_ code: String, from site: String) async throws -> Pack? {
        guard let url = URL(string: "\(site)/api/v2/product/\(code).json?fields=\(fields)") else { return nil }
        var request = URLRequest(url: url, timeoutInterval: 12)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        // The databases ask every app to say who it is.
        request.setValue("DASHitAdmin/1.0 (iOS)", forHTTPHeaderField: "User-Agent")
        let (data, response) = try await URLSession.shared.data(for: request)
        // A barcode they don't know comes back as 404.
        guard (response as? HTTPURLResponse)?.statusCode == 200,
              let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              (json["status"] as? Int) == 1,
              let product = json["product"] as? [String: Any] else { return nil }

        let name = [product["product_name_en"], product["product_name"]]
            .compactMap { ($0 as? String)?.trimmingCharacters(in: .whitespaces) }
            .first { !$0.isEmpty } ?? ""
        let brand = ((product["brands"] as? String) ?? "")
            .split(separator: ",").first.map { $0.trimmingCharacters(in: .whitespaces) } ?? ""
        let unit = ((product["quantity"] as? String) ?? "").trimmingCharacters(in: .whitespaces)
        let photo = frontPhoto(product)
        guard !name.isEmpty || !photo.isEmpty else { return nil }
        return Pack(barcode: code, name: name, brand: brand, unit: unit, photo: photo)
    }

    private static func frontPhoto(_ product: [String: Any]) -> String {
        let selected = product["selected_images"] as? [String: Any]
        let display = (selected?["front"] as? [String: Any])?["display"] as? [String: String] ?? [:]
        if let url = languages.lazy.compactMap({ display[$0] }).first ?? display.values.sorted().first {
            return fullSize(url)
        }
        if let url = product["image_front_url"] as? String, !url.isEmpty { return fullSize(url) }
        return ""
    }

    /// The databases serve 100/200/400px copies; ".full" is the original upload.
    private static func fullSize(_ url: String) -> String {
        url.replacingOccurrences(of: #"\.(100|200|400)\.(jpg|jpeg|png|webp)$"#, with: ".full.$2", options: [.regularExpression, .caseInsensitive])
    }
}
#endif
