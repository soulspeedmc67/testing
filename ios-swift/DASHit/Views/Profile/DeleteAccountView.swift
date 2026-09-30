import SwiftUI

/// App Store Guideline 5.1.1(v) Compliant Account & Data Deletion. After
/// typing DELETE, the shopper confirms with a code sent to their number on
/// WhatsApp: Firebase only deletes an account that signed in moments ago, and
/// the code keeps anyone else holding the phone from deleting it.
struct DeleteAccountView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var auth = AuthService.shared
    @State private var confirmationText = ""
    @State private var isDeleting = false
    @State private var errorMessage: String?
    @State private var code = ""
    @State private var isCodeSent = false
    @State private var resendAt = Date.distantPast

    private var mobile: String { auth.currentUser?.mobile ?? "" }
    private var isBusy: Bool { isDeleting || auth.isAuthenticating }
    private var canContinue: Bool {
        confirmationText == "DELETE" && (!isCodeSent || code.count == SignInCodeEntry.length)
    }

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
                            .disabled(isCodeSent)
                    }
                    .padding(.top, 8)

                    if isCodeSent {
                        SignInCodeEntry(
                            mobile: mobile,
                            code: $code,
                            resendAt: resendAt,
                            boxColor: .surfaceMuted,
                            onResend: sendCode,
                            // Deleting waits for the button, never the sixth digit.
                            onComplete: { _ in }
                        )
                        .transition(.opacity)
                    }

                    if let err = errorMessage ?? auth.errorMessage {
                        Text(err)
                            .font(.dashitCaption)
                            .foregroundColor(.danger)
                    }

                    Button(action: {
                        if isCodeSent { deleteAccount() } else { sendCode() }
                    }) {
                        HStack {
                            if isBusy {
                                ProgressView().tint(.white).padding(.trailing, 6)
                            }
                            Text(isDeleting ? "Deleting your account..."
                                 : isCodeSent ? "Permanently Delete My Account"
                                 : "Send code on WhatsApp")
                                .font(.dashitBodyBold)
                                .foregroundColor(.white)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(canContinue ? Color.danger : Color.gray.opacity(0.3))
                        .cornerRadius(12)
                    }
                    .disabled(!canContinue || isBusy)
                    .padding(.top, 8)
                    .padding(.bottom, 16)
                }
                .padding(.horizontal, 20)
                .animation(.dashitSpring, value: isCodeSent)
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

    private func sendCode() {
        errorMessage = nil
        Task {
            do {
                let wait = try await auth.sendCode(to: mobile)
                resendAt = Date().addingTimeInterval(TimeInterval(wait))
                code = ""
                isCodeSent = true
            } catch {
                // The server's message is on screen; keep the countdown honest.
                if let wait = (error as? AuthError)?.retryAfter {
                    resendAt = Date().addingTimeInterval(TimeInterval(wait))
                }
            }
        }
    }

    private func deleteAccount() {
        errorMessage = nil
        Task {
            do {
                // A fresh sign-in with the code is what lets Firebase delete.
                try await auth.signIn(mobile: mobile, code: code)
            } catch {
                code = "" // auth.errorMessage says why
                return
            }
            isDeleting = true
            do {
                try await auth.deleteAccount()
                dismiss()
            } catch {
                isDeleting = false
                errorMessage = error.localizedDescription
            }
        }
    }
}
