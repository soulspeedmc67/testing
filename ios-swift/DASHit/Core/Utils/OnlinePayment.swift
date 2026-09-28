import Foundation
import UIKit
#if canImport(Razorpay)
import Razorpay
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

/// Razorpay payments. The app holds no Razorpay key: the small server next
/// to the website (dashit.co.in/api/razorpay/, PHP on Hostinger) creates the
/// Razorpay order and hands back the key id, Razorpay's own checkout takes the
/// payment, and the server then checks Razorpay's signature. Only a verified
/// payment places an order.
final class OnlinePayment: NSObject {
    static let shared = OnlinePayment()

    private static let server = URL(string: "https://dashit.co.in/api/razorpay/")!

    /// False in builds without the Razorpay SDK (the admin app).
    static var isAvailable: Bool {
        #if canImport(Razorpay)
        return true
        #else
        return false
        #endif
    }

    private var continuation: CheckedContinuation<[AnyHashable: Any], Error>?
    #if canImport(Razorpay)
    private var checkout: RazorpayCheckout?
    #endif

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

    private struct ServerError: Decodable {
        let error: String?
    }

    /// Takes payment for the order `orderCode` (its DASHit code, sent to
    /// Razorpay as the receipt). Throws `.cancelled` if the shopper closes the
    /// payment screen.
    @MainActor
    func pay(orderCode: String, amountRupees: Double, customer: UserProfile) async throws -> PaymentReceipt {
        guard Self.isAvailable else { throw OnlinePaymentError.unavailable }
        let paise = Int((amountRupees * 100).rounded())
        let order: CreatedOrder = try await post("create-order.php", body: ["amount": paise, "receipt": orderCode])

        let result = try await openCheckout(order, orderCode: orderCode, customer: customer)
        guard let paymentId = result["razorpay_payment_id"] as? String,
              let orderId = result["razorpay_order_id"] as? String,
              let signature = result["razorpay_signature"] as? String else {
            throw OnlinePaymentError.failed("Razorpay didn't send the payment details back. If money was taken, message us on WhatsApp.")
        }

        let verification: Verification = try await post("verify-payment.php", body: [
            "razorpay_order_id": orderId,
            "razorpay_payment_id": paymentId,
            "razorpay_signature": signature
        ])
        guard verification.verified else {
            throw OnlinePaymentError.failed("This payment couldn't be confirmed, so the order wasn't placed.")
        }
        return PaymentReceipt(razorpayOrderId: orderId, razorpayPaymentId: paymentId, amountPaidPaise: verification.amount_paid)
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

    // MARK: - Razorpay checkout

    @MainActor
    private func openCheckout(_ order: CreatedOrder, orderCode: String, customer: UserProfile) async throws -> [AnyHashable: Any] {
        #if canImport(Razorpay)
        guard let presenter = Self.topViewController() else { throw OnlinePaymentError.unavailable }
        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            let checkout = RazorpayCheckout.initWithKey(order.key_id, andDelegateWithData: self)
            self.checkout = checkout
            var prefill: [String: Any] = ["contact": customer.mobile]
            if let email = customer.email, !email.isEmpty { prefill["email"] = email }
            let options: [String: Any] = [
                "amount": order.amount,
                "currency": order.currency,
                "order_id": order.order_id,
                "name": "DASHit",
                "description": "Order \(orderCode)",
                "prefill": prefill,
                "theme": ["color": "#FF5B00"]
            ]
            checkout.open(options, displayController: presenter)
        }
        #else
        throw OnlinePaymentError.unavailable
        #endif
    }

    private func finish(_ result: Result<[AnyHashable: Any], Error>) {
        let pending = continuation
        continuation = nil
        #if canImport(Razorpay)
        checkout = nil
        #endif
        pending?.resume(with: result)
    }

    @MainActor
    private static func topViewController() -> UIViewController? {
        let root = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow }?
            .rootViewController
        var top = root
        while let presented = top?.presentedViewController { top = presented }
        return top
    }
}

#if canImport(Razorpay)
extension OnlinePayment: RazorpayPaymentCompletionProtocolWithData {
    func onPaymentSuccess(_ payment_id: String, andData response: [AnyHashable: Any]?) {
        var data = response ?? [:]
        data["razorpay_payment_id"] = data["razorpay_payment_id"] ?? payment_id
        DispatchQueue.main.async { self.finish(.success(data)) }
    }

    func onPaymentError(_ code: Int32, description str: String, andData response: [AnyHashable: Any]?) {
        // Razorpay's code 2 is the shopper closing the payment screen.
        let error: OnlinePaymentError = code == 2
            ? .cancelled
            : .failed(str.isEmpty ? "The payment didn't go through. Nothing was charged." : "The payment didn't go through: \(str)")
        DispatchQueue.main.async { self.finish(.failure(error)) }
    }
}
#endif
