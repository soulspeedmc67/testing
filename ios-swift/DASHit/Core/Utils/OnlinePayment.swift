import Foundation
import UIKit
import WebKit
#if canImport(RazorpayCustomUI)
import RazorpayCustomUI
#endif

/// What a confirmed online payment leaves behind, saved on the order.
struct PaymentReceipt {
    let razorpayOrderId: String
    let razorpayPaymentId: String
    /// In paise, as Razorpay recorded it (nil if Razorpay didn't say yet).
    let amountPaidPaise: Int?
}

enum OnlinePaymentError: LocalizedError {
    case cancelled
    case failed(String)
    case unavailable

    var errorDescription: String? {
        switch self {
        case .cancelled: return "Payment cancelled. Your order wasn't placed."
        case .failed(let message): return message
        case .unavailable: return "Online payment isn't available right now. Choose cash on delivery."
        }
    }
}

/// UPI payments inside our own checkout, the way Blinkit and Zomato do it:
/// the shopper picks Google Pay, PhonePe or Paytm in the checkout, that app
/// opens straight away, and they come back to a placed order. No Razorpay sheet.
///
/// Razorpay's Custom UI SDK does the talking to Razorpay. The app holds no
/// Razorpay key: the small server next to the website (dashit.co.in/api/
/// razorpay/, PHP on Hostinger) creates the Razorpay order and hands back the
/// key id, and afterwards checks Razorpay's signature. Only a confirmed payment
/// places an order, and a payment Razorpay took is never left without one:
/// whenever the result is unclear (the shopper backed out of the UPI app, or
/// came back before it answered), the server asks Razorpay whether it was paid.
///
/// Same flow as the Android app (`OnlinePayment.kt`).
final class OnlinePayment: NSObject {
    static let shared = OnlinePayment()

    private static let server = URL(string: "https://dashit.co.in/api/razorpay/")!

    /// False in builds without the Razorpay SDK.
    static var isAvailable: Bool {
        #if canImport(RazorpayCustomUI)
        return true
        #else
        return false
        #endif
    }

    /// A UPI app on this phone. `shortcode` is how Razorpay names it.
    struct UpiApp: Identifiable, Hashable {
        let shortcode: String
        let name: String
        var id: String { shortcode }
        /// Razorpay's logo for the app (iOS can't read other apps' icons).
        var logoURL: URL? { URL(string: "https://cdn.razorpay.com/app/\(shortcode).png") }
    }

    /// The apps most people here pay with, first; any others after, as found.
    private static let preferredOrder = ["google_pay", "phonepe", "paytm", "bhim", "cred", "amazonpay"]

    /// The UPI apps installed on this phone, best known first. Empty if there are none.
    @MainActor
    static func upiApps() async -> [UpiApp] {
        #if canImport(RazorpayCustomUI)
        let found: [[AnyHashable: Any]] = await withCheckedContinuation { continuation in
            let once = Once()
            Razorpay.RazorpayCheckout.getAppsWhichSupportUpi { apps in
                if once.claim() { continuation.resume(returning: apps) }
            }
            // Never leave the checkout waiting on the lookup.
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                if once.claim() { continuation.resume(returning: []) }
            }
        }
        var seen = Set<String>()
        return found
            .compactMap { app -> UpiApp? in
                guard let code = app["shortcode"] as? String, !code.isEmpty, seen.insert(code).inserted else { return nil }
                return UpiApp(shortcode: code, name: (app["appName"] as? String) ?? code)
            }
            .sorted { rank($0.shortcode) < rank($1.shortcode) }
        #else
        return []
        #endif
    }

    private static func rank(_ shortcode: String) -> Int {
        preferredOrder.firstIndex(of: shortcode) ?? Int.max
    }

    // MARK: - Paying

    private enum Outcome {
        case paid([AnyHashable: Any])
        case failed(code: Int32, description: String)
        /// Back in the app with no word from Razorpay yet.
        case noAnswer
    }

    private struct CreatedOrder: Decodable {
        let order_id: String
        let amount: Int
        let currency: String
        let key_id: String
    }

    private struct Verification: Decodable {
        let verified: Bool
        let amount_paid: Int?
    }

    private struct Status: Decodable {
        let paid: Bool
        let razorpay_payment_id: String?
        let amount_paid: Int?
    }

    private struct ServerError: Decodable {
        let error: String?
    }

    private var continuation: CheckedContinuation<Outcome, Never>?
    private var webView: WKWebView?
    private var observers: [NSObjectProtocol] = []
    private var leftForUpiApp = false
    /// Counts returns to the app, so a wait started on one return is dropped
    /// if the shopper goes back to the UPI app meanwhile.
    private var returns = 0
    #if canImport(RazorpayCustomUI)
    // `Razorpay.` because RazorpayCustom has a class of the same name.
    private var checkout: Razorpay.RazorpayCheckout?
    #endif

    /// How long to wait, once the shopper is back, for Razorpay to report.
    private static let answerGrace: TimeInterval = 30

    /// Takes payment for the order `orderCode` (its DASHit code, sent to
    /// Razorpay as the receipt) through `app`. Throws `.cancelled` if the
    /// shopper backs out without paying. `onConfirming` fires once the
    /// shopper is back and the payment is being checked.
    @MainActor
    func pay(
        orderCode: String,
        amountRupees: Double,
        customer: UserProfile,
        app: UpiApp,
        onConfirming: @escaping @MainActor () -> Void = {}
    ) async throws -> PaymentReceipt {
        guard Self.isAvailable else { throw OnlinePaymentError.unavailable }
        let paise = Int((amountRupees * 100).rounded())
        let order: CreatedOrder = try await post("create-order.php", body: ["amount": paise, "receipt": orderCode])

        let outcome = await authorize(order, orderCode: orderCode, customer: customer, app: app)
        release()
        onConfirming()

        if case .paid(let data) = outcome,
           let paymentId = data["razorpay_payment_id"] as? String,
           let signature = data["razorpay_signature"] as? String {
            let orderId = (data["razorpay_order_id"] as? String) ?? order.order_id
            let verification: Verification? = try? await post("verify-payment.php", body: [
                "razorpay_order_id": orderId,
                "razorpay_payment_id": paymentId,
                "razorpay_signature": signature
            ])
            if verification?.verified == true {
                return PaymentReceipt(razorpayOrderId: order.order_id, razorpayPaymentId: paymentId, amountPaidPaise: verification?.amount_paid)
            }
        }

        // Anything short of a checked success: ask Razorpay whether it was paid.
        if let receipt = await paidReceipt(order.order_id) { return receipt }

        switch outcome {
        case .failed(let code, let description):
            // Code 2 is the shopper cancelling; backing out of the UPI app comes
            // back as an error whose reason says so.
            if code == 2 || description.contains("payment_cancelled") || description.localizedCaseInsensitiveContains("cancel") {
                throw OnlinePaymentError.cancelled
            }
            throw OnlinePaymentError.failed("The payment didn't go through. Nothing was charged.")
        case .noAnswer:
            throw OnlinePaymentError.cancelled
        case .paid:
            throw OnlinePaymentError.failed("This payment couldn't be confirmed, so the order wasn't placed. If money was taken, message us on WhatsApp.")
        }
    }

    /// Asks the server (which asks Razorpay) whether this order was paid. A UPI
    /// app can confirm a moment after the shopper is back, so it looks twice.
    private func paidReceipt(_ razorpayOrderId: String) async -> PaymentReceipt? {
        for attempt in 0..<2 {
            if attempt > 0 { try? await Task.sleep(for: .seconds(2)) }
            guard let status: Status = try? await post("payment-status.php", body: ["razorpay_order_id": razorpayOrderId]) else { continue }
            if status.paid, let paymentId = status.razorpay_payment_id, !paymentId.isEmpty {
                return PaymentReceipt(razorpayOrderId: razorpayOrderId, razorpayPaymentId: paymentId, amountPaidPaise: status.amount_paid)
            }
        }
        return nil
    }

    @MainActor
    private func authorize(_ order: CreatedOrder, orderCode: String, customer: UserProfile, app: UpiApp) async -> Outcome {
        #if canImport(RazorpayCustomUI)
        guard let window = Self.keyWindow() else { return .failed(code: 0, description: "No window") }
        return await withCheckedContinuation { continuation in
            self.continuation = continuation
            self.leftForUpiApp = false

            // The SDK needs a web view of its own to talk to Razorpay. It sits
            // behind everything, never seen: the shopper only sees their UPI app.
            let web = WKWebView(frame: window.bounds)
            web.navigationDelegate = self
            web.isUserInteractionEnabled = false
            window.insertSubview(web, at: 0)
            self.webView = web

            let checkout = Razorpay.RazorpayCheckout.initWithKey(order.key_id, andDelegate: self, withPaymentWebView: web)
            self.checkout = checkout
            self.watchForReturn()

            let email = customer.email.flatMap { $0.isEmpty ? nil : $0 } ?? "void@razorpay.com"
            checkout.authorize([
                "amount": order.amount,
                "currency": order.currency,
                "order_id": order.order_id,
                "description": "Order \(orderCode)",
                "contact": customer.mobile,
                "email": email,
                "method": "upi",
                "_[flow]": "intent",
                "upi_app_package_name": app.shortcode
            ])
        }
        #else
        return .failed(code: 0, description: "Razorpay SDK missing")
        #endif
    }

    /// Notes when the UPI app takes over, and once the shopper is back gives
    /// Razorpay a little while to report before asking the server instead.
    private func watchForReturn() {
        let center = NotificationCenter.default
        observers.append(center.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
            guard let self else { return }
            self.leftForUpiApp = true
            self.returns += 1
        })
        observers.append(center.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
            guard let self, self.leftForUpiApp else { return }
            let thisReturn = self.returns
            DispatchQueue.main.asyncAfter(deadline: .now() + Self.answerGrace) { [weak self] in
                guard let self, self.returns == thisReturn else { return }
                self.finish(.noAnswer)
            }
        })
    }

    private func finish(_ outcome: Outcome) {
        guard let pending = continuation else { return }
        continuation = nil
        pending.resume(returning: outcome)
    }

    @MainActor
    private func release() {
        observers.forEach { NotificationCenter.default.removeObserver($0) }
        observers = []
        #if canImport(RazorpayCustomUI)
        checkout?.close()
        checkout = nil
        #endif
        webView?.stopLoading()
        webView?.navigationDelegate = nil
        webView?.removeFromSuperview()
        webView = nil
    }

    @MainActor
    private static func keyWindow() -> UIWindow? {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        return scenes.flatMap(\.windows).first { $0.isKeyWindow } ?? scenes.first?.windows.first
    }

    // MARK: - Server

    private func post<T: Decodable>(_ path: String, body: [String: Any]) async throws -> T {
        var request = URLRequest(url: Self.server.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        request.timeoutInterval = 25

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw OnlinePaymentError.failed("Couldn't reach the payment server. Check your connection and try again.")
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status), let decoded = try? JSONDecoder().decode(T.self, from: data) else {
            let message = (try? JSONDecoder().decode(ServerError.self, from: data))?.error
            throw OnlinePaymentError.failed(message ?? "The payment server had a problem. Try again, or choose cash on delivery.")
        }
        return decoded
    }
}

/// Lets exactly one of several callbacks through.
private final class Once: @unchecked Sendable {
    private let lock = NSLock()
    private var claimed = false

    func claim() -> Bool {
        lock.withLock {
            if claimed { return false }
            claimed = true
            return true
        }
    }
}

extension OnlinePayment: WKNavigationDelegate {
    // The SDK follows its web view's progress; hand every step on to it.
    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
        #if canImport(RazorpayCustomUI)
        checkout?.webView(webView, didCommit: navigation)
        #endif
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        #if canImport(RazorpayCustomUI)
        checkout?.webView(webView, didFinish: navigation)
        #endif
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        #if canImport(RazorpayCustomUI)
        checkout?.webView(webView, didFail: navigation, withError: error)
        #endif
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        #if canImport(RazorpayCustomUI)
        checkout?.webView(webView, didFailProvisionalNavigation: navigation, withError: error)
        #endif
    }
}

#if canImport(RazorpayCustomUI)
extension OnlinePayment: RazorpayPaymentCompletionProtocol {
    func onPaymentSuccess(_ payment_id: String, andData response: [AnyHashable: Any]) {
        var data = response
        data["razorpay_payment_id"] = data["razorpay_payment_id"] ?? payment_id
        DispatchQueue.main.async { self.finish(.paid(data)) }
    }

    func onPaymentError(_ code: Int32, description str: String, andData response: [AnyHashable: Any]) {
        DispatchQueue.main.async { self.finish(.failed(code: code, description: str)) }
    }
}
#endif
