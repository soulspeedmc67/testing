import Foundation
import FirebaseAuth

/// Sign-in for the customer app, sharing Firebase Auth and `users/{uid}` with
/// the Android app. The number is the account: the sign-in server next to the
/// website (dashit.co.in/api/auth/, PHP on Hostinger) sends a 6-digit code to
/// it on WhatsApp and swaps the right code for a Firebase custom token. One
/// number is one account ("ph-91XXXXXXXXXX") on any phone, and the number
/// travels in the sign-in, which the Firestore rules check. Same flow as
/// Android (`AuthRepository.kt`).
///
/// Sign in with Apple opens the same account: the first time, the shopper
/// confirms their number with a code once and the server ties the Apple ID to
/// it; after that Apple signs straight in.
@MainActor
final class AuthService: ObservableObject {
    static let shared = AuthService()
    private static let server = URL(string: "https://dashit.co.in/api/auth/")!

    @Published var currentUser: UserProfile?
    @Published var isAuthenticated: Bool = false
    @Published var isAuthenticating: Bool = false
    @Published var errorMessage: String?
    /// Signed in with an Apple ID that isn't tied to a number yet: the
    /// shopper confirms their number with a code once, and `signIn` ties them.
    @Published private(set) var isConfirmingNumberForApple = false
    /// The name Apple shared (it does so only the very first time).
    private var appleName: String?

    private init() {
        checkCurrentSession()
    }

    /// Accounts the sign-in server made. Sessions from before sign-in codes
    /// (anonymous, email or Apple) read as signed out, so those shoppers sign
    /// in again with a code. They aren't signed out of Firebase here: the
    /// admin app builds this file too, and its staff sign in with email.
    static func isNumberAccount(_ uid: String) -> Bool {
        uid.hasPrefix("ph-")
    }

    /// The signed-in shopper's Firebase uid. Orders must carry exactly this as userId.
    var firebaseUID: String? {
        guard let uid = Auth.auth().currentUser?.uid, Self.isNumberAccount(uid) else { return nil }
        return uid
    }

    /// Signed in, but the account has no name yet: the rider asks for it at the door.
    var needsName: Bool {
        isAuthenticated && (currentUser?.name?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
    }

    /// Signed in with everything an order needs: a number and a name.
    var isReadyToOrder: Bool {
        isAuthenticated && !needsName
    }

    func checkCurrentSession() {
        if let uid = firebaseUID, let cachedProfile = LocalStorage.shared.loadUserProfile(), cachedProfile.id == uid {
            self.currentUser = cachedProfile
            self.isAuthenticated = true
        } else {
            self.isAuthenticated = false
            self.currentUser = nil
        }
    }

    /// Indian mobile: 10 digits starting 6–9. Returns the 10 digits or nil.
    static func normalizedMobile(_ input: String) -> String? {
        let digits = String(input.filter(\.isNumber).suffix(10))
        guard digits.count == 10, let first = digits.first, "6789".contains(first) else { return nil }
        return digits
    }

    // MARK: - Phone

    /// Sends a 6-digit code to the number on WhatsApp. Returns the seconds
    /// before another can be sent.
    @discardableResult
    func sendCode(to mobile: String) async throws -> Int {
        guard let clean = Self.normalizedMobile(mobile) else { throw fail(.invalidMobile) }
        return try await run {
            let sent: CodeSent = try await self.post("send-code.php", body: ["mobile": clean])
            return sent.resend_after ?? 30
        }
    }

    /// Checks the code and signs in to the number's account. `name`, from the
    /// sign-up form, fills an account that has none yet. Also confirms it's
    /// really the shopper before their account is deleted: Firebase only
    /// deletes an account that signed in moments ago.
    func signIn(mobile: String, code: String, name: String? = nil) async throws {
        guard let clean = Self.normalizedMobile(mobile) else { throw fail(.invalidMobile) }
        let trimmedName = name?.trimmingCharacters(in: .whitespaces)
        try await run {
            var body: [String: Any] = ["mobile": clean, "code": code]
            // Just signed in with Apple: the server ties that Apple ID to this number.
            if self.isConfirmingNumberForApple, let apple = Auth.auth().currentUser, !Self.isNumberAccount(apple.uid) {
                body["id_token"] = try await apple.getIDToken()
            }
            let verified: CodeVerified = try await self.post("verify-code.php", body: body)
            let uid = try await Auth.auth().signIn(withCustomToken: verified.token).user.uid
            let profile = try await FirestoreService.shared.ensureUserProfile(
                uid: uid,
                mobile: clean,
                name: (trimmedName?.isEmpty ?? true) ? self.appleName : trimmedName
            )
            self.isConfirmingNumberForApple = false
            self.appleName = nil
            self.finishSignIn(with: profile)
        }
    }

    // MARK: - Apple

    /// Signs in with Apple. An Apple ID already tied to a number opens that
    /// number's account; a new one asks for the number once
    /// (`isConfirmingNumberForApple`).
    func signInWithApple(idToken: String, rawNonce: String, fullName: PersonNameComponents?) async throws {
        try await run {
            let credential = OAuthProvider.credential(withProviderID: "apple.com", idToken: idToken, rawNonce: rawNonce)
            let user = try await Auth.auth().signIn(with: credential).user
            // Apple shares the name only on the very first sign-in.
            let shared = fullName.map { PersonNameComponentsFormatter.localizedString(from: $0, style: .default) }
            let trimmed = shared?.trimmingCharacters(in: .whitespaces)
            let name = (trimmed?.isEmpty ?? true) ? nil : trimmed
            guard Self.isNumberAccount(user.uid) else {
                self.appleName = name
                self.isConfirmingNumberForApple = true
                return
            }
            let profile = try await FirestoreService.shared.ensureUserProfile(
                uid: user.uid,
                mobile: String(user.uid.dropFirst("ph-91".count)),
                name: name
            )
            self.finishSignIn(with: profile)
        }
    }

    /// Back to the number on its own, after Sign in with Apple asked for one.
    func cancelAppleSignIn() {
        guard isConfirmingNumberForApple else { return }
        try? Auth.auth().signOut()
        isConfirmingNumberForApple = false
        appleName = nil
    }

    /// Whether this account also signs in with an Apple ID. Deleting it then
    /// revokes DASHit's Apple tokens, as Apple requires.
    var isAppleAccount: Bool {
        Auth.auth().currentUser?.providerData.contains { $0.providerID == "apple.com" } ?? false
    }

    /// Revokes DASHit's Apple tokens with the code from a fresh Apple
    /// confirmation. Needs the Apple key set up in Firebase; the account and
    /// its data are still deleted if Apple refuses.
    func revokeApple(authorizationCode: String) async {
        do {
            try await Auth.auth().revokeToken(withAuthorizationCode: authorizationCode)
        } catch {
            #if DEBUG
            print("⚠️ [Auth] Apple token revocation failed: \(error)")
            #endif
        }
    }

    /// Adds the shopper's name to an account that has none.
    func updateName(_ name: String) async throws {
        let clean = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { throw fail(.missingName) }
        guard let uid = firebaseUID, var profile = currentUser else { throw fail(.notSignedIn) }
        try await run {
            try await FirestoreService.shared.updateUserName(uid: uid, name: clean)
            profile.name = clean
            self.finishSignIn(with: profile)
        }
    }

    // MARK: - Session

    func signOut() {
        try? Auth.auth().signOut()
        isConfirmingNumberForApple = false
        appleName = nil
        LocalStorage.shared.clearUserProfile()
        self.currentUser = nil
        self.isAuthenticated = false
        HapticsManager.shared.light()
    }

    /// Delete user account (App Store 5.1.1(v) Requirement). Call it straight
    /// after `signIn` with a fresh code: Firebase refuses to delete an account
    /// that signed in long ago.
    func deleteAccount() async throws {
        guard let user = Auth.auth().currentUser else { return }
        let uid = user.uid

        // 1. Delete Firestore profile
        try await FirestoreService.shared.deleteUserData(uid: uid)

        // 2. Delete Firebase Auth user
        try await user.delete()

        // 3. Purge all local data
        LocalStorage.shared.clearAll()
        AddressBook.shared.forgetAll()
        RecentSearches.shared.clear()
        self.currentUser = nil
        self.isAuthenticated = false

        HapticsManager.shared.warning()
    }

    // MARK: - Private

    private func finishSignIn(with profile: UserProfile) {
        LocalStorage.shared.saveUserProfile(profile)
        currentUser = profile
        isAuthenticated = true
        HapticsManager.shared.success()
    }

    /// Shows the error's message and hands it back, for a check that fails
    /// before any work starts.
    private func fail(_ error: AuthError) -> AuthError {
        errorMessage = error.errorDescription
        HapticsManager.shared.warning()
        return error
    }

    /// Runs a sign-in step with the spinner on, turning server and Firebase
    /// errors into plain messages.
    private func run<T>(_ work: () async throws -> T) async throws -> T {
        isAuthenticating = true
        errorMessage = nil
        defer { isAuthenticating = false }
        do {
            return try await work()
        } catch let error as AuthError {
            throw fail(error)
        } catch {
            throw fail(AuthError.from(firebase: error))
        }
    }

    // MARK: - Sign-in server

    private struct CodeSent: Decodable {
        let resend_after: Int?
    }

    private struct CodeVerified: Decodable {
        let token: String
    }

    private struct ServerError: Decodable {
        let error: String?
        let retry_after: Int?
    }

    /// POSTs JSON to the sign-in server; its `error` message becomes the thrown AuthError's.
    private func post<T: Decodable>(_ path: String, body: [String: Any]) async throws -> T {
        var request = URLRequest(url: Self.server.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        request.timeoutInterval = 25

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw AuthError.network
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status), let decoded = try? JSONDecoder().decode(T.self, from: data) else {
            let reply = try? JSONDecoder().decode(ServerError.self, from: data)
            throw AuthError.server(
                reply?.error ?? "Signing in isn't working right now. Please try again.",
                retryAfter: reply?.retry_after
            )
        }
        return decoded
    }
}

enum AuthError: LocalizedError {
    case invalidMobile
    case missingName
    case notSignedIn
    case network
    case signInFailed
    /// The sign-in server's own message, and how long it asked to wait, if it did.
    case server(String, retryAfter: Int?)
    case other(String)

    var errorDescription: String? {
        switch self {
        case .invalidMobile:
            return "Enter a valid 10-digit mobile number."
        case .notSignedIn:
            return "Please sign in first."
        case .missingName:
            return "Please enter your name."
        case .network:
            return "No connection. Check your internet and try again."
        case .signInFailed:
            return "We couldn't sign you in. Ask for a new code and try again."
        case .server(let message, _):
            return message
        case .other(let message):
            return message
        }
    }

    /// Seconds the sign-in server asked to wait before the next code.
    var retryAfter: Int? {
        if case .server(_, let wait) = self { return wait }
        return nil
    }

    /// Firebase Auth error codes (FIRAuthErrorCode) mapped to plain language.
    static func from(firebase error: Error) -> AuthError {
        let nsError = error as NSError
        guard nsError.domain == AuthErrorDomain else {
            return .other(error.localizedDescription)
        }
        switch nsError.code {
        case 17000, 17002: return .signInFailed // invalid or mismatched custom token
        case 17004: return .other("Sign in with Apple didn't complete. Please try again.") // invalid credential
        case 17020: return .network
        case 17014: return .other("For your safety, confirm with a new code and try again.")
        default: return .other(error.localizedDescription)
        }
    }
}
