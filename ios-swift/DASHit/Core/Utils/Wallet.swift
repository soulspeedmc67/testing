import Foundation
import FirebaseAuth
import FirebaseFirestore

/// The wallet: a welcome credit every customer has, spent on their orders.
///
/// Nothing is stored for the credit itself. The shop sets the amount on
/// `config/store` (`ShopRules.walletWelcomeAmount`, ₹50 unless changed, 0 ends
/// it) and a customer's balance is that amount minus `used` on their
/// `wallets/{uid}` document, which only exists once they have spent some.
/// `firestore.rules` keep `used` from going down, except when an order that used
/// the wallet is cancelled, which gives it back.
///
/// Same rules as `src/lib/wallet.js` and Android's `Wallet.kt`: keep the three in step.
@MainActor
final class WalletStore: ObservableObject {
    static let shared = WalletStore()

    /// The rupees of the credit this shopper has spent: what the phone last read, 0 before that.
    @Published private(set) var used = 0

    private var readUID: String?
    private var readAt = Date.distantPast
    private static let readAgainAfter: TimeInterval = 5 * 60
    private static let welcomeKey = "dashit_wallet_welcome_seen"
    private static let usedKey = "dashit_wallet_used"
    private static let usedUIDKey = "dashit_wallet_used_uid"

    private init() {
        let defaults = UserDefaults.standard
        if let uid = AuthService.shared.firebaseUID, defaults.string(forKey: Self.usedUIDKey) == uid {
            used = defaults.integer(forKey: Self.usedKey)
        }
    }

    /// What is left: the welcome credit minus what has been spent, never below 0.
    nonisolated static func balance(rules: ShopRules, used: Int) -> Int {
        max(0, rules.walletWelcomeAmount - max(0, used))
    }

    /// How much of the wallet an order uses: all it can, up to the shop's limit and
    /// never more than `fees`, the order's delivery and handling charges. The wallet
    /// never takes anything off the items themselves.
    nonisolated static func toUse(rules: ShopRules, fees: Double, used: Int) -> Int {
        let whole = Int(max(0, fees).rounded(.down))
        return max(0, min(balance(rules: rules, used: used), rules.walletMaxPerOrder, whole))
    }

    /// The shopper's `used` from the server, or nil when nobody is signed in or
    /// the read failed. A few minutes' worth is reused unless `force` is set
    /// (placing or cancelling an order, or checking the bill before ordering).
    @discardableResult
    func refresh(force: Bool = false) async -> Int? {
        guard let uid = AuthService.shared.firebaseUID else { return nil }
        if !force, readUID == uid, Date().timeIntervalSince(readAt) < Self.readAgainAfter { return used }
        do {
            let snapshot = try await Firestore.firestore().collection("wallets").document(uid).getDocument()
            let value = (snapshot.data()?["used"] as? NSNumber)?.intValue ?? 0
            readUID = uid
            readAt = Date()
            used = max(0, value)
            let defaults = UserDefaults.standard
            defaults.set(uid, forKey: Self.usedUIDKey)
            defaults.set(used, forKey: Self.usedKey)
            return used
        } catch {
            return nil
        }
    }

    /// Signed out: the wallet goes back to showing the full credit.
    func reset() {
        readUID = nil
        readAt = .distantPast
        used = 0
    }

    /// The welcome is shown once on a phone.
    var welcomeSeen: Bool { UserDefaults.standard.bool(forKey: Self.welcomeKey) }

    func markWelcomeSeen() {
        UserDefaults.standard.set(true, forKey: Self.welcomeKey)
    }
}
