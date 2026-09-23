import SwiftUI

struct ProfileView: View {
    @ObservedObject private var auth = AuthService.shared
    @State private var isDeleteAccountOpen = false
    @State private var isEditingPhone = false
    @State private var isAddressPickerOpen = false

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
                        accountRows(user)
                        signOutAndDelete
                    } else {
                        SignInView()
                    }

                    AppearanceSetting()
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
        }
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
        .background(Color.surfaceRaised, in: cardShape)
        .overlay(cardShape.strokeBorder(Color.hairline, lineWidth: 1))
    }

    private func accountRows(_ user: UserProfile) -> some View {
        VStack(spacing: 0) {
            row(icon: "phone.fill", title: user.mobile.isEmpty ? "Add delivery number" : "Change delivery number") {
                isEditingPhone = true
            }
            Rectangle().fill(Color.hairline).frame(height: 1).padding(.leading, 50)
            row(icon: "mappin.circle.fill", title: "Delivery address") {
                isAddressPickerOpen = true
            }
        }
        .background(Color.surfaceRaised, in: cardShape)
        .overlay(cardShape.strokeBorder(Color.hairline, lineWidth: 1))
    }

    private func row(icon: String, title: String, action: @escaping () -> Void) -> some View {
        Button {
            HapticsManager.shared.light()
            action()
        } label: {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.system(size: 17))
                    .foregroundColor(.brandAccent)
                    .frame(width: 22)
                Text(title)
                    .font(.system(size: 15))
                    .foregroundColor(.textPrimary)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.textFaint)
            }
            .padding(14)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
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
                auth.signOut()
            } label: {
                Text("Sign out")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.textPrimary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Color.hairline, lineWidth: 1))
            }
            .buttonStyle(.pressable)

            Button {
                isDeleteAccountOpen = true
            } label: {
                Text("Delete account")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.danger)
                    .padding(8)
            }
        }
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
        .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Color.hairline, lineWidth: 1))
        .onChange(of: theme) { _, _ in
            HapticsManager.shared.selection()
        }
    }
}
