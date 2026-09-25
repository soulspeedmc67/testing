import Foundation
import UserNotifications

/// Local notifications about the shopper's order. They are posted by the app
/// itself when it hears the order change while it isn't on screen (there is no
/// push server on the Spark plan), so they arrive as long as iOS keeps the app
/// alive in the background.
enum OrderNotifications {
    /// Asks once, right after the first order is placed, when the reason is obvious.
    static func requestPermissionIfNeeded() {
        let center = UNUserNotificationCenter.current()
        center.getNotificationSettings { settings in
            guard settings.authorizationStatus == .notDetermined else { return }
            center.requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
        }
    }

    static func notifyDelivered(_ order: Order) {
        let units = order.items.reduce(0) { $0 + $1.qty }
        let content = UNMutableNotificationContent()
        content.title = "Your order has been delivered"
        content.body = "\(units) item\(units == 1 ? "" : "s") · \(CurrencyFormatter.format(order.grandTotal)) · Thank you for shopping with DASHit."
        content.sound = .default
        content.threadIdentifier = "orders"
        content.userInfo = ["orderId": order.id, "event": "delivered"]
        let request = UNNotificationRequest(identifier: "delivered-\(order.id)", content: content, trigger: nil)
        UNUserNotificationCenter.current().add(request)
    }
}
