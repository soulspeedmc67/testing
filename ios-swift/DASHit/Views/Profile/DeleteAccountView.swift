import SwiftUI

/// App Store Guideline 5.1.1(v) Compliant Account & Data Deletion. After
/// typing DELETE, the shopper signs in with Apple once more: Firebase only
/// deletes an account that signed in moments ago, it keeps anyone else holding
/// the phone from deleting it, and it lets DASHit revoke its Apple tokens, as
/// Apple requires.
struct DeleteAccountView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var auth = AuthService.shared
    @State private var confirmationText = ""
    @State private var isDeleting = false
    @State private var errorMessage: String?

    private var isBusy: Bool { isDeleting || auth.isAuthenticating }
    private var isConfirmed: Bool { confirmationText == "DELETE" }

    var body: some View {
        NavigationStack {
            ScrollView {
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

                    if isConfirmed {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Sign in with Apple once more to finish. This also removes DASHit's access to your Apple ID.")
                                .font(.dashitCaption)
                                .foregroundColor(.textMuted)
                            AppleRevokeButton(
                                onConfirmed: { token, nonce, code in
                                    Task {
                                        isDeleting = true
                                        errorMessage = nil
                                        do {
                                            try await auth.confirmWithApple(idToken: token, rawNonce: nonce)
                                        } catch {
                                            isDeleting = false
                                            return // auth.errorMessage says why
                                        }
                                        await auth.revokeApple(authorizationCode: code)
                                        await finishDeleting()
                                    }
                                },
                                onError: { errorMessage = $0 }
                            )
                            .disabled(isBusy)
                        }
                        .padding(.top, 8)
                        .transition(.opacity)
                    }

                    if let err = errorMessage ?? auth.errorMessage {
                        Text(err)
                            .font(.dashitCaption)
                            .foregroundColor(.danger)
                    }

                    if isDeleting {
                        HStack(spacing: 8) {
                            ProgressView()
                            Text("Deleting your account...")
                                .font(.dashitBodyBold)
                                .foregroundColor(.textPrimary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                    }
                }
                .padding(.horizontal, 20)
                .animation(.dashitSpring, value: isConfirmed)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Color.surface.ignoresSafeArea())
            .navigationTitle("Delete Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.brandAccent)
                }
            }
            .onAppear { auth.errorMessage = nil }
        }
    }

    private func finishDeleting() async {
        do {
            try await auth.deleteAccount()
            dismiss()
        } catch {
            isDeleting = false
            errorMessage = error.localizedDescription
        }
    }
}
