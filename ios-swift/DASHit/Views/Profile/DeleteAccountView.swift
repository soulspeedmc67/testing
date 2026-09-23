import SwiftUI

/// App Store Guideline 5.1.1(v) Compliant Account & Data Deletion
struct DeleteAccountView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var auth = AuthService.shared
    @State private var confirmationText = ""
    @State private var isDeleting = false
    @State private var errorMessage: String?
    
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
}
