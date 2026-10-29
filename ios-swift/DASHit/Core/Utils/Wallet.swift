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

    /// Money the shop has just added to this customer's wallet: a new value each time (and only
    /// when money is added), so the home screen can celebrate it.
    struct Credit: Equatable {
        let id = UUID()
        let amount: Int
    }
    @Published private(set) var lastCredit: Credit?

    private var listener: ListenerRegistration?
    private var watchedUID: String?

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

    /// What is left: the welcome credit, plus any money an admin added, minus what has been
    /// spent, never below 0. `used` here is `used - bonus` from the customer's wallet document
    /// (see `refresh`), so it is below 0 while added money is unspent.
    nonisolated static func balance(rules: ShopRules, used: Int) -> Int {
        max(0, rules.walletWelcomeAmount - used)
    }

    /// How much of the wallet an order of `payable` rupees uses: all it can, up to the
    /// shop's limit, off the whole bill (items, delivery and handling). It never takes
    /// the bill below ₹1, so an order is never free.
    nonisolated static func toUse(rules: ShopRules, payable: Double, used: Int) -> Int {
        let whole = Int(max(0, payable).rounded(.down)) - 1
        // A per-order limit of 0 means there is none.
        let cap = rules.walletMaxPerOrder > 0 ? rules.walletMaxPerOrder : Int.max
        return max(0, min(balance(rules: rules, used: used), cap, whole))
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
            // What was spent, less any money an admin added: below 0 while that money is unspent.
            let spent = (snapshot.data()?["used"] as? NSNumber)?.intValue ?? 0
            let added = max(0, (snapshot.data()?["bonus"] as? NSNumber)?.intValue ?? 0)
            let value = spent - added
            readUID = uid
            readAt = Date()
            used = value
            let defaults = UserDefaults.standard
            defaults.set(uid, forKey: Self.usedUIDKey)
            defaults.set(used, forKey: Self.usedKey)
            return used
        } catch {
            return nil
        }
    }

    /// One listener on the customer's own wallet document: it keeps the balance current the
    /// moment the shop adds money, and sets `lastCredit` when `bonus` goes UP (spending, refunds
    /// and cancelled orders don't count). The last bonus seen is kept on the phone; with none
    /// kept, the first look only records it, so an old addition isn't celebrated again after a reinstall.
    func watch() {
        guard let uid = AuthService.shared.firebaseUID else {
            stopWatching()
            return
        }
        if uid == watchedUID, listener != nil { return }
        stopWatching()
        watchedUID = uid
        listener = Firestore.firestore().collection("wallets").document(uid).addSnapshotListener { [weak self] snapshot, error in
            guard error == nil, let snapshot else { return }
            let data = snapshot.data() ?? [:]
            let bonus = max(0, (data["bonus"] as? NSNumber)?.intValue ?? 0)
            let spent = (data["used"] as? NSNumber)?.intValue ?? 0
            let exists = snapshot.exists
            Task { @MainActor in self?.apply(uid: uid, exists: exists, spent: spent, bonus: bonus) }
        }
    }

    private func apply(uid: String, exists: Bool, spent: Int, bonus: Int) {
        guard uid == AuthService.shared.firebaseUID else { return }
        let value = exists ? spent - bonus : 0
        readUID = uid
        readAt = Date()
        used = value
        let defaults = UserDefaults.standard
        defaults.set(uid, forKey: Self.usedUIDKey)
        defaults.set(value, forKey: Self.usedKey)
        let key = "dashit_wallet_bonus_seen_\(uid)"
        let seen = defaults.object(forKey: key) as? Int
        defaults.set(bonus, forKey: key)
        if let seen, bonus > seen { lastCredit = Credit(amount: bonus - seen) }
    }

    private func stopWatching() {
        listener?.remove()
        listener = nil
        watchedUID = nil
    }

    /// Signed out: the wallet goes back to showing the full credit.
    func reset() {
        stopWatching()
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
