import Foundation
import UserNotifications

/// "Your cart is waiting" reminders, for a shopper who left the app with
/// something in the cart and didn't order it. Scheduled on the phone when the
/// app goes to the background and withdrawn when it comes back, so they need
/// no server, reach signed-out shoppers too and always match this phone's
/// cart. Same rules as the Android app (CartReminders.kt):
///
///  - the first one `firstDelay` after leaving the app, the second
///    `secondDelay` after the first, and no more for that cart
///  - never two within `minGap`, and at most `weeklyCap` a week
///  - only between `windowStartHour`:00 and `windowEndHour`:00; one due
///    outside that waits for the next morning
///  - none while the app is open; changing the cart starts its count again;
///    ordering or emptying the cart ends them
///  - a switch in the profile turns them off
///
/// iOS shows a scheduled notification without waking the app, so both of a
/// cart's reminders are scheduled together, and the ones whose time has
/// passed are counted as sent when the app is next opened.
enum CartReminders {
    static let firstDelay: TimeInterval = 30 * 60
    static let secondDelay: TimeInterval = 24 * 3600
    static let maxPerCart = 2
    static let minGap: TimeInterval = 20 * 3600
    static let weeklyCap = 3
    static let windowStartHour = 9
    static let windowEndHour = 21

    /// The identifiers' prefix; tapping one opens the cart (OrderNotifications' delegate).
    static let idPrefix = "cart-reminder-"
    static let enabledKey = "dashit_cart_reminders"

    private static let defaults = UserDefaults.standard
    private static let signatureKey = "dashit_cart_reminder_signature"
    private static let sentKey = "dashit_cart_reminder_sent"
    private static let lastSentKey = "dashit_cart_reminder_last"
    private static let historyKey = "dashit_cart_reminder_history"
    private static let pendingKey = "dashit_cart_reminder_pending"
    private static let week: TimeInterval = 7 * 86_400

    static var isEnabled: Bool {
        defaults.object(forKey: enabledKey) as? Bool ?? true
    }

    /// Every cart change: a different cart starts the reminder count again.
    static func cartChanged(_ items: [CartItem]) {
        let signature = items.map { "\($0.id)x\($0.qty)" }.sorted().joined(separator: ",")
        guard signature != defaults.string(forKey: signatureKey) ?? "" else { return }
        defaults.set(signature, forKey: signatureKey)
        defaults.set(0, forKey: sentKey)
    }

    /// The app went to the background: schedule what this cart still has coming.
    static func schedule(items: [CartItem]) {
        appOpened()
        guard isEnabled, !items.isEmpty else { return }
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            // Never asks: only for shoppers who already allow notifications.
            guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }
            var sent = defaults.integer(forKey: sentKey)
            var lastSent = defaults.double(forKey: lastSentKey)
            var history = defaults.array(forKey: historyKey) as? [Double] ?? []
            var pending: [Double] = []
            var from = Date().timeIntervalSince1970
            while sent < maxPerCart {
                guard let at = nextTime(sent: sent, lastSent: lastSent, history: history, now: from) else { break }
                let (title, body) = message(items, sentBefore: sent)
                let content = UNMutableNotificationContent()
                content.title = title
                content.body = body
                content.sound = .default
                content.threadIdentifier = "cart"
                content.userInfo = ["kind": "cart"]
                let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(60, at - Date().timeIntervalSince1970), repeats: false)
                UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: idPrefix + "\(sent)", content: content, trigger: trigger))
                pending.append(at)
                // Plan the next as if this one went.
                sent += 1
                lastSent = at
                history.append(at)
                from = at
            }
            defaults.set(pending, forKey: pendingKey)
        }
    }

    /// The app is open: withdraw what hasn't shown yet, and count what has.
    static func appOpened() {
        let now = Date().timeIntervalSince1970
        let pending = defaults.array(forKey: pendingKey) as? [Double] ?? []
        let shown = pending.filter { $0 <= now }
        if !shown.isEmpty {
            defaults.set(defaults.integer(forKey: sentKey) + shown.count, forKey: sentKey)
            defaults.set(shown.max() ?? now, forKey: lastSentKey)
            let history = (defaults.array(forKey: historyKey) as? [Double] ?? []) + shown
            defaults.set(history.filter { $0 > now - week }, forKey: historyKey)
        }
        defaults.removeObject(forKey: pendingKey)
        UNUserNotificationCenter.current().removePendingNotificationRequests(
            withIdentifiers: (0..<maxPerCart).map { idPrefix + "\($0)" })
    }

    static func setEnabled(_ enabled: Bool) {
        defaults.set(enabled, forKey: enabledKey)
        if !enabled { appOpened() }
        // Off: the admin app's cart reminder skips this phone too.
        let items = LocalStorage.shared.loadCartItems()
        Push.shared.cartChanged(items.reduce(0) { $0 + $1.qty })
    }

    /// When the reminder after `sent` may go, or nil if none should.
    private static func nextTime(sent: Int, lastSent: Double, history: [Double], now: Double) -> Double? {
        guard sent < maxPerCart else { return nil }
        var at = sent == 0 ? now + firstDelay : max(lastSent + secondDelay, now + firstDelay)
        if lastSent > 0 { at = max(at, lastSent + minGap) }
        // The weekly cap: wait for the oldest of the week's reminders to drop out.
        let recent = history.filter { $0 > at - week }.sorted()
        if recent.count >= weeklyCap { at = max(at, recent[recent.count - weeklyCap] + week) }
        return intoWindow(at)
    }

    /// Moves a time outside the day window to the next opening, 9:30.
    private static func intoWindow(_ at: Double) -> Double {
        let calendar = Calendar.current
        let date = Date(timeIntervalSince1970: at)
        let hour = calendar.component(.hour, from: date)
        if hour >= windowStartHour && hour < windowEndHour { return at }
        var day = calendar.startOfDay(for: date)
        if hour >= windowEndHour { day = calendar.date(byAdding: .day, value: 1, to: day) ?? day }
        let opening = calendar.date(bySettingHour: windowStartHour, minute: 30, second: 0, of: day) ?? date
        return opening.timeIntervalSince1970
    }

    /// The wording, from this phone's own cart.
    static func message(_ items: [CartItem], sentBefore: Int) -> (String, String) {
        let units = items.reduce(0) { $0 + $1.qty }
        let first = items.max { $0.price * Double($0.qty) < $1.price * Double($1.qty) }?.name ?? "Your items"
        let others = items.count - 1
        let what = others <= 0 ? first : "\(first) and \(others) more item\(others == 1 ? "" : "s")"
        let total = items.reduce(0.0) { $0 + $1.price * Double($1.qty) }
        if sentBefore == 0 {
            return ("Your cart is waiting", "\(what) \(units == 1 ? "is" : "are") still in your cart. Order now and get it delivered in minutes.")
        }
        return ("Still want these?", "Your cart is saved: \(units) item\(units == 1 ? "" : "s"), \(CurrencyFormatter.format(total)). Tap to check out.")
    }
}
