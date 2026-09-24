import Foundation
import FirebaseAuth

/// Sign-in for the customer app, sharing Firebase Auth and `users/{uid}` with
/// the web app (`src/lib/auth.js`):
/// - Phone: the shopper confirms their number and gets an anonymous Firebase
///   session (the Spark plan has no SMS), exactly as the web does.
/// - Email: the web's email + password accounts, with email verification.
/// - Apple: Sign in with Apple, exchanged for a Firebase credential.
/// Every path ends with a profile that has a delivery phone number.
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

    /// The signed-in Firebase uid. Orders must carry exactly this as userId.
    var firebaseUID: String? {
        Auth.auth().currentUser?.uid
    }

    /// Signed in with Apple or email but no delivery number yet.
    var needsPhoneNumber: Bool {
        isAuthenticated && (currentUser?.mobile.isEmpty ?? true)
    }

    func checkCurrentSession() {
        if Auth.auth().currentUser != nil, let cachedProfile = LocalStorage.shared.loadUserProfile() {
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

    /// Signs in with a number the shopper has confirmed on screen.
    func signIn(withConfirmedMobile mobile: String) async throws {
        guard let clean = Self.normalizedMobile(mobile) else { throw AuthError.invalidMobile }
        try await run {
            let uid: String
            if let existing = Auth.auth().currentUser {
                uid = existing.uid
            } else {
                uid = try await Auth.auth().signInAnonymously().user.uid
            }
            let profile = try await FirestoreService.shared.ensureUserProfile(uid: uid, mobile: clean)
            if profile.mobile != clean {
                try await FirestoreService.shared.updateUserMobile(uid: uid, mobile: clean)
            }
            var updated = profile
            updated.mobile = clean
            self.finishSignIn(with: updated)
        }
    }

    /// Adds or changes the delivery number on an existing account.
    func updateMobile(_ mobile: String) async throws {
        guard let clean = Self.normalizedMobile(mobile) else { throw AuthError.invalidMobile }
        guard let uid = firebaseUID, var profile = currentUser else { throw AuthError.notSignedIn }
        try await run {
            try await FirestoreService.shared.updateUserMobile(uid: uid, mobile: clean)
            profile.mobile = clean
            self.finishSignIn(with: profile)
        }
    }

    // MARK: - Email

    func signIn(email: String, password: String) async throws {
        let cleanEmail = email.trimmingCharacters(in: .whitespaces).lowercased()
        guard !cleanEmail.isEmpty, !password.isEmpty else { throw AuthError.missingCredentials }
        try await run {
            let user = try await Auth.auth().signIn(withEmail: cleanEmail, password: password).user
            let profile = try await FirestoreService.shared.ensureUserProfile(
                uid: user.uid,
                mobile: "",
                name: user.displayName ?? String(cleanEmail.split(separator: "@").first ?? ""),
                email: cleanEmail
            )
            self.finishSignIn(with: profile)
        }
    }

    func createAccount(email: String, password: String, name: String, mobile: String) async throws {
        let cleanEmail = email.trimmingCharacters(in: .whitespaces).lowercased()
        guard !cleanEmail.isEmpty, !password.isEmpty else { throw AuthError.missingCredentials }
        guard password.count >= 6 else { throw AuthError.weakPassword }
        guard let cleanMobile = Self.normalizedMobile(mobile) else { throw AuthError.invalidMobile }
        try await run {
            let user = try await Auth.auth().createUser(withEmail: cleanEmail, password: password).user
            // Same as the web: a verification mail goes out, but the account
            // works straight away.
            try? await user.sendEmailVerification()
            let trimmedName = name.trimmingCharacters(in: .whitespaces)
            let profile = try await FirestoreService.shared.ensureUserProfile(
                uid: user.uid,
                mobile: cleanMobile,
                name: trimmedName.isEmpty ? String(cleanEmail.split(separator: "@").first ?? "") : trimmedName,
                email: cleanEmail
            )
            self.finishSignIn(with: profile)
        }
    }

    // MARK: - Apple

    func signInWithApple(idToken: String, rawNonce: String, fullName: PersonNameComponents?, email: String?) async throws {
        try await run {
            let credential = OAuthProvider.credential(withProviderID: "apple.com", idToken: idToken, rawNonce: rawNonce)
            let user = try await Auth.auth().signIn(with: credential).user
            // Apple shares the name and email only on the very first sign-in.
            let name = fullName.map { PersonNameComponentsFormatter.localizedString(from: $0, style: .default) }
            let profile = try await FirestoreService.shared.ensureUserProfile(
                uid: user.uid,
                mobile: "",
                name: (name?.isEmpty ?? true) ? user.displayName : name,
                email: email ?? user.email
            )
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

    /// Delete user account (App Store 5.1.1(v) Requirement)
    func deleteAccount() async throws {
        guard let user = Auth.auth().currentUser else { return }
        let uid = user.uid

        // 1. Delete Firestore profile
        try await FirestoreService.shared.deleteUserData(uid: uid)

        // 2. Delete Firebase Auth user
        try await user.delete()

        // 3. Purge all local data
        LocalStorage.shared.clearAll()
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

    /// Runs a sign-in step with the spinner on, turning Firebase errors into
    /// the same plain messages the web shows.
    private func run(_ work: () async throws -> Void) async throws {
        isAuthenticating = true
        errorMessage = nil
        defer { isAuthenticating = false }
        do {
            try await work()
        } catch let error as AuthError {
            errorMessage = error.errorDescription
            HapticsManager.shared.warning()
            throw error
        } catch {
            let friendly = AuthError.from(firebase: error)
            errorMessage = friendly.errorDescription
            HapticsManager.shared.warning()
            throw friendly
        }
    }
}

enum AuthError: LocalizedError {
    case invalidMobile
    case missingCredentials
    case weakPassword
    case notSignedIn
    case wrongCredentials
    case invalidEmail
    case emailInUse
    case providerDisabled
    case network
    case other(String)

    var errorDescription: String? {
        switch self {
        case .invalidMobile:
            return "Enter a valid 10-digit mobile number."
        case .missingCredentials:
            return "Please enter both your email and password."
        case .weakPassword:
            return "Password must be at least 6 characters."
        case .notSignedIn:
            return "Please sign in first."
        case .wrongCredentials:
            return "Invalid email or password. Please check and try again."
        case .invalidEmail:
            return "Please enter a valid email address."
        case .emailInUse:
            return "An account with this email already exists. Try signing in instead."
        case .providerDisabled:
            return "This sign-in option isn't switched on for DASHit yet. Please use another one."
        case .network:
            return "No connection. Check your internet and try again."
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
        case 17004, 17009, 17011: return .wrongCredentials
        case 17008: return .invalidEmail
        case 17007: return .emailInUse
        case 17026: return .weakPassword
        case 17006: return .providerDisabled
        case 17020: return .network
        default: return .other(error.localizedDescription)
        }
    }
}
