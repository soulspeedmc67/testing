import Foundation
import FirebaseAuth

/// Sign-in for the customer app, sharing Firebase Auth and `users/{uid}` with
/// the Android app. The shopper's Apple ID (Google on Android) is the account:
/// Firebase gives it a uid, and the profile, saved addresses and every order
/// are kept under that uid, so signing in on a new phone brings them back.
///
/// After signing in the shopper gives their mobile number once, so the rider
/// can call them. The number is only collected, not verified (no code is
/// sent), and can be changed any time. Each phone also registers a random
/// install id on the profile (`devices`), never a hardware identifier. Same
/// flow as Android (`AuthRepository.kt`).
///
/// Accounts made by the older number sign-in ("ph-91XXXXXXXXXX") keep working.
@MainActor
final class AuthService: ObservableObject {
    static let shared = AuthService()

    @Published var currentUser: UserProfile?
    @Published var isAuthenticated: Bool = false
    @Published var isAuthenticating: Bool = false
    @Published var errorMessage: String?

    private init() {
        checkCurrentSession()
    }

    /// Older accounts the number sign-in made.
    static func isNumberAccount(_ uid: String) -> Bool {
        uid.hasPrefix("ph-")
    }

    /// A shopper's account: an Apple ID, or an older number account. Staff
    /// sign in with email in the admin app, which builds this file too, and
    /// don't count.
    private static func isCustomerAccount(_ user: FirebaseAuth.User) -> Bool {
        isNumberAccount(user.uid) || user.providerData.contains { $0.providerID == "apple.com" }
    }

    /// The signed-in shopper's Firebase uid. Orders must carry exactly this as userId.
    var firebaseUID: String? {
        guard let user = Auth.auth().currentUser, Self.isCustomerAccount(user) else { return nil }
        return user.uid
    }

    /// Signed in, but the account has no name yet: the rider asks for it at the door.
    var needsName: Bool {
        isAuthenticated && (currentUser?.name?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
    }

    /// Signed in, but no number to call yet.
    var needsMobile: Bool {
        isAuthenticated && (currentUser?.mobile.isEmpty ?? true)
    }

    /// Signed in with everything an order needs: a number the rider can call and a name.
    var isReadyToOrder: Bool {
        isAuthenticated && !needsName && !needsMobile
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

    // MARK: - Apple

    /// Signs in with Apple and opens the account for that Apple ID, a new one
    /// the first time (no number yet: `needsMobile`).
    func signInWithApple(idToken: String, rawNonce: String, fullName: PersonNameComponents?) async throws {
        try await run {
            let credential = OAuthProvider.credential(withProviderID: "apple.com", idToken: idToken, rawNonce: rawNonce)
            let user = try await Auth.auth().signIn(with: credential).user
            // Apple shares the name only on the very first sign-in.
            let shared = fullName.map { PersonNameComponentsFormatter.localizedString(from: $0, style: .default) }
            let trimmed = shared?.trimmingCharacters(in: .whitespaces)
            let name = (trimmed?.isEmpty ?? true) ? nil : trimmed
            let profile = try await FirestoreService.shared.ensureUserProfile(
                uid: user.uid,
                mobile: "",
                name: name,
                email: user.email,
                provider: "apple",
                installID: Self.installID
            )
            self.finishSignIn(with: profile)
        }
    }

    /// A fresh Apple sign-in on the signed-in account, before it is deleted:
    /// Firebase only deletes an account that signed in moments ago.
    func confirmWithApple(idToken: String, rawNonce: String) async throws {
        try await run {
            let credential = OAuthProvider.credential(withProviderID: "apple.com", idToken: idToken, rawNonce: rawNonce)
            _ = try await Auth.auth().signIn(with: credential)
        }
    }

    /// Saves the number the rider can call (not verified), or changes it.
    func saveMobile(_ raw: String) async throws {
        guard let clean = Self.normalizedMobile(raw) else { throw fail(.invalidMobile) }
        guard let uid = firebaseUID, var profile = currentUser else { throw fail(.notSignedIn) }
        try await run {
            try await FirestoreService.shared.updateUserMobile(uid: uid, mobile: clean)
            profile.mobile = clean
            self.finishSignIn(with: profile)
        }
    }

    /// A random id for this install, kept on the phone; links the phone to the
    /// account without any hardware id.
    private static var installID: String {
        let key = "dashit.installID"
        if let saved = UserDefaults.standard.string(forKey: key) { return saved }
        let made = UUID().uuidString
        UserDefaults.standard.set(made, forKey: key)
        return made
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
        LocalStorage.shared.clearUserProfile()
        self.currentUser = nil
        self.isAuthenticated = false
        HapticsManager.shared.light()
    }

    /// Delete user account (App Store 5.1.1(v) Requirement). Call it straight
    /// after `confirmWithApple`: Firebase refuses to delete an account that
    /// signed in long ago.
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
}

enum AuthError: LocalizedError {
    case invalidMobile
    case missingName
    case notSignedIn
    case network
    case signInFailed
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
            return "We couldn't sign you in. Please try again."
        case .other(let message):
            return message
        }
    }

    /// Firebase Auth error codes (FIRAuthErrorCode) mapped to plain language.
    static func from(firebase error: Error) -> AuthError {
        let nsError = error as NSError
        guard nsError.domain == AuthErrorDomain else {
            return .other(error.localizedDescription)
        }
        switch nsError.code {
        case 17000, 17002: return .signInFailed
        case 17004: return .other("Sign in with Apple didn't complete. Please try again.") // invalid credential
        case 17020: return .network
        case 17014: return .other("For your safety, confirm with Apple again and try once more.")
        default: return .other(error.localizedDescription)
        }
    }
}
