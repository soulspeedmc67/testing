#if ADMIN_APP_TARGET
import Foundation
import Security
import UIKit

/// The owner's Open Food Facts account, kept in this iPhone's Keychain. The
/// same account works on Open Beauty Facts and Open Products Facts.
enum OpenFactsAccount {
    struct Login: Equatable {
        let username: String
        let password: String
    }

    private static let service = "org.openfoodfacts.login"

    static func saved() -> Login? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecReturnAttributes as String: true,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let found = item as? [String: Any],
              let username = found[kSecAttrAccount as String] as? String,
              let data = found[kSecValueData as String] as? Data,
              let password = String(data: data, encoding: .utf8) else { return nil }
        return Login(username: username, password: password)
    }

    static func save(_ login: Login) {
        forget()
        let item: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: login.username,
            kSecValueData as String: Data(login.password.utf8),
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
        SecItemAdd(item as CFDictionary, nil)
    }

    static func forget() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
        ]
        SecItemDelete(query as CFDictionary)
    }
}

/// Adds a pack to the Open Food Facts family under the owner's account: its
/// name, brand and size when the database doesn't have it yet, then the photo
/// of its front, which becomes the record's front picture. Returns the link to
/// that photo, which DASHit saves (the photo itself stays with the database).
enum OpenFactsUpload {
    enum Kind: String, CaseIterable, Identifiable {
        case food, beauty, product
        var id: String { rawValue }

        var title: String {
            switch self {
            case .food: return "Food and drink"
            case .beauty: return "Soap, toothpaste, cosmetics"
            case .product: return "Other products"
            }
        }

        /// Which of the databases takes this kind of pack (`product_type`).
        var site: String {
            switch self {
            case .food: return PackLookup.sites[0]
            case .beauty: return PackLookup.sites[1]
            case .product: return PackLookup.sites[2]
            }
        }

        /// A first guess from the shop's category; the owner can change it.
        static func guess(forCategory category: String) -> Kind {
            let c = category.lowercased()
            if ["personal care", "beauty", "baby care", "health"].contains(where: { c.contains($0) }) { return .beauty }
            if ["home care", "household", "kitchen care", "cleaning", "stationery", "others"].contains(where: { c.contains($0) }) {
                return .product
            }
            return .food
        }
    }

    struct Failure: LocalizedError {
        let message: String
        var errorDescription: String? { message }
    }

    /// `site`: where the pack already is, or nil to add it as `kind`.
    static func add(
        barcode: String,
        site existingSite: String?,
        kind: Kind,
        name: String,
        brand: String,
        quantity: String,
        photo: UIImage,
        login: OpenFactsAccount.Login
    ) async throws -> String {
        let site = existingSite ?? kind.site
        guard let jpeg = jpegForUpload(photo) else {
            throw Failure(message: "Couldn't read that photo. Take it again.")
        }

        // 1. A new record: the details first, so the photo has somewhere to go.
        //    A pack the database already has keeps its own details.
        if existingSite == nil {
            var fields = [
                "code": barcode,
                "user_id": login.username,
                "password": login.password,
                "product_type": kind.rawValue,
                "lc": "en",
                "lang": "en",
                "product_name_en": name,
                "countries": "India",
            ]
            if !brand.isEmpty { fields["brands"] = brand }
            if !quantity.isEmpty { fields["quantity"] = quantity }
            let answer = try await postForm("\(site)/cgi/product_jqm2.pl", fields)
            guard (answer["status"] as? Int) == 1 else {
                throw Failure(message: refusal(answer, fallback: "Open Food Facts didn't save the details."))
            }
        }

        // 2. The photo of the front.
        let upload = try await postPhoto(
            "\(site)/cgi/product_image_upload.pl",
            fields: ["code": barcode, "imagefield": "front_en", "user_id": login.username, "password": login.password],
            fileField: "imgupload_front_en",
            jpeg: jpeg
        )
        // The photo's number, sent as a number or as text depending on the answer.
        let number: (Any?) -> Int? = { ($0 as? Int) ?? ($0 as? String).flatMap { Int($0) } }
        guard let imgid = number(upload["imgid"]) ?? number((upload["image"] as? [String: Any])?["imgid"]) else {
            throw Failure(message: refusal(upload, fallback: "Open Food Facts didn't take the photo."))
        }

        // 3. Make it the front picture. The first photo of a record is already;
        //    a record that had other photos needs it chosen.
        _ = try? await postForm("\(site)/cgi/product_image_crop.pl", [
            "code": barcode, "imgid": String(imgid), "id": "front_en",
            "user_id": login.username, "password": login.password,
        ])

        // 4. The link DASHit keeps: the front picture as the database now
        //    shows it, or the uploaded photo itself while that catches up.
        if let front = await PackLookup.frontPhoto(barcode: barcode, site: site) { return front }
        if let direct = uploadedPhotoLink(upload, site: site, imgid: imgid) { return direct }
        throw Failure(message: "The photo was added, but its link isn't ready yet. Scan the pack again in a minute.")
    }

    // MARK: - Requests

    private static func makeRequest(_ url: String) throws -> URLRequest {
        guard let url = URL(string: url) else { throw Failure(message: "Bad address.") }
        var request = URLRequest(url: url, timeoutInterval: 60)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        // The databases ask every app to say who it is.
        request.setValue("DASHitAdmin/1.0 (iOS)", forHTTPHeaderField: "User-Agent")
        return request
    }

    private static func postForm(_ url: String, _ fields: [String: String]) async throws -> [String: Any] {
        var request = try makeRequest(url)
        request.setValue("application/x-www-form-urlencoded; charset=utf-8", forHTTPHeaderField: "Content-Type")
        // Plain ASCII letters and digits only; everything else is escaped (names can be in Hindi).
        let allowed = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")
        request.httpBody = fields
            .map { key, value in
                let v = value.addingPercentEncoding(withAllowedCharacters: allowed) ?? ""
                return "\(key)=\(v)"
            }
            .joined(separator: "&")
            .data(using: .utf8)
        return try await send(request)
    }

    private static func postPhoto(_ url: String, fields: [String: String], fileField: String, jpeg: Data) async throws -> [String: Any] {
        var request = try makeRequest(url)
        let boundary = "DASHit-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        var body = Data()
        for (key, value) in fields {
            body.append(Data("--\(boundary)\r\nContent-Disposition: form-data; name=\"\(key)\"\r\n\r\n\(value)\r\n".utf8))
        }
        body.append(Data("--\(boundary)\r\nContent-Disposition: form-data; name=\"\(fileField)\"; filename=\"front.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".utf8))
        body.append(jpeg)
        body.append(Data("\r\n--\(boundary)--\r\n".utf8))
        request.httpBody = body
        return try await send(request)
    }

    private static func send(_ request: URLRequest) async throws -> [String: Any] {
        let answer: (Data, URLResponse)
        do {
            answer = try await URLSession.shared.data(for: request)
        } catch {
            throw Failure(message: "No internet. Connect and try again.")
        }
        let data = answer.0
        let status = (answer.1 as? HTTPURLResponse)?.statusCode ?? 0
        if status == 429 || status >= 500 {
            throw Failure(message: "Open Food Facts is busy right now. Try again in a minute.")
        }
        // A wrong username or password gets a web page back instead of an answer.
        guard let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
            throw Failure(message: "Open Food Facts didn't accept the username and password. Check them and try again.")
        }
        return json
    }

    /// The database's own words for why it said no, when it gives them.
    private static func refusal(_ answer: [String: Any], fallback: String) -> String {
        for key in ["status_verbose", "error", "status"] {
            if let text = answer[key] as? String, !text.isEmpty, text != "status ok" {
                return "Open Food Facts said: \(text)"
            }
        }
        return fallback
    }

    /// The uploaded photo's own address, from the upload answer: its thumbnail
    /// path with the 400px copy's name.
    private static func uploadedPhotoLink(_ upload: [String: Any], site: String, imgid: Int) -> String? {
        guard let thumb = ((upload["files"] as? [[String: Any]])?.first?["thumbnailUrl"] as? String),
              let slash = thumb.lastIndex(of: "/") else { return nil }
        let folder = String(thumb[..<slash])
        let host = site.replacingOccurrences(of: "https://world.", with: "https://images.")
        return folder.hasPrefix("http") ? "\(folder)/\(imgid).400.jpg" : "\(host)\(folder)/\(imgid).400.jpg"
    }

    /// At most 1600px on the long side (the databases need at least 640px),
    /// as a JPEG. Drawing it also applies the camera's rotation.
    private static func jpegForUpload(_ image: UIImage) -> Data? {
        let size = image.size
        guard size.width > 0, size.height > 0 else { return nil }
        let scale = min(1, 1600 / max(size.width, size.height))
        let target = CGSize(width: (size.width * scale).rounded(), height: (size.height * scale).rounded())
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        let resized = UIGraphicsImageRenderer(size: target, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: target))
        }
        return resized.jpegData(compressionQuality: 0.85)
    }
}
#endif
