import SwiftUI
import AuthenticationServices

/// App Store Guideline 5.1.1(v) Compliant Account & Data Deletion
struct DeleteAccountView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var auth = AuthService.shared
    @State private var confirmationText = ""
    @State private var isDeleting = false
    @State private var errorMessage: String?
    @State private var appleNonce: String?
    @Environment(\.colorScheme) private var colorScheme
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface.ignoresSafeArea()
                
                VStack(alignment: .leading, spacing: 16) {
                    HStack(spacing: 12) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.danger)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Delete Account & Data")
                                .font(.dashitTitle)
                                .foregroundColor(.textPrimary)
                            Text("Permanent and irreversible action")
                                .font(.dashitCaption)
                                .foregroundColor(.textMuted)
                        }
                    }
                    .padding(.top, 16)
                    
                    Text("In compliance with Apple Privacy Guidelines, deleting your account will permanently purge your profile, address records, order receipts, and authentication identifiers from our servers.")
                        .font(.dashitBody)
                        .foregroundColor(.textMuted)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Type 'DELETE' to confirm:")
                            .font(.dashitCaptionBold)
                            .foregroundColor(.textPrimary)
                        
                        TextField("DELETE", text: $confirmationText)
                            .font(.dashitBody)
                            .foregroundColor(.textPrimary)
                            .padding(12)
                            .background(Color.surfaceMuted)
                            .cornerRadius(10)
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(Color.hairline, lineWidth: 1)
                            )
                    }
                    .padding(.top, 8)
                    
                    if let err = errorMessage {
                        Text(err)
                            .font(.dashitCaption)
                            .foregroundColor(.danger)
                    }
                    
                    Spacer()
                    
                    if auth.isAppleAccount {
                        // Apple requires the app to revoke its Apple ID tokens when
                        // the account goes, which needs one more Apple confirmation.
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Confirm with Apple to finish. This also removes DASHit's access to your Apple ID.")
                                .font(.dashitCaption)
                                .foregroundColor(.textMuted)
                            SignInWithAppleButton(.continue) { request in
                                let nonce = AppleNonce.random()
                                appleNonce = nonce
                                request.nonce = AppleNonce.sha256(nonce)
                            } onCompletion: { result in
                                handleAppleConfirmation(result)
                            }
                            .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
                            .frame(height: 50)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .disabled(confirmationText != "DELETE" || isDeleting)
                            .opacity(confirmationText == "DELETE" && !isDeleting ? 1 : 0.4)
                        }
                        .padding(.bottom, 16)
                    } else {
                        Button(action: {
                            Task {
                                isDeleting = true
                                do {
                                    try await auth.deleteAccount()
                                    dismiss()
                                } catch {
                                    isDeleting = false
                                    errorMessage = error.localizedDescription
                                }
                            }
                        }) {
                            HStack {
                                if isDeleting {
                                    ProgressView().tint(.white).padding(.trailing, 6)
                                }
                                Text(isDeleting ? "Purging Account..." : "Permanently Delete My Account")
                                    .font(.dashitBodyBold)
                                    .foregroundColor(.white)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(confirmationText == "DELETE" ? Color.danger : Color.gray.opacity(0.3))
                            .cornerRadius(12)
                        }
                        .disabled(confirmationText != "DELETE" || isDeleting)
                        .padding(.bottom, 16)
                    }
                }
                .padding(.horizontal, 20)
            }
            .navigationTitle("Delete Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.brandAccent)
                }
            }
        }
    }

    private func handleAppleConfirmation(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = credential.identityToken,
                  let idToken = String(data: tokenData, encoding: .utf8),
                  let codeData = credential.authorizationCode,
                  let code = String(data: codeData, encoding: .utf8),
                  let nonce = appleNonce else {
                errorMessage = "Apple didn't confirm the request. Please try again."
                return
            }
            Task {
                isDeleting = true
                do {
                    try await auth.deleteAppleAccount(idToken: idToken, rawNonce: nonce, authorizationCode: code)
                    dismiss()
                } catch {
                    isDeleting = false
                    errorMessage = error.localizedDescription
                }
            }
        case .failure(let error):
            if (error as? ASAuthorizationError)?.code != .canceled {
                errorMessage = "Apple didn't confirm the request. Please try again."
            }
        }
    }
}
