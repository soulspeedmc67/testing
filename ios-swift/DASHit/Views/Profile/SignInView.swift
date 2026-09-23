import SwiftUI
import UIKit
import Security
import AuthenticationServices
import CryptoKit

/// Signed-out state of the profile: phone (with an on-screen number
/// confirmation instead of a code), Sign in with Apple, and email.
struct SignInView: View {
    private enum Method {
        case phone
        case email
    }

    @ObservedObject private var auth = AuthService.shared
    @Environment(\.colorScheme) private var colorScheme
    @State private var method: Method = .phone
    @State private var appleNonce: String? = nil

    var body: some View {
        VStack(spacing: 18) {
            VStack(spacing: 6) {
                Image(systemName: "bolt.shield.fill")
                    .font(.system(size: 42))
                    .foregroundColor(.brandAccent)
                Text("Sign in to DASHit")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.textPrimary)
                Text("Groceries and daily essentials at your door in minutes.")
                    .font(.system(size: 14))
                    .foregroundColor(.textMuted)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, 8)

            Group {
                switch method {
                case .phone:
                    PhoneNumberConfirmationFlow(
                        title: "Your mobile number",
                        confirmTitle: "Confirm & continue"
                    ) { mobile in
                        try await auth.signIn(withConfirmedMobile: mobile)
                    }
                case .email:
                    EmailSignInForm()
                }
            }
            .transition(.opacity.combined(with: .move(edge: .bottom)))

            divider

            SignInWithAppleButton(.continue) { request in
                let nonce = AppleNonce.random()
                appleNonce = nonce
                request.requestedScopes = [.fullName, .email]
                request.nonce = AppleNonce.sha256(nonce)
            } onCompletion: { result in
                handleApple(result)
            }
            .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
            .frame(height: 50)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .id(colorScheme)

            Button {
                HapticsManager.shared.selection()
                withAnimation(.dashitSpring) {
                    method = method == .phone ? .email : .phone
                }
            } label: {
                Label(
                    method == .phone ? "Continue with email" : "Continue with phone number",
                    systemImage: method == .phone ? "envelope.fill" : "phone.fill"
                )
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.textPrimary)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.pressable)

            if let message = auth.errorMessage {
                Text(message)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.danger)
                    .multilineTextAlignment(.center)
                    .transition(.opacity)
            }
        }
        .padding(20)
        .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(Color.hairline, lineWidth: 1))
        .animation(.dashitSpring, value: auth.errorMessage)
    }

    private var divider: some View {
        HStack(spacing: 10) {
            Rectangle().fill(Color.hairline).frame(height: 1)
            Text("or")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.textFaint)
            Rectangle().fill(Color.hairline).frame(height: 1)
        }
    }

    private func handleApple(_ result: Result<ASAuthorization, Error>) {
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
                try? await auth.signInWithApple(
                    idToken: token,
                    rawNonce: nonce,
                    fullName: credential.fullName,
                    email: credential.email
                )
            }
        case .failure(let error):
            if (error as? ASAuthorizationError)?.code != .canceled {
                auth.errorMessage = "Sign in with Apple didn't complete. Please try again."
            }
        }
    }
}

// MARK: - Phone number with on-screen confirmation

/// Step 1: type the number. Step 2: "Is this your number?" with Edit and
/// Confirm. No code is sent or shown.
struct PhoneNumberConfirmationFlow: View {
    let title: String
    let confirmTitle: String
    var initialMobile: String = ""
    let onConfirm: (String) async throws -> Void

    @ObservedObject private var auth = AuthService.shared
    @State private var mobile = ""
    @State private var isConfirming = false
    @FocusState private var isFieldFocused: Bool

    init(
        title: String,
        confirmTitle: String,
        initialMobile: String = "",
        onConfirm: @escaping (String) async throws -> Void
    ) {
        self.title = title
        self.confirmTitle = confirmTitle
        self.initialMobile = initialMobile
        self.onConfirm = onConfirm
    }

    private var validMobile: String? { AuthService.normalizedMobile(mobile) }

    private var formattedMobile: String {
        guard let digits = validMobile else { return mobile }
        return "+91 \(digits.prefix(5)) \(digits.suffix(5))"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if !isConfirming {
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.textSecondary)
                HStack(spacing: 10) {
                    Text("+91")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.textMuted)
                    Rectangle()
                        .fill(Color.hairline)
                        .frame(width: 1, height: 22)
                    TextField("", text: $mobile, prompt: Text("10-digit mobile number").foregroundColor(.textFaint))
                        .keyboardType(.numberPad)
                        .textContentType(.telephoneNumber)
                        .font(.system(size: 17, weight: .medium, design: .rounded))
                        .foregroundColor(.textPrimary)
                        .tint(.brandOrange)
                        .focused($isFieldFocused)
                        .onChange(of: mobile) { _, value in
                            let digits = String(value.filter(\.isNumber).prefix(10))
                            if digits != value { mobile = digits }
                        }
                }
                .padding(.horizontal, 14)
                .frame(height: 52)
                .background(Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 14, style: .continuous))

                primaryButton("Continue", enabled: validMobile != nil) {
                    isFieldFocused = false
                    HapticsManager.shared.light()
                    withAnimation(.dashitSpring) { isConfirming = true }
                }
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Is this your number?")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.textSecondary)
                    HStack {
                        Text(formattedMobile)
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .foregroundColor(.textPrimary)
                        Spacer()
                        Button {
                            HapticsManager.shared.selection()
                            withAnimation(.dashitSpring) { isConfirming = false }
                            isFieldFocused = true
                        } label: {
                            Label("Edit", systemImage: "pencil")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.brandAccent)
                                .padding(.horizontal, 12)
                                .frame(height: 32)
                                .background(Color.surfaceMuted, in: Capsule())
                        }
                        .buttonStyle(.pressable)
                        .accessibilityLabel("Edit number")
                    }
                    Text("Your rider and our store will use this number to reach you about deliveries.")
                        .font(.system(size: 12))
                        .foregroundColor(.textMuted)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(14)
                .background(Color.surfaceMuted.opacity(0.6), in: RoundedRectangle(cornerRadius: 14, style: .continuous))

                primaryButton(confirmTitle, enabled: validMobile != nil && !auth.isAuthenticating) {
                    guard let digits = validMobile else { return }
                    Task {
                        try? await onConfirm(digits)
                    }
                }
            }
        }
        .animation(.dashitSpring, value: isConfirming)
        .onAppear {
            if mobile.isEmpty { mobile = initialMobile }
        }
    }

    private func primaryButton(_ title: String, enabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if auth.isAuthenticating {
                    ProgressView()
                        .tint(.white)
                }
                Text(title)
                    .font(.system(size: 16, weight: .bold))
            }
            .foregroundColor(enabled ? .white : .textFaint)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(enabled ? Color.brandOrange : Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.pressable)
        .disabled(!enabled)
    }
}

// MARK: - Email

/// Sign in or create an account with email and password, like the web.
/// New accounts also give their delivery number.
private struct EmailSignInForm: View {
    @ObservedObject private var auth = AuthService.shared
    @State private var isCreating = false
    @State private var email = ""
    @State private var password = ""
    @State private var name = ""
    @State private var mobile = ""

    private var canSubmit: Bool {
        guard !email.isEmpty, password.count >= 6, !auth.isAuthenticating else { return false }
        return isCreating ? AuthService.normalizedMobile(mobile) != nil : true
    }

    var body: some View {
        VStack(spacing: 10) {
            Picker("", selection: $isCreating) {
                Text("Sign in").tag(false)
                Text("Create account").tag(true)
            }
            .pickerStyle(.segmented)

            if isCreating {
                field("Your name", text: $name, content: .name)
            }
            field("Email", text: $email, content: .emailAddress, keyboard: .emailAddress)
            SecureField("", text: $password, prompt: Text("Password (6+ characters)").foregroundColor(.textFaint))
                .textContentType(isCreating ? .newPassword : .password)
                .modifier(FieldStyle())
            if isCreating {
                field("10-digit mobile for delivery", text: $mobile, content: .telephoneNumber, keyboard: .numberPad)
            }

            Button {
                Task {
                    if isCreating {
                        try? await auth.createAccount(email: email, password: password, name: name, mobile: mobile)
                    } else {
                        try? await auth.signIn(email: email, password: password)
                    }
                }
            } label: {
                HStack(spacing: 8) {
                    if auth.isAuthenticating {
                        ProgressView()
                            .tint(.white)
                    }
                    Text(isCreating ? "Create account" : "Sign in")
                        .font(.system(size: 16, weight: .bold))
                }
                .foregroundColor(canSubmit ? .white : .textFaint)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(canSubmit ? Color.brandOrange : Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.pressable)
            .disabled(!canSubmit)
        }
        .animation(.dashitSpring, value: isCreating)
    }

    private func field(_ placeholder: String, text: Binding<String>, content: UITextContentType, keyboard: UIKeyboardType = .default) -> some View {
        TextField("", text: text, prompt: Text(placeholder).foregroundColor(.textFaint))
            .keyboardType(keyboard)
            .textContentType(content)
            .textInputAutocapitalization(keyboard == .emailAddress ? .never : .words)
            .autocorrectionDisabled()
            .modifier(FieldStyle())
    }
}

private struct FieldStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .font(.system(size: 15))
            .foregroundColor(.textPrimary)
            .tint(.brandOrange)
            .padding(.horizontal, 14)
            .frame(height: 48)
            .background(Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

// MARK: - Sign in with Apple nonce

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
