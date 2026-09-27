import SwiftUI
import AuthenticationServices

/// Full-screen log in / sign up, drawn with the brand's rider artwork. Shown
/// once when the app is first opened (with "Skip for now", so browsing never
/// needs an account) and whenever something needs the shopper signed in.
/// Closes itself once they are signed in with a delivery number.
struct AuthView: View {
    enum Mode: Hashable {
        case logIn
        case signUp
    }

    private enum Method {
        case phone
        case email
    }

    var initialMode: Mode = .logIn
    /// First launch: the corner reads "Skip for now" instead of a close button.
    var isWelcome = false
    var onClose: () -> Void

    @ObservedObject private var auth = AuthService.shared
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var mode: Mode = .logIn
    @State private var method: Method = .phone
    @State private var name = ""
    @State private var legalPage: LegalPage? = nil
    @State private var isFloating = false
    @Namespace private var modeNamespace

    private var isReady: Bool { auth.isAuthenticated && !auth.needsPhoneNumber }

    var body: some View {
        GeometryReader { geo in
            ScrollView {
                VStack(spacing: 0) {
                    hero(height: max(220, min(330, geo.size.height * 0.36)))
                    panel
                        .frame(minHeight: max(0, geo.size.height * 0.6 - 20), alignment: .top)
                }
            }
            .scrollBounceBehavior(.basedOnSize)
            .scrollDismissesKeyboard(.interactively)
        }
        .background(backdrop.ignoresSafeArea())
        .overlay(alignment: .topTrailing) { closeButton }
        .onAppear {
            mode = initialMode
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

    // MARK: - Hero

    /// Brand orange behind the artwork; the panel's colour at the very bottom,
    /// so it runs on under the home indicator.
    private var backdrop: some View {
        VStack(spacing: 0) {
            LinearGradient(
                colors: [Color(hex: 0xFF6A1A), Color(hex: 0xF24E00), Color(hex: 0xD63800)],
                startPoint: .top,
                endPoint: .bottom
            )
            Color.surfaceRaised
                .frame(height: 160)
        }
    }

    private func hero(height: CGFloat) -> some View {
        VStack(spacing: 10) {
            Image("BrandTile")
                .resizable()
                .scaledToFill()
                .frame(width: 58, height: 58)
                .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 17, style: .continuous).strokeBorder(Color.white, lineWidth: 2))
                .shadow(color: .black.opacity(0.25), radius: 10, x: 0, y: 6)
                .accessibilityHidden(true)

            Text(mode == .signUp ? "Create your account" : "Log in to DASHit")
                .font(.system(size: 26, weight: .black))
                .foregroundColor(.white)
                .contentTransition(.opacity)
            Text("Groceries at your door in minutes, across Anantnag.")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Color.white.opacity(0.85))
                .multilineTextAlignment(.center)

            ZStack {
                Image(mode == .signUp ? "AuthGroceries" : "AuthScooter")
                    .resizable()
                    .scaledToFit()
                    .id(mode)
                    .transition(.asymmetric(
                        insertion: .scale(scale: 0.85).combined(with: .opacity),
                        removal: .opacity
                    ))
            }
            .frame(maxWidth: .infinity)
            .frame(height: max(120, height - 150))
            // A slow bob, scoped to the artwork so nothing else inherits it.
            .offset(y: isFloating && !reduceMotion ? -6 : 4)
            .animation(reduceMotion ? nil : .easeInOut(duration: 2.4).repeatForever(autoreverses: true), value: isFloating)
            .shadow(color: .black.opacity(0.25), radius: 18, x: 0, y: 14)
            .accessibilityHidden(true)
        }
        .padding(.horizontal, 24)
        .padding(.top, 54)
        .padding(.bottom, 4)
        .frame(height: height + 60)
    }

    @ViewBuilder
    private var closeButton: some View {
        if isWelcome {
            Button {
                HapticsManager.shared.light()
                onClose()
            } label: {
                HStack(spacing: 4) {
                    Text("Skip for now")
                    Image(systemName: "chevron.right")
                        .font(.system(size: 11, weight: .bold))
                }
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.white)
                .padding(.horizontal, 14)
                .frame(height: 34)
                .background(Color.white.opacity(0.2), in: Capsule())
                .overlay(Capsule().strokeBorder(Color.white.opacity(0.3), lineWidth: 1))
            }
            .buttonStyle(.pressable)
            .padding(.trailing, 16)
            .padding(.top, 8)
        } else {
            Button {
                HapticsManager.shared.light()
                onClose()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 36, height: 36)
                    .background(Color.white.opacity(0.2), in: Circle())
                    .overlay(Circle().strokeBorder(Color.white.opacity(0.3), lineWidth: 1))
            }
            .buttonStyle(PressableButtonStyle(scale: 0.88))
            .padding(.trailing, 16)
            .padding(.top, 8)
            .accessibilityLabel("Close")
        }
    }

    // MARK: - Panel

    private var panel: some View {
        VStack(spacing: 16) {
            if auth.needsPhoneNumber {
                deliveryNumberStep
            } else {
                modeSwitch
                signInOptions
            }

            if let message = auth.errorMessage {
                Label(message, systemImage: "exclamationmark.circle.fill")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.danger)
                    .multilineTextAlignment(.center)
                    .transition(.opacity)
            }

            legalLine
        }
        .padding(.horizontal, 20)
        .padding(.top, 22)
        .padding(.bottom, 28)
        .frame(maxWidth: .infinity)
        .background(
            UnevenRoundedRectangle(topLeadingRadius: 32, topTrailingRadius: 32, style: .continuous)
                .fill(Color.surfaceRaised)
                .shadow(color: .black.opacity(0.2), radius: 24, x: 0, y: -8)
                .ignoresSafeArea(edges: .bottom)
        )
        .animation(.dashitSpring, value: mode)
        .animation(.dashitSpring, value: method)
        .animation(.dashitSpring, value: auth.errorMessage)
        .animation(.dashitSpring, value: auth.needsPhoneNumber)
    }

    /// Log in | Sign up, with the highlight sliding between them.
    private var modeSwitch: some View {
        HStack(spacing: 4) {
            ForEach([Mode.logIn, Mode.signUp], id: \.self) { option in
                let isSelected = mode == option
                Button {
                    guard !isSelected else { return }
                    HapticsManager.shared.selection()
                    auth.errorMessage = nil
                    withAnimation(.dashitSpring) { mode = option }
                } label: {
                    Text(option == .logIn ? "Log in" : "Sign up")
                        .font(.system(size: 15, weight: isSelected ? .bold : .semibold))
                        .foregroundColor(isSelected ? .textPrimary : .textMuted)
                        .frame(maxWidth: .infinity)
                        .frame(height: 40)
                        .background {
                            if isSelected {
                                Capsule()
                                    .fill(Color.surface)
                                    .shadow(color: .floatingShadow, radius: 4, x: 0, y: 2)
                                    .matchedGeometryEffect(id: "auth-mode", in: modeNamespace)
                            }
                        }
                        .contentShape(Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(isSelected ? .isSelected : [])
            }
        }
        .padding(4)
        .background(Color.surfaceMuted, in: Capsule())
    }

    @ViewBuilder
    private var signInOptions: some View {
        VStack(spacing: 14) {
            Group {
                switch method {
                case .phone:
                    VStack(spacing: 12) {
                        if mode == .signUp {
                            TextField("", text: $name, prompt: Text("Your name").foregroundColor(.textFaint))
                                .textContentType(.name)
                                .textInputAutocapitalization(.words)
                                .autocorrectionDisabled()
                                .font(.system(size: 16))
                                .foregroundColor(.textPrimary)
                                .tint(.brandOrange)
                                .padding(.horizontal, 14)
                                .frame(height: 52)
                                .background(Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                                .transition(.opacity.combined(with: .move(edge: .top)))
                        }
                        PhoneNumberConfirmationFlow(
                            title: "Mobile number",
                            confirmTitle: mode == .signUp ? "Create my account" : "Log in"
                        ) { mobile in
                            try await auth.signIn(withConfirmedMobile: mobile, name: mode == .signUp ? name : nil)
                        }
                    }
                case .email:
                    EmailSignInForm(isCreating: mode == .signUp)
                }
            }
            .transition(.opacity)

            HStack(spacing: 10) {
                Rectangle().fill(Color.hairline).frame(height: 1)
                Text("or")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.textFaint)
                Rectangle().fill(Color.hairline).frame(height: 1)
            }

            AppleSignInButton(label: mode == .signUp ? .signUp : .signIn)
                .id(mode)

            Button {
                HapticsManager.shared.selection()
                auth.errorMessage = nil
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
        }
    }

    /// Apple and email accounts can arrive without a phone; the rider needs one.
    private var deliveryNumberStep: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("One last thing")
                .font(.system(size: 20, weight: .heavy))
                .foregroundColor(.textPrimary)
            Text("Add the number your rider can call when they reach your door.")
                .font(.system(size: 14))
                .foregroundColor(.textMuted)
                .fixedSize(horizontal: false, vertical: true)
            PhoneNumberConfirmationFlow(
                title: "Mobile number",
                confirmTitle: "Save and continue",
                initialMobile: auth.currentUser?.mobile ?? ""
            ) { mobile in
                try await auth.updateMobile(mobile)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var legalLine: some View {
        VStack(spacing: 4) {
            Text("By continuing, you agree to our")
                .foregroundColor(.textMuted)
            HStack(spacing: 4) {
                Button("Terms & Conditions") { legalPage = .terms }
                    .foregroundColor(.brandAccent)
                Text("and")
                    .foregroundColor(.textMuted)
                Button("Privacy Policy") { legalPage = .privacy }
                    .foregroundColor(.brandAccent)
            }
        }
        .font(.system(size: 12, weight: .medium))
        .buttonStyle(.plain)
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
        .padding(.top, 2)
    }
}
