import SwiftUI
import FirebaseCore
import FirebaseAuth
import FirebaseFirestore

/// Who is using the admin app. The shop's data only opens to the owner's
/// account (the same check as the web console and the Firestore rules), so the
/// dashboard waits for that sign-in.
@MainActor
final class AdminSession: ObservableObject {
    static let shared = AdminSession()

    enum State { case checking, signedOut, notOwner, owner }

    @Published private(set) var state: State = .checking
    @Published var errorMessage: String?
    @Published private(set) var isWorking = false

    private var authHandle: AuthStateDidChangeListenerHandle?

    private init() {
        authHandle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor in await self?.evaluate(user) }
        }
    }

    private func evaluate(_ user: User?) async {
        guard let user else {
            state = .signedOut
            AdminDashboardViewModel.shared.stopListeners()
            return
        }
        state = .checking
        if await Self.isOwner(user) {
            state = .owner
            // Listeners started before sign-in were refused; start them again.
            AdminDashboardViewModel.shared.restartListeners()
        } else {
            state = .notOwner
        }
    }

    /// staff/{uid} with role "admin", or the owner accounts the rules allow.
    private static func isOwner(_ user: User) async -> Bool {
        if let snapshot = try? await Firestore.firestore().collection("staff").document(user.uid).getDocument(),
           let data = snapshot.data(),
           (data["active"] as? Bool) != false,
           (data["role"] as? String) == "admin" {
            return true
        }
        if user.uid == "DOf5enic8SXBZTupGJbxDrNdrOt2" { return true }
        return user.email?.lowercased() == "m4k3ditz@gmail.com"
    }

    func signIn(email: String, password: String) async {
        let cleanEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !cleanEmail.isEmpty, !password.isEmpty else {
            errorMessage = "Enter your email and password."
            return
        }
        isWorking = true
        errorMessage = nil
        do {
            _ = try await Auth.auth().signIn(withEmail: cleanEmail, password: password)
        } catch {
            errorMessage = "That email and password didn't match."
        }
        isWorking = false
    }

    func signOut() {
        try? Auth.auth().signOut()
    }
}

struct DASHitAdminAppView: View {
    @StateObject private var session = AdminSession.shared

    var body: some View {
        switch session.state {
        case .checking:
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(uiColor: .systemGroupedBackground))
        case .owner:
            AdminDashboardView(onSignOut: { session.signOut() })
        case .signedOut, .notOwner:
            AdminSignInView(session: session)
        }
    }
}

/// Email and password for the shop owner's account.
struct AdminSignInView: View {
    @ObservedObject var session: AdminSession
    @State private var email = ""
    @State private var password = ""
    @FocusState private var focused: Field?

    private enum Field { case email, password }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("DASHit Admin")
                        .font(.system(size: 28, weight: .bold))
                    Text("Sign in with the shop owner's account.")
                        .font(.system(size: 15))
                        .foregroundColor(.secondary)
                }
                .padding(.top, 60)

                if session.state == .notOwner {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("This account isn't the shop owner's. Sign in with the owner account instead.")
                            .font(.system(size: 14))
                            .foregroundColor(.primary)
                        Button("Use a different account") { session.signOut() }
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.orange)
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(uiColor: .secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                } else {
                    VStack(spacing: 10) {
                        TextField("Email", text: $email)
                            .textContentType(.username)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($focused, equals: .email)
                            .submitLabel(.next)
                            .onSubmit { focused = .password }
                            .padding(14)
                            .background(Color(uiColor: .secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        SecureField("Password", text: $password)
                            .textContentType(.password)
                            .focused($focused, equals: .password)
                            .submitLabel(.go)
                            .onSubmit(signIn)
                            .padding(14)
                            .background(Color(uiColor: .secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    if let message = session.errorMessage {
                        Text(message)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.red)
                    }

                    Button(action: signIn) {
                        Group {
                            if session.isWorking {
                                ProgressView().tint(.white)
                            } else {
                                Text("Sign in")
                                    .font(.system(size: 16, weight: .bold))
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color.orange)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .disabled(session.isWorking)
                }
            }
            .padding(.horizontal, 20)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Color(uiColor: .systemGroupedBackground).ignoresSafeArea())
    }

    private func signIn() {
        focused = nil
        Task { await session.signIn(email: email, password: password) }
    }
}

// Standalone entry point when building the DASHitAdmin target.
#if ADMIN_APP_TARGET
@main
struct DASHitAdminApp: App {
    init() {
        FirebaseManager.shared.configure()
        URLCache.shared = URLCache(memoryCapacity: 64 * 1024 * 1024, diskCapacity: 256 * 1024 * 1024)
    }

    var body: some Scene {
        WindowGroup {
            DASHitAdminAppView()
        }
    }
}
#endif
