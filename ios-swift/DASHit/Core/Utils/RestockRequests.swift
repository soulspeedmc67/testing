import Foundation
import FirebaseAuth

/// "Notify me" on items that are out of stock, the same as the website
/// (src/lib/restock.js) and the Android app. The request goes to
/// public/api/restock/request.php; the shop owner sees it under "Restock
/// requests" in the admin apps and can tell everyone who asked once it's back
/// (a "Back in stock" push). Which items this phone asked about is kept here,
/// so the button keeps saying so.
@MainActor
final class RestockRequests: ObservableObject {
    static let shared = RestockRequests()

    enum Failure: LocalizedError {
        case needsSignIn
        case server(String)

        var errorDescription: String? {
            switch self {
            case .needsSignIn: return "Sign in to get told when it's back."
            case .server(let text): return text
            }
        }
    }

    private static let key = "dashit_restock_requests"
    private static let endpoint = URL(string: "https://dashit.co.in/api/restock/request.php")!

    @Published private(set) var asked: Set<String>

    private init() {
        asked = Set(UserDefaults.standard.stringArray(forKey: Self.key) ?? [])
    }

    func hasAsked(_ productId: String) -> Bool { asked.contains(productId) }

    /// Asks to be told when the item is back, or takes that back. Returns the new state.
    @discardableResult
    func toggle(_ productId: String) async throws -> Bool {
        guard let user = Auth.auth().currentUser, !user.isAnonymous else { throw Failure.needsSignIn }
        guard let idToken = try? await user.getIDToken() else { throw Failure.needsSignIn }
        let wanted = !asked.contains(productId)

        var request = URLRequest(url: Self.endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 20
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "id_token": idToken,
            "productId": productId,
            "action": wanted ? "add" : "remove",
        ])
        guard let (data, response) = try? await URLSession.shared.data(for: request) else {
            throw Failure.server("No connection. Please try again.")
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 401 { throw Failure.needsSignIn }
        guard status / 100 == 2 else {
            let text = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String
            throw Failure.server(text ?? "Couldn't save that. Please try again.")
        }

        if wanted { asked.insert(productId) } else { asked.remove(productId) }
        UserDefaults.standard.set(Array(asked), forKey: Self.key)
        return wanted
    }
}
