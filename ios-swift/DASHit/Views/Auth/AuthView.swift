import SwiftUI
import AuthenticationServices

/// Log in or sign up, kept plain: the scooter rider on a deep brand gradient,
/// one headline, and a phone number with a Continue button. Sign in with
/// Apple and email sit below. Same screen as Android's AuthScreen and the web
/// login. Opened from "Sign up" it also asks for a name.
///
/// Shown once when the app is first opened (with "Skip", so browsing never
/// needs an account) and whenever something needs the shopper signed in.
/// Closes itself once they are signed in with a delivery number.
struct AuthView: View {
    enum Mode: Hashable {
        case logIn
        case signUp
    }

    private static let heroTop = Color(hex: 0x0D2F6E)
    private static let heroBottom = Color(hex: 0x040F24)
    private static let buttonGradient = LinearGradient(
        colors: [Color(hex: 0xFF7A1A), Color(hex: 0xFF4D00)],
        startPoint: .leading,
        endPoint: .trailing
    )

    var initialMode: Mode = .logIn
    /// First launch: the corner reads "Skip" instead of a close button.
    var isWelcome = false
    var onClose: () -> Void

    @ObservedObject private var auth = AuthService.shared
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var name = ""
    @State private var mobile = ""
    @State private var isConfirming = false
    @State private var usesEmail = false
    @State private var emailCreatesAccount = false
    @State private var legalPage: LegalPage? = nil
    @State private var isFloating = false
    @FocusState private var isMobileFocused: Bool

    private var isSignUp: Bool { initialMode == .signUp }
    private var isReady: Bool { auth.isReadyToOrder }
    private var trimmedName: String { name.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var validMobile: String? { AuthService.normalizedMobile(mobile) }

    var body: some View {
        GeometryReader { geo in
            ScrollView {
                VStack(spacing: 0) {
                    topBar
                    hero(artHeight: max(170, min(280, geo.size.height * 0.3)))
                    panel
                }
            }
            .scrollBounceBehavior(.basedOnSize)
            .scrollDismissesKeyboard(.interactively)
        }
        .background(backdrop.ignoresSafeArea())
        .onAppear {
            emailCreatesAccount = isSignUp
            auth.errorMessage = nil
            isFloating = true
        }
        .onChange(of: isReady) { _, ready in
            if ready { onClose() }
        }
        .sheet(item: $legalPage) { page in
            SafariView(url: page.url)
                .ignoresSafeArea()
        }
    }

    // MARK: - Backdrop and hero

    /// Deep blue into midnight, a warm light rising behind the rider and a
    /// faint one in the top corner. The panel's colour sits behind the bottom
    /// of the screen so it runs on under the home indicator.
    private var backdrop: some View {
        GeometryReader { geo in
            ZStack(alignment: .bottom) {
                LinearGradient(colors: [Self.heroTop, Color.midnight, Self.heroBottom], startPoint: .top, endPoint: .bottom)
                RadialGradient(
                    colors: [Color.brandOrange.opacity(0.42), Color.brandOrange.opacity(0)],
                    center: UnitPoint(x: 0.5, y: min(0.5, (geo.size.height * 0.3 + 90) / max(geo.size.height, 1))),
                    startRadius: 0,
                    endRadius: geo.size.width * 0.75
                )
                RadialGradient(
                    colors: [Color.brandOrange.opacity(0.14), Color.brandOrange.opacity(0)],
                    center: .topTrailing,
                    startRadius: 0,
                    endRadius: geo.size.width * 0.8
                )
                Color.surfaceRaised
                    .frame(height: geo.size.height * 0.3)
            }
        }
    }

    private var topBar: some View {
        HStack {
            Image("SplashLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 30, height: 30)
                .accessibilityLabel("DASHit")
            Spacer()
            Button {
                HapticsManager.shared.light()
                onClose()
            } label: {
                Group {
                    if isWelcome {
                        Text("Skip")
                            .font(.system(size: 16, weight: .semibold))
                    } else {
                        Image(systemName: "xmark")
                            .font(.system(size: 18, weight: .semibold))
                    }
                }
                .foregroundColor(Color.white.opacity(0.85))
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(PressableButtonStyle(scale: 0.9))
            .accessibilityLabel(isWelcome ? "Skip for now" : "Close")
        }
        .padding(.leading, 20)
        .padding(.trailing, 10)
        .padding(.top, 4)
    }

    private func hero(artHeight: CGFloat) -> some View {
        VStack(spacing: 0) {
            Image("AuthScooter")
                .resizable()
                .scaledToFit()
                .frame(height: artHeight)
                .frame(maxWidth: .infinity)
                .offset(y: isFloating && !reduceMotion ? -5 : 3)
                .animation(reduceMotion ? nil : .easeInOut(duration: 2.8).repeatForever(autoreverses: true), value: isFloating)
                .padding(.top, 8)
                .accessibilityHidden(true)

            Text("Groceries delivered\nin minutes")
                .font(.system(size: 30, weight: .black))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .padding(.top, 22)
            Text("Anantnag's everyday essentials, at your door.")
                .font(.system(size: 15))
                .foregroundColor(Color.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .padding(.top, 8)
                .padding(.bottom, 28)
        }
        .padding(.horizontal, 24)
    }

    // MARK: - Panel

    private var panel: some View {
        VStack(spacing: 16) {
            if auth.needsPhoneNumber {
                sectionTitle("Add your delivery number")
                phoneStep(confirmTitle: "Yes, save it") { try await auth.updateMobile($0) }
            } else if auth.needsName {
                sectionTitle("What's your name?")
                nameStep
            } else if usesEmail {
                sectionTitle(emailCreatesAccount ? "Create your account" : "Log in with email")
                EmailSignInForm(isCreating: emailCreatesAccount)
                Button(emailCreatesAccount ? "Have an account? Log in" : "New to DASHit? Create an account") {
                    HapticsManager.shared.selection()
                    withAnimation(.dashitSpring) { emailCreatesAccount.toggle() }
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.textSecondary)
            } else {
                sectionTitle(isSignUp ? "Create your account" : "Log in or sign up")
                phoneStep(confirmTitle: isSignUp ? "Yes, create my account" : "Yes, continue") { digits in
                    try await auth.signIn(withConfirmedMobile: digits, name: isSignUp ? trimmedName : nil)
                }
            }

            if let message = auth.errorMessage {
                Text(message)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.danger)
                    .multilineTextAlignment(.center)
                    .transition(.opacity)
            }

            if !auth.isAuthenticated && !isConfirming {
                otherOptions
            }

            legalLine
        }
        .padding(.horizontal, 24)
        .padding(.top, 26)
        .padding(.bottom, 28)
        .frame(maxWidth: .infinity)
        .background(
            UnevenRoundedRectangle(topLeadingRadius: 28, topTrailingRadius: 28, style: .continuous)
                .fill(Color.surfaceRaised)
                .ignoresSafeArea(edges: .bottom)
        )
        .animation(.dashitSpring, value: isConfirming)
        .animation(.dashitSpring, value: usesEmail)
        .animation(.dashitSpring, value: auth.errorMessage)
        .animation(.dashitSpring, value: auth.needsPhoneNumber)
        .animation(.dashitSpring, value: auth.needsName)
    }

    /// Phone and email accounts must have a name: the rider asks for it at the door.
    private var nameStep: some View {
        VStack(spacing: 12) {
            TextField("", text: $name, prompt: Text("Your name").foregroundColor(.textFaint))
                .textContentType(.name)
                .textInputAutocapitalization(.words)
                .autocorrectionDisabled()
                .submitLabel(.done)
                .modifier(AuthFieldStyle())
            primaryButton("Save and continue", enabled: !trimmedName.isEmpty && !auth.isAuthenticating) {
                HapticsManager.shared.light()
                Task { try? await auth.updateName(trimmedName) }
            }
        }
    }

    /// "——  Log in or sign up  ——"
    private func sectionTitle(_ text: String) -> some View {
        HStack(spacing: 12) {
            Rectangle().fill(Color.hairline).frame(height: 1)
            Text(text)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.textSecondary)
                .fixedSize()
            Rectangle().fill(Color.hairline).frame(height: 1)
        }
    }

    /// Number, then "We'll use +91 … Is that right?" (no code is sent: the
    /// Spark plan has no SMS; the confirmed number goes on the order).
    @ViewBuilder
    private func phoneStep(confirmTitle: String, onConfirm: @escaping (String) async throws -> Void) -> some View {
        VStack(spacing: 12) {
            if !isConfirming {
                if isSignUp && !auth.isAuthenticated {
                    TextField("", text: $name, prompt: Text("Your name").foregroundColor(.textFaint))
                        .textContentType(.name)
                        .textInputAutocapitalization(.words)
                        .autocorrectionDisabled()
                        .modifier(AuthFieldStyle())
                }
                HStack(spacing: 12) {
                    Text("+91")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(.textPrimary)
                    Rectangle()
                        .fill(Color.hairlineStrong)
                        .frame(width: 1, height: 24)
                    TextField("", text: $mobile, prompt: Text("Enter mobile number").foregroundColor(.textFaint))
                        .keyboardType(.numberPad)
                        .textContentType(.telephoneNumber)
                        .focused($isMobileFocused)
                        .onChange(of: mobile) { _, value in
                            let digits = String(value.filter(\.isNumber).prefix(10))
                            if digits != value { mobile = digits }
                        }
                }
                .modifier(AuthFieldStyle())

                // Signing up needs a name as well as the number.
                primaryButton("Continue", enabled: validMobile != nil && (!isSignUp || auth.isAuthenticated || !trimmedName.isEmpty)) {
                    isMobileFocused = false
                    HapticsManager.shared.light()
                    withAnimation(.dashitSpring) { isConfirming = true }
                }
            } else {
                (Text("We'll use ")
                    + Text(formattedMobile).foregroundColor(.textPrimary).bold()
                    + Text(" for your deliveries. Is that right?"))
                    .font(.system(size: 15))
                    .foregroundColor(.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .fixedSize(horizontal: false, vertical: true)

                primaryButton(confirmTitle, enabled: validMobile != nil && !auth.isAuthenticating) {
                    guard let digits = validMobile else { return }
                    Task { try? await onConfirm(digits) }
                }

                Button("Change number") {
                    HapticsManager.shared.light()
                    withAnimation(.dashitSpring) { isConfirming = false }
                    isMobileFocused = true
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.textSecondary)
                .disabled(auth.isAuthenticating)
                .padding(.vertical, 4)
            }
        }
    }

    private var formattedMobile: String {
        guard let digits = validMobile else { return mobile }
        return "+91 \(digits.prefix(5)) \(digits.suffix(5))"
    }

    /// Apple, and email or phone, under a plain "or".
    private var otherOptions: some View {
        VStack(spacing: 12) {
            HStack(spacing: 10) {
                Rectangle().fill(Color.hairline).frame(height: 1)
                Text("or")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.textFaint)
                Rectangle().fill(Color.hairline).frame(height: 1)
            }
            AppleSignInButton(label: isSignUp ? .signUp : .continue)
            Button(usesEmail ? "Continue with phone number" : "Continue with email") {
                HapticsManager.shared.selection()
                auth.errorMessage = nil
                withAnimation(.dashitSpring) { usesEmail.toggle() }
            }
            .font(.system(size: 15, weight: .semibold))
            .foregroundColor(.textPrimary)
            .padding(.vertical, 6)
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
                    .font(.system(size: 17, weight: .bold))
            }
            .foregroundColor(enabled ? .white : .textMuted)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(enabled ? AnyShapeStyle(Self.buttonGradient) : AnyShapeStyle(Color.surfaceMuted))
            }
        }
        .buttonStyle(.pressable)
        .disabled(!enabled)
    }

    /// Built by hand: markdown links with interpolated URLs are not parsed.
    private var legalText: AttributedString {
        var terms = AttributedString("Terms")
        terms.link = SupportContact.termsURL
        terms.underlineStyle = .single
        var privacy = AttributedString("Privacy Policy")
        privacy.link = SupportContact.privacyURL
        privacy.underlineStyle = .single
        return AttributedString("By continuing, you agree to our ") + terms
            + AttributedString(" and ") + privacy + AttributedString(".")
    }

    private var legalLine: some View {
        Text(legalText)
            .font(.system(size: 12))
            .foregroundColor(.textMuted)
            .tint(.textSecondary)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            // Links open in the in-app browser rather than leaving DASHit.
            .environment(\.openURL, OpenURLAction { url in
                legalPage = url == SupportContact.privacyURL ? .privacy : .terms
                return .handled
            })
    }
}

private struct AuthFieldStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .font(.system(size: 17, weight: .medium))
            .foregroundColor(.textPrimary)
            .tint(.brandOrange)
            .padding(.horizontal, 16)
            .frame(height: 56)
            .background(Color.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Color.hairlineStrong, lineWidth: 1))
    }
}
