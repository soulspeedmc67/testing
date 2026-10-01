import UIKit
import UserNotifications
import FirebaseAuth
import FirebaseMessaging

/// Order notifications by push (Firebase Cloud Messaging over APNs), so they
/// arrive even when the app is closed. The phone's token is handed to the
/// DASHit server (dashit.co.in/api/push/), which sends the pushes when an
/// order changes; the apps ask it to after they change one. Shared by the
/// shop app (the shopper's order updates) and the admin app ("new order").
final class Push: NSObject {
    static let shared = Push()

    private static let server = URL(string: "https://dashit.co.in/api/push/")!

    #if ADMIN_APP_TARGET
    private static let app = "admin"
    #else
    private static let app = "customer"
    #endif

    /// True once the server has this phone's token: the app's own local
    /// notifications then step aside, so nothing shows twice.
    private(set) var isActive = UserDefaults.standard.bool(forKey: "dashit_push_active")
    private var lastRegistered: String?
    private var authListener: AuthStateDidChangeListenerHandle?

    /// Called at launch: pushes need the APNs token, then the FCM token, then a signed-in account.
    func start(_ application: UIApplication) {
        Messaging.messaging().delegate = self
        application.registerForRemoteNotifications()
        authListener = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            if user != nil { self?.register() }
        }
        #if ADMIN_APP_TARGET
        // The store wants new-order alerts from the start.
        requestPermission()
        #endif
    }

    func requestPermission() {
        let center = UNUserNotificationCenter.current()
        center.getNotificationSettings { settings in
            guard settings.authorizationStatus == .notDetermined else { return }
            center.requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
        }
    }

    func didRegister(deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
    }

    /// Hands this phone's token to the server for the signed-in account. Safe to call often.
    func register(token: String? = nil) {
        Task {
            guard let user = Auth.auth().currentUser, !user.isAnonymous else { return }
            let fcm: String
            if let token {
                fcm = token
            } else if let fetched = try? await Messaging.messaging().token() {
                fcm = fetched
            } else {
                return
            }
            let key = "\(user.uid)|\(fcm)"
            guard key != lastRegistered, let idToken = try? await user.getIDToken() else { return }
            if await post("register.php", ["id_token": idToken, "token": fcm, "platform": "ios", "app": Self.app]) {
                lastRegistered = key
                isActive = true
                UserDefaults.standard.set(true, forKey: "dashit_push_active")
            }
        }
    }

    /// Asks the server to send the push for this order's current status (it sends each once).
    func orderChanged(_ orderId: String) {
        Task {
            guard let user = Auth.auth().currentUser, let idToken = try? await user.getIDToken() else { return }
            _ = await post("notify.php", ["id_token": idToken, "orderId": orderId])
        }
    }

    @discardableResult
    private func post(_ path: String, _ body: [String: Any]) async -> Bool {
        var request = URLRequest(url: Self.server.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        request.timeoutInterval = 20
        guard let (_, response) = try? await URLSession.shared.data(for: request) else { return false }
        return ((response as? HTTPURLResponse)?.statusCode ?? 0) / 100 == 2
    }
}

extension Push: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken else { return }
        register(token: fcmToken)
    }
}

/// Hands iOS's push token to Firebase Messaging. Both apps use it.
final class PushAppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        Push.shared.start(application)
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Push.shared.didRegister(deviceToken: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        #if DEBUG
        print("Push: APNs registration failed: \(error.localizedDescription)")
        #endif
    }
}
