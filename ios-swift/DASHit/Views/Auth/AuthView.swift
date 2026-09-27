import SwiftUI
import AuthenticationServices

/// Full-screen log in / sign up. The splash's midnight carries on behind the
/// brand artwork, which turns slowly with a caption for each picture, above a
/// clean form panel. Same screen as Android's AuthScreen and the web login.
///
/// Shown once when the app is first opened (with "Skip", so browsing never
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

    private struct Slide {
        let art: String
        let title: String
        let subtitle: String
    }

    private static let slides = [
        Slide(art: "AuthScooter", title: "Groceries at your door, in minutes", subtitle: "From our Anantnag store to your street."),
        Slide(art: "AuthGroceries", title: "Fresh picks, carefully packed", subtitle: "Dairy, fruit, staples, snacks and more."),
        Slide(art: "AuthFlyingBox", title: "Follow every order, live", subtitle: "Watch your rider right up to your door."),
    ]

    private static let midnightDeep = Color(hex: 0x040F24)

    var initialMode: Mode = .logIn
    /// First launch: the corner reads "Skip" instead of a close button.
    var isWelcome = false
    var onClose: () -> Void

    @ObservedObject private var auth = AuthService.shared
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var mode: Mode = .logIn
    @State private var method: Method = .phone
    @State private var name = ""
    @State private var page = 0
    @State private var legalPage: LegalPage? = nil
    @State private var isFloating = false
    @Namespace private var modeNamespace

    private var isReady: Bool { auth.isAuthenticated && !auth.needsPhoneNumber }

    var body: some View {
        GeometryReader { geo in
            ScrollView {
                VStack(spacing: 0) {
                    topBar
                    carousel(artHeight: max(150, min(230, geo.size.height * 0.24)))
                    caption
                    pageDots
                    trustRow
                    panel
                }
            }
            .scrollBounceBehavior(.basedOnSize)
            .scrollDismissesKeyboard(.interactively)
        }
        .background(backdrop.ignoresSafeArea())
        .onAppear {
            mode = initialMode
            auth.errorMessage = nil
            isFloating = true
        }
        // The pictures turn on their own until the shopper starts typing.
        .task(id: name.isEmpty) {
            guard !reduceMotion else { return }
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(4.2))
                guard !Task.isCancelled, name.isEmpty, !auth.isAuthenticating else { continue }
                withAnimation(.easeInOut(duration: 0.6)) {
                    page = (page + 1) % Self.slides.count
                }
            }
        }
        .onChange(of: isReady) { _, ready in
            if ready { onClose() }
        }
        .sheet(item: $legalPage) { page in
            SafariView(url: page.url)
                .ignoresSafeArea()
        }
    }

    // MARK: - Backdrop and header

    /// The splash's midnight, and the panel's colour behind the bottom of the
    /// screen so it runs on under the home indicator.
    private var backdrop: some View {
        VStack(spacing: 0) {
            LinearGradient(colors: [Color.midnight, Self.midnightDeep], startPoint: .top, endPoint: .bottom)
            Color.surfaceRaised
                .frame(height: 200)
        }
    }

    private var topBar: some View {
        HStack(spacing: 8) {
            Image("SplashLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 28, height: 28)
            Image("SplashWordmark")
                .resizable()
                .scaledToFit()
                .frame(height: 17)
                .accessibilityLabel("DASHit")
            Spacer()
            Button {
                HapticsManager.shared.light()
                onClose()
            } label: {
                Group {
                    if isWelcome {
                        Text("Skip")
                            .font(.system(size: 14, weight: .semibold))
                            .padding(.horizontal, 16)
                            .frame(height: 34)
                    } else {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .bold))
                            .frame(width: 36, height: 36)
                    }
                }
                .foregroundColor(.white)
                .overlay(Capsule().strokeBorder(Color.white.opacity(0.18), lineWidth: 1))
                .contentShape(Capsule())
            }
            .buttonStyle(PressableButtonStyle(scale: 0.9))
            .accessibilityLabel(isWelcome ? "Skip for now" : "Close")
        }
        .padding(.leading, 20)
        .padding(.trailing, 16)
        .padding(.top, 10)
    }

    // MARK: - Artwork carousel

    private func carousel(artHeight: CGFloat) -> some View {
        ZStack {
            // A soft orange glow behind the pictures.
            RadialGradient(
                colors: [Color.brandOrange.opacity(0.30), Color.brandOrange.opacity(0)],
                center: .center,
                startRadius: 0,
                endRadius: artHeight * 0.75
            )
            .frame(width: artHeight * 1.5, height: artHeight * 1.5)
            .allowsHitTesting(false)

            TabView(selection: $page) {
                ForEach(Self.slides.indices, id: \.self) { index in
                    Image(Self.slides[index].art)
                        .resizable()
                        .scaledToFit()
                        .padding(.horizontal, 40)
                        .tag(index)
                        .accessibilityHidden(true)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            // A slow bob, scoped to the pictures so nothing else inherits it.
            .offset(y: isFloating && !reduceMotion ? -5 : 3)
            .animation(reduceMotion ? nil : .easeInOut(duration: 2.6).repeatForever(autoreverses: true), value: isFloating)
        }
        .frame(height: artHeight)
        .frame(maxWidth: .infinity)
        .padding(.top, 14)
        .padding(.bottom, 10)
    }

    private var caption: some View {
        let slide = Self.slides[page]
        return VStack(spacing: 6) {
            // Two lines kept for every title, so turning pages never moves the form.
            Text(slide.title)
                .font(.system(size: 25, weight: .heavy))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .lineLimit(2, reservesSpace: true)
            Text(slide.subtitle)
                .font(.system(size: 14))
                .foregroundColor(Color.white.opacity(0.68))
                .multilineTextAlignment(.center)
                .lineLimit(1)
                .minimumScaleFactor(0.85)
        }
        .padding(.horizontal, 28)
        .id(page)
        .transition(.opacity)
        .animation(.easeInOut(duration: 0.35), value: page)
    }

    private var pageDots: some View {
        HStack(spacing: 6) {
            ForEach(Self.slides.indices, id: \.self) { index in
                Capsule()
                    .fill(index == page ? Color.brandOrange : Color.white.opacity(0.25))
                    .frame(width: index == page ? 18 : 6, height: 6)
            }
        }
        .animation(.dashitSpring, value: page)
        .padding(.top, 12)
        .accessibilityHidden(true)
    }

    private var trustRow: some View {
        HStack(spacing: 14) {
            trustItem("box.truck.fill", "Free over ₹299")
            trustItem("location.fill", "Live tracking")
            trustItem("indianrupeesign", "Cash on delivery")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 18)
    }

    private func trustItem(_ symbol: String, _ label: String) -> some View {
        HStack(spacing: 5) {
            Image(systemName: symbol)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.brandAccent)
            Text(label)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Color.white.opacity(0.8))
                .lineLimit(1)
                .minimumScaleFactor(0.85)
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
            UnevenRoundedRectangle(topLeadingRadius: 28, topTrailingRadius: 28, style: .continuous)
                .fill(Color.surfaceRaised)
                .overlay(
                    UnevenRoundedRectangle(topLeadingRadius: 28, topTrailingRadius: 28, style: .continuous)
                        .stroke(
                            LinearGradient(colors: [Color.edgeHighlight, Color.clear], startPoint: .top, endPoint: .bottom),
                            lineWidth: 1
                        )
                )
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
                                    .overlay(Capsule().strokeBorder(Color.hairline, lineWidth: 1))
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
                    VStack(alignment: .leading, spacing: 12) {
                        if mode == .signUp {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Your name")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.textSecondary)
                                TextField("", text: $name, prompt: Text("First and last name").foregroundColor(.textFaint))
                                    .textContentType(.name)
                                    .textInputAutocapitalization(.words)
                                    .autocorrectionDisabled()
                                    .font(.system(size: 16))
                                    .foregroundColor(.textPrimary)
                                    .tint(.brandOrange)
                                    .padding(.horizontal, 14)
                                    .frame(height: 52)
                                    .background(Color.surfaceMuted, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                            }
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
                    method == .phone ? "Use email instead" : "Use phone number instead",
                    systemImage: method == .phone ? "envelope" : "phone"
                )
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.textSecondary)
                .frame(maxWidth: .infinity)
                .frame(height: 40)
                .contentShape(Rectangle())
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
                    .foregroundColor(.textSecondary)
                    .fontWeight(.semibold)
                Text("and")
                    .foregroundColor(.textMuted)
                Button("Privacy Policy") { legalPage = .privacy }
                    .foregroundColor(.textSecondary)
                    .fontWeight(.semibold)
            }
        }
        .font(.system(size: 12, weight: .medium))
        .buttonStyle(.plain)
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
        .padding(.top, 2)
    }
}
