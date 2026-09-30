import SwiftUI
import Security
import AuthenticationServices
import CryptoKit

/// "Continue with Apple" on the sign-in screen. Hands the credential to
/// AuthService; a cancelled sheet is not an error.
struct AppleSignInButton: View {
    var label: SignInWithAppleButton.Label = .continue

    @ObservedObject private var auth = AuthService.shared
    @Environment(\.colorScheme) private var colorScheme
    @State private var appleNonce: String? = nil

    var body: some View {
        SignInWithAppleButton(label) { request in
            let nonce = AppleNonce.random()
            appleNonce = nonce
            request.requestedScopes = [.fullName]
            request.nonce = AppleNonce.sha256(nonce)
        } onCompletion: { result in
            switch result {
            case .success(let authorization):
                guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                      let tokenData = credential.identityToken,
                      let token = String(data: tokenData, encoding: .utf8),
                      let nonce = appleNonce else {
                    auth.errorMessage = "Apple didn't return a sign-in token. Please try again."
                    return
                }
                Task {
                    try? await auth.signInWithApple(idToken: token, rawNonce: nonce, fullName: credential.fullName)
                }
            case .failure(let error):
                if (error as? ASAuthorizationError)?.code != .canceled {
                    auth.errorMessage = "Sign in with Apple didn't complete. Please try again."
                }
            }
        }
        .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
        .frame(height: 56)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .disabled(auth.isAuthenticating)
        // The button's style is fixed when it's made; rebuild it on theme change.
        .id(colorScheme)
    }
}

/// One more Apple confirmation before an account with an Apple ID is deleted:
/// its authorization code lets DASHit revoke its Apple tokens (App Store
/// 5.1.1(v)). Hands the code back; a cancelled sheet is not an error.
struct AppleRevokeButton: View {
    let onCode: (String) -> Void
    let onError: (String) -> Void

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        SignInWithAppleButton(.continue) { request in
            request.requestedScopes = []
        } onCompletion: { result in
            switch result {
            case .success(let authorization):
                guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                      let codeData = credential.authorizationCode,
                      let code = String(data: codeData, encoding: .utf8) else {
                    onError("Apple didn't confirm the request. Please try again.")
                    return
                }
                onCode(code)
            case .failure(let error):
                if (error as? ASAuthorizationError)?.code != .canceled {
                    onError("Apple didn't confirm the request. Please try again.")
                }
            }
        }
        .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
        .frame(height: 50)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .id(colorScheme)
    }
}

enum AppleNonce {
    /// A random nonce; its SHA-256 goes to Apple, the raw value to Firebase.
    static func random(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var bytes = [UInt8](repeating: 0, count: length)
        if SecRandomCopyBytes(kSecRandomDefault, length, &bytes) != errSecSuccess {
            return UUID().uuidString + UUID().uuidString
        }
        return String(bytes.map { charset[Int($0) % charset.count] })
    }

    static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}
