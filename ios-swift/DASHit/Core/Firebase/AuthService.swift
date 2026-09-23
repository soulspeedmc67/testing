import Foundation
import FirebaseAuth

/// Authentication service replicating DASHit zero-cost Spark tier anonymous auth state machine
@MainActor
final class AuthService: ObservableObject {
    static let shared = AuthService()
    
    @Published var currentUser: UserProfile?
    @Published var isAuthenticated: Bool = false
    @Published var isAuthenticating: Bool = false
    @Published var errorMessage: String?
    
    // In-memory verification codes: [Mobile: (Code, ExpirationTimestamp, AttemptsLeft)]
    private var activeCodes: [String: (code: String, expiresAt: Date, attempts: Int)] = [:]
    
    private init() {
        checkCurrentSession()
    }
    
    /// The signed-in Firebase uid. Orders must carry exactly this as userId.
    var firebaseUID: String? {
        Auth.auth().currentUser?.uid
    }
    
    func checkCurrentSession() {
        if let user = Auth.auth().currentUser,
           let cachedProfile = LocalStorage.shared.loadUserProfile() {
            self.currentUser = cachedProfile
            self.isAuthenticated = true
        } else {
            self.isAuthenticated = false
            self.currentUser = nil
        }
    }
    
    /// Issue 4-digit verification code with 5-minute TTL
    func requestVerificationCode(mobile: String) -> String {
        let cleanMobile = mobile.filter { $0.isNumber }
        let code = String(format: "%04d", Int.random(in: 1000...9999))
        let expiresAt = Date().addingTimeInterval(300) // 5 minutes
        
        activeCodes[cleanMobile] = (code: code, expiresAt: expiresAt, attempts: 5)
        
        #if DEBUG
        print("⚡️ [DASHit Auth] Generated verification code for \(cleanMobile): \(code)")
        #endif
        
        return code
    }
    
    /// Verify 4-digit code and authenticate anonymously via Firebase
    func verifyCodeAndSignIn(mobile: String, enteredCode: String, name: String? = nil) async throws -> UserProfile {
        let cleanMobile = mobile.filter { $0.isNumber }
        
        guard let entry = activeCodes[cleanMobile] else {
            throw AuthError.codeExpiredOrNotFound
        }
        
        guard Date() < entry.expiresAt else {
            activeCodes.removeValue(forKey: cleanMobile)
            throw AuthError.codeExpired
        }
        
        guard entry.attempts > 0 else {
            activeCodes.removeValue(forKey: cleanMobile)
            throw AuthError.maxAttemptsExceeded
        }
        
        guard entry.code == enteredCode.trimmingCharacters(in: .whitespacesAndNewlines) else {
            activeCodes[cleanMobile] = (code: entry.code, expiresAt: entry.expiresAt, attempts: entry.attempts - 1)
            throw AuthError.incorrectCode
        }
        
        // Code verified, clear state
        activeCodes.removeValue(forKey: cleanMobile)
        isAuthenticating = true
        defer { isAuthenticating = false }
        
        // Sign in anonymously to acquire valid request.auth.uid for Firestore rules
        let authResult = try await Auth.auth().signInAnonymously()
        let uid = authResult.user.uid
        
        // Ensure user profile in Firestore
        let profile = try await FirestoreService.shared.ensureUserProfile(
            uid: uid,
            mobile: cleanMobile,
            name: name
        )
        
        // Save local session
        LocalStorage.shared.saveUserProfile(profile)
        self.currentUser = profile
        self.isAuthenticated = true
        
        HapticsManager.shared.success()
        return profile
    }
    
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
}

enum AuthError: LocalizedError {
    case codeExpiredOrNotFound
    case codeExpired
    case maxAttemptsExceeded
    case incorrectCode
    
    var errorDescription: String? {
        switch self {
        case .codeExpiredOrNotFound:
            return "No verification code requested or expired. Please request a new code."
        case .codeExpired:
            return "Verification code has expired. Please try again."
        case .maxAttemptsExceeded:
            return "Too many incorrect attempts. Please request a new code."
        case .incorrectCode:
            return "Incorrect verification code. Please check and try again."
        }
    }
}
