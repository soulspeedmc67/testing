#if ADMIN_APP_TARGET
import Foundation

/// Looks a scanned barcode up in the free, open product databases: Open Food
/// Facts, Open Beauty Facts (toothpaste, soap and the like) and Open Products
/// Facts (cleaners, stationery and everything else), the same records the web
/// console uses. Photos are saved as links to the database's own copy, never
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

    enum Outcome: Equatable {
        case found(Pack)
        /// Every database answered, and none has this barcode.
        case notFound
        /// Not a maker's barcode (EAN/UPC), so there's nothing to look up.
        case notAPackBarcode
        /// A database refused (too many requests) or was overloaded, even after trying again.
        case busy
        /// No internet.
        case offline

        var pack: Pack? {
            if case .found(let pack) = self { return pack }
            return nil
        }
    }

    /// In order of preference when more than one has the barcode.
    private static let sites = [
        "https://world.openfoodfacts.org",
        "https://world.openbeautyfacts.org",
        "https://world.openproductsfacts.org",
    ]
    private static let fields = "code,product_name,product_name_en,brands,quantity,selected_images,image_front_url"
    /// Front photo language preference: English, then Indian languages, then any.
    private static let languages = ["en", "hi", "mr", "ta", "te", "kn", "ml", "bn", "gu", "pa", "or", "as", "ur", "ne", "sa", "in"]

    /// EAN-8, UPC-A, EAN-13 and GTIN-14 are what the databases are keyed by.
    static func isLookupBarcode(_ code: String) -> Bool {
        code.range(of: #"^(\d{8}|\d{12,14})$"#, options: .regularExpression) != nil
    }

    static func find(barcode raw: String) async -> Outcome {
        let code = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard isLookupBarcode(code) else { return .notAPackBarcode }

        // All three at once, so a miss costs one wait, not three.
        async let food = fetch(code, from: sites[0])
        async let beauty = fetch(code, from: sites[1])
        async let other = fetch(code, from: sites[2])
        let answers = await [food, beauty, other]

        if let pack = answers.lazy.compactMap({ $0.pack }).first { return .found(pack) }
        if answers.allSatisfy({ $0 == .offline }) { return .offline }
        // "Not found" only when every database really answered; a refusal is not an answer.
        if answers.contains(where: { $0 == .busy || $0 == .offline }) { return .busy }
        return .notFound
    }

    /// One database. A refusal (429) or an overload (5xx) is tried twice more,
    /// after a short wait, before giving up.
    private static func fetch(_ code: String, from site: String) async -> Outcome {
        guard let url = URL(string: "\(site)/api/v2/product/\(code).json?fields=\(fields)") else { return .notFound }
        var request = URLRequest(url: url, timeoutInterval: 10)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        // The databases ask every app to say who it is.
        request.setValue("DASHitAdmin/1.0 (iOS)", forHTTPHeaderField: "User-Agent")

        for attempt in 0..<3 {
            if attempt > 0 {
                try? await Task.sleep(nanoseconds: attempt == 1 ? 1_500_000_000 : 4_000_000_000)
            }
            let data: Data
            let status: Int
            do {
                let (body, response) = try await URLSession.shared.data(for: request)
                data = body
                status = (response as? HTTPURLResponse)?.statusCode ?? 0
            } catch let error as URLError where error.code == .timedOut {
                continue
            } catch {
                return .offline
            }
            if status == 429 || status >= 500 { continue }
            // 404 is how they say they don't know the barcode.
            guard status == 200, let pack = parse(data, code: code) else { return .notFound }
            return .found(pack)
        }
        return .busy
    }

    private static func parse(_ data: Data, code: String) -> Pack? {
        guard let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
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
