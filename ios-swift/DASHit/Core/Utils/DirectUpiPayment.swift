import Foundation
import UIKit
import WebKit
#if canImport(Razorpay)
import Razorpay

/// Opens the UPI app the shopper picked (Google Pay, PhonePe...) straight from
/// DASHit, with no Razorpay page in between: Razorpay's lower-level "Custom UI"
/// calls, the way the Android app already does it (`openUpiApp` in
/// `OnlinePayment.kt`).
///
/// Razorpay doesn't document the iPhone payload for this, so it is an attempt
/// that never gets in the way: `pay` returns nil whenever the direct way can't
/// start (the SDK doesn't list the app, or it answers with an error before any
/// app has opened), and the caller then opens Razorpay's own checkout, exactly
/// as before. Once a UPI app has actually opened, the answer is final: paid, or
/// not paid, and `OnlinePayment` checks with the server in either case.
final class DirectUpiPayment: NSObject, RazorpayPaymentCompletionProtocol {
    enum Result {
        case paid(paymentId: String, data: [AnyHashable: Any])
        case failed(code: Int32, description: String)
    }

    /// Seconds to wait for a UPI app to open before giving up on the direct way.
    private static let openTimeout: Double = 12
    /// Seconds Razorpay gets to report after the shopper is back from the UPI app.
    private static let reportGrace: Double = 6

    private var checkout: RazorpayCheckout?
    private var webView: WKWebView?
    private var continuation: CheckedContinuation<Result?, Never>?
    private var leftApp = false
    private var observers: [NSObjectProtocol] = []
    private var timer: Task<Void, Never>?

    /// Razorpay's name for each UPI app -> words that identify it in the list the SDK gives back.
    private static let appWords: [String: [String]] = [
        "google_pay": ["google pay", "gpay", "tez", "paisa"],
        "phonepe": ["phonepe"],
        "paytm": ["paytm"],
        "bhim": ["bhim"],
        "cred": ["cred"],
        "amazon_pay": ["amazon"],
        "mobikwik": ["mobikwik"],
        "navi": ["navi"],
        "whatsapp": ["whatsapp"]
    ]

    /// The keys that may hold the app's identifier in the SDK's list, best first.
    private static let identifierKeys = [
        "package_name", "packageName", "upi_app_package_name", "app_package_name",
        "uri_scheme", "uriScheme", "scheme", "bundle_id", "bundleId", "app_id", "id"
    ]

    /// Starts the payment in `upiApp` (Razorpay's name, e.g. "google_pay"). Returns
    /// nil when the direct way isn't possible, so the caller can open Razorpay's checkout.
    @MainActor
    func pay(
        keyId: String,
        amount: Int,
        currency: String,
        razorpayOrderId: String,
        orderCode: String,
        customer: UserProfile,
        upiApp: String
    ) async -> Result? {
        guard let window = Self.keyWindow(),
              let identifier = await Self.identifier(forUpiApp: upiApp) else { return nil }

        // Razorpay's kit talks to its pages through a web view of its own; it
        // sits behind the app, never seen: the shopper only sees their UPI app.
        let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 1, height: 1))
        web.alpha = 0.01
        web.isUserInteractionEnabled = false
        window.addSubview(web)
        webView = web

        let sdk = RazorpayCheckout.initWithKey(keyId, andDelegate: self, withPaymentWebView: web)
        checkout = sdk

        let payload: [AnyHashable: Any] = [
            "amount": amount,
            "currency": currency,
            "order_id": razorpayOrderId,
            "description": "Order \(orderCode)",
            "contact": customer.mobile.isEmpty ? "" : "+91\(customer.mobile)",
            "email": (customer.email?.isEmpty == false ? customer.email : nil) ?? "void@razorpay.com",
            "method": "upi",
            "_[flow]": "intent",
            "upi_app_package_name": identifier
        ]

        watchApp()
        let result: Result? = await withCheckedContinuation { continuation in
            self.continuation = continuation
            // No UPI app opened in time: this way isn't working, so say so.
            timer = Task { @MainActor [weak self] in
                try? await Task.sleep(for: .seconds(Self.openTimeout))
                guard !Task.isCancelled else { return }
                self?.finish(nil)
            }
            sdk.authorize(payload)
        }
        cleanUp()
        return result
    }

    // MARK: - Which app

    /// The SDK's own name for the app on this phone, from the apps it lists as taking UPI.
    @MainActor
    private static func identifier(forUpiApp upiApp: String) async -> String? {
        guard let words = appWords[upiApp] else { return nil }
        let apps: [[AnyHashable: Any]] = await withCheckedContinuation { continuation in
            let once = Once()
            RazorpayCheckout.getAppsWhichSupportUpi { list in
                if once.first() { continuation.resume(returning: list) }
            }
            // The SDK may never answer: don't wait for it.
            Task {
                try? await Task.sleep(for: .seconds(4))
                if once.first() { continuation.resume(returning: []) }
            }
        }
        for app in apps {
            let text = app.values.compactMap { $0 as? String }.joined(separator: " ").lowercased()
            guard words.contains(where: { text.contains($0) }) else { continue }
            for key in identifierKeys {
                if let value = app[key] as? String, !value.isEmpty { return value }
            }
        }
        return nil
    }

    /// Lets only the first of several callers through.
    private final class Once: @unchecked Sendable {
        private let lock = NSLock()
        private var done = false
        func first() -> Bool {
            lock.lock(); defer { lock.unlock() }
            if done { return false }
            done = true
            return true
        }
    }

    // MARK: - Watching the app

    @MainActor
    private func watchApp() {
        let center = NotificationCenter.default
        observers.append(center.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { [weak self] _ in
            // A UPI app is opening: the direct way worked. Stop the "didn't open" timer.
            self?.leftApp = true
            self?.timer?.cancel()
        })
        observers.append(center.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
            guard let self, self.leftApp else { return }
            // Back from the UPI app. Razorpay normally reports at once; if it
            // doesn't, call it unpaid (OnlinePayment then asks the server).
            self.timer?.cancel()
            self.timer = Task { @MainActor [weak self] in
                try? await Task.sleep(for: .seconds(Self.reportGrace))
                guard !Task.isCancelled else { return }
                self?.finish(.failed(code: 2, description: "Payment cancelled"))
            }
        })
    }

    @MainActor
    private func finish(_ result: Result?) {
        guard let pending = continuation else { return }
        continuation = nil
        timer?.cancel()
        pending.resume(returning: result)
    }

    @MainActor
    private func cleanUp() {
        observers.forEach { NotificationCenter.default.removeObserver($0) }
        observers = []
        timer?.cancel()
        timer = nil
        webView?.removeFromSuperview()
        webView = nil
        checkout = nil
    }

    @MainActor
    private static func keyWindow() -> UIWindow? {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow }
    }

    // MARK: - Razorpay's answers

    func onPaymentSuccess(_ payment_id: String) {
        succeed(payment_id, data: [:])
    }

    func onPaymentSuccess(_ payment_id: String, andData response: [AnyHashable: Any]) {
        succeed(payment_id, data: response)
    }

    func onPaymentError(_ code: Int32, description str: String) {
        fail(code, str)
    }

    func onPaymentError(_ code: Int32, description str: String, andData response: [AnyHashable: Any]) {
        fail(code, str)
    }

    private func succeed(_ paymentId: String, data: [AnyHashable: Any]) {
        Task { @MainActor in
            var data = data
            data["razorpay_payment_id"] = data["razorpay_payment_id"] ?? paymentId
            self.finish(.paid(paymentId: paymentId, data: data))
        }
    }

    private func fail(_ code: Int32, _ description: String) {
        Task { @MainActor in
            // An error before any UPI app opened means this way isn't working:
            // nil sends the shopper to Razorpay's own checkout instead.
            self.finish(self.leftApp ? .failed(code: code, description: description) : nil)
        }
    }
}
#endif
