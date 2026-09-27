import SwiftUI

/// Account, help and legal in one place. Signed out, it invites the shopper to
/// log in or sign up, and still offers help, the policies and appearance.
struct ProfileView: View {
    @ObservedObject private var auth = AuthService.shared
    @ObservedObject private var addressBook = AddressBook.shared
    @Environment(\.openURL) private var openURL
    @State private var isDeleteAccountOpen = false
    @State private var isEditingPhone = false
    @State private var isAddressPickerOpen = false
    @State private var isSignOutConfirmOpen = false
    @State private var authMode: AuthView.Mode? = nil
    @State private var legalPage: LegalPage? = nil

    private var cardShape: RoundedRectangle { RoundedRectangle(cornerRadius: 16, style: .continuous) }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if auth.isAuthenticated, let user = auth.currentUser {
                        if auth.needsPhoneNumber || isEditingPhone {
                            phoneCard(currentMobile: user.mobile)
                        }
                        accountHeader(user)
                        section("Account") {
                            row(icon: "phone.fill", title: user.mobile.isEmpty ? "Add delivery number" : "Delivery number",
                                detail: user.mobile.isEmpty ? nil : "+91 \(user.mobile)") {
                                isEditingPhone = true
                            }
                            rowDivider
                            row(icon: "mappin.circle.fill", title: "Delivery address",
                                detail: addressBook.current?.nickname) {
                                isAddressPickerOpen = true
                            }
                        }
                    } else {
                        signedOutCard
                    }

                    section("Help") {
                        NavigationLink {
                            HelpSupportView()
                        } label: {
                            rowLabel(icon: "questionmark.bubble.fill", title: "Help & support", detail: nil)
                        }
                        .buttonStyle(.plain)
                        rowDivider
                        row(icon: "phone.bubble.fill", title: "Call the store", detail: SupportContact.phoneDisplay, external: true) {
                            openURL(SupportContact.phoneURL)
                        }
                    }

                    section("Legal") {
                        row(icon: "hand.raised.fill", title: "Privacy Policy") {
                            legalPage = .privacy
                        }
                        rowDivider
                        row(icon: "doc.text.fill", title: "Terms & Conditions") {
                            legalPage = .terms
                        }
                    }

                    AppearanceSetting()

                    if auth.isAuthenticated {
                        signOutAndDelete
                    }

                    Text(versionLine)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.textFaint)
                        .padding(.top, 4)
                }
                .padding(16)
                .animation(.dashitSpring, value: auth.isAuthenticated)
                .animation(.dashitSpring, value: isEditingPhone)
            }
            .background(Color.surface.ignoresSafeArea())
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.surface, for: .navigationBar)
            .sheet(isPresented: $isDeleteAccountOpen) {
                DeleteAccountView()
            }
            .sheet(isPresented: $isAddressPickerOpen) {
                AddressPickerMapView()
            }
            .sheet(item: $legalPage) { page in
                SafariView(url: page.url)
                    .ignoresSafeArea()
            }
            .fullScreenCover(item: $authMode) { mode in
                AuthView(initialMode: mode) { authMode = nil }
            }
            .confirmationDialog("Sign out of DASHit?", isPresented: $isSignOutConfirmOpen, titleVisibility: .visible) {
                Button("Sign out", role: .destructive) {
                    auth.signOut()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("You'll need to log in again to order and to see your orders.")
            }
        }
    }

    // MARK: - Signed out

    private var signedOutCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .bottom, spacing: 8) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Welcome to DASHit")
                        .font(.system(size: 21, weight: .heavy))
                        .foregroundColor(.white)
                    Text("Log in to order, track deliveries live and reorder in one tap.")
                        .font(.system(size: 13.5, weight: .medium))
                        .foregroundColor(Color.white.opacity(0.85))
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
                Image("AuthScooter")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 104, height: 104)
                    .accessibilityHidden(true)
            }
            HStack(spacing: 10) {
                Button {
                    HapticsManager.shared.light()
                    authMode = .logIn
                } label: {
                    Text("Log in")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.brandOrange)
                        .frame(maxWidth: .infinity)
                        .frame(height: 46)
                        .background(Color.white, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                }
                .buttonStyle(.pressable)
                Button {
                    HapticsManager.shared.light()
                    authMode = .signUp
                } label: {
                    Text("Sign up")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 46)
                        .background(Color.white.opacity(0.18), in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 13, style: .continuous).strokeBorder(Color.white.opacity(0.45), lineWidth: 1))
                }
                .buttonStyle(.pressable)
            }
        }
        .padding(18)
        .background(
            LinearGradient(colors: [Color(hex: 0xFF6A1A), Color(hex: 0xD63800)], startPoint: .topLeading, endPoint: .bottomTrailing),
            in: RoundedRectangle(cornerRadius: 22, style: .continuous)
        )
    }

    // MARK: - Signed in

    private func accountHeader(_ user: UserProfile) -> some View {
        HStack(spacing: 14) {
            Text(initials(for: user))
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.white)
                .frame(width: 56, height: 56)
                .background(Circle().fill(Color.brandOrange))
            VStack(alignment: .leading, spacing: 3) {
                Text(displayName(for: user))
                    .font(.system(size: 19, weight: .bold))
                    .foregroundColor(.textPrimary)
                if !user.mobile.isEmpty {
                    Text("+91 \(user.mobile)")
                        .font(.system(size: 14))
                        .foregroundColor(.textMuted)
                }
                if let email = user.email, !email.isEmpty {
                    Text(email)
                        .font(.system(size: 13))
                        .foregroundColor(.textMuted)
                        .lineLimit(1)
                }
            }
            Spacer()
        }
        .padding(16)
        .dashitCard(cardShape)
    }

    // MARK: - Rows

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased())
                .font(.system(size: 11.5, weight: .bold))
                .tracking(0.8)
                .foregroundColor(.textMuted)
                .padding(.leading, 4)
            VStack(spacing: 0) {
                content()
            }
            .dashitCard(cardShape)
        }
    }

    private var rowDivider: some View {
        Rectangle().fill(Color.hairline).frame(height: 1).padding(.leading, 50)
    }

    private func row(icon: String, title: String, detail: String? = nil, external: Bool = false, action: @escaping () -> Void) -> some View {
        Button {
            HapticsManager.shared.light()
            action()
        } label: {
            rowLabel(icon: icon, title: title, detail: detail, external: external)
        }
        .buttonStyle(.plain)
    }

    private func rowLabel(icon: String, title: String, detail: String?, external: Bool = false) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 17))
                .foregroundColor(.brandAccent)
                .frame(width: 22)
            Text(title)
                .font(.system(size: 15))
                .foregroundColor(.textPrimary)
            Spacer(minLength: 8)
            if let detail, !detail.isEmpty {
                Text(detail)
                    .font(.system(size: 13))
                    .foregroundColor(.textMuted)
                    .lineLimit(1)
            }
            Image(systemName: external ? "arrow.up.right" : "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.textFaint)
        }
        .padding(14)
        .contentShape(Rectangle())
    }

    /// Apple and email accounts can arrive without a phone; deliveries need one.
    private func phoneCard(currentMobile: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(currentMobile.isEmpty ? "Add your delivery number" : "Change your delivery number")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(.textPrimary)
                Spacer()
                if !auth.needsPhoneNumber {
                    Button("Cancel") { isEditingPhone = false }
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.textMuted)
                }
            }
            PhoneNumberConfirmationFlow(
                title: "Mobile number",
                confirmTitle: "Save number",
                initialMobile: currentMobile
            ) { mobile in
                try await auth.updateMobile(mobile)
                isEditingPhone = false
            }
        }
        .padding(16)
        .background(Color.surfaceRaised, in: cardShape)
        .overlay(cardShape.strokeBorder(Color.brandOrange.opacity(0.5), lineWidth: 1))
    }

    private var signOutAndDelete: some View {
        VStack(spacing: 12) {
            Button {
                HapticsManager.shared.light()
                isSignOutConfirmOpen = true
            } label: {
                Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.danger)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .dashitCard(cornerRadius: 14)
            }
            .buttonStyle(.pressable)

            Button {
                isDeleteAccountOpen = true
            } label: {
                Text("Delete account")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.textMuted)
                    .underline()
                    .padding(8)
            }
        }
    }

    private var versionLine: String {
        let info = Bundle.main.infoDictionary
        let version = info?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = info?["CFBundleVersion"] as? String ?? ""
        return "DASHit \(version)\(build.isEmpty ? "" : " (\(build))") · Anantnag"
    }

    private func displayName(for user: UserProfile) -> String {
        if let name = user.name, !name.isEmpty { return name }
        return "DASHit shopper"
    }

    private func initials(for user: UserProfile) -> String {
        let source = user.name.flatMap { $0.isEmpty ? nil : $0 } ?? user.email ?? "D"
        let letters = source.split(separator: " ").prefix(2).compactMap { $0.first }.map { String($0) }.joined()
        return letters.isEmpty ? "D" : letters.uppercased()
    }
}

extension AuthView.Mode: Identifiable {
    var id: Self { self }
}

/// Light / Dark / Automatic, stored under the same `dashit_theme` key and
/// values the web app uses (`src/components/AppearanceSetting.jsx`).
struct AppearanceSetting: View {
    @AppStorage("dashit_theme") private var theme = "system"

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Appearance")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.textPrimary)
            Picker("Appearance", selection: $theme) {
                Text("Light").tag("light")
                Text("Dark").tag("dark")
                Text("Automatic").tag("system")
            }
            .pickerStyle(.segmented)
        }
        .padding(14)
        .dashitCard(cornerRadius: 14)
        .onChange(of: theme) { _, _ in
            HapticsManager.shared.selection()
        }
    }
}
