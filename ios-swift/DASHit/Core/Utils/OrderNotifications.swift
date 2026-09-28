import Foundation
import UserNotifications

/// Local notifications about the shopper's order. They are posted by the app
/// itself when it hears the order change (there is no push server on the Spark
/// plan), so they arrive while the app is open or iOS still has it running in
/// the background. They show as banners even while the app is open.
enum OrderNotifications {
    /// Set once at launch so banners also appear while the app is on screen.
    static func showWhileOpen() {
        UNUserNotificationCenter.current().delegate = ForegroundPresenter.shared
    }

    /// "Packing", "on the way" and "cancelled", as the order moves along.
    /// Delivered has its own notification and celebration.
    static func notifyStageChange(_ order: Order) {
        let content = UNMutableNotificationContent()
        switch order.status.stage {
        case .packing:
            content.title = "Your order is being packed"
            content.body = "We'll tell you as soon as a rider picks it up."
        case .onTheWay:
            if let rider = order.driverName?.trimmingCharacters(in: .whitespaces), !rider.isEmpty {
                content.title = "\(rider) is on the way"
            } else {
                content.title = "Your order is on the way"
            }
            var body = "Arriving in about \(order.etaMinutes ?? 8) minutes."
            if let code = order.otp, !code.isEmpty {
                body += " Keep code \(code) ready for the rider."
            }
            content.body = body
        case .cancelled:
            content.title = "Your order was cancelled"
            content.body = "It won't be delivered. Tap to see what happened."
        default:
            return
        }
        content.sound = .default
        content.threadIdentifier = "orders"
        content.userInfo = ["orderId": order.id, "event": order.status.stage.rawValue]
        let request = UNNotificationRequest(
            identifier: "\(order.status.stage.rawValue)-\(order.id)",
            content: content,
            trigger: nil
        )
        UNUserNotificationCenter.current().add(request)
    }

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

/// Without a delegate, iOS hides notifications while the app is open.
private final class ForegroundPresenter: NSObject, UNUserNotificationCenterDelegate {
    static let shared = ForegroundPresenter()

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .list, .sound])
    }
}
