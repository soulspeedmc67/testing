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

/// Online payments through Razorpay's own checkout, which offers every way to
/// pay that Razorpay supports in India: UPI (apps on the phone, or a UPI ID),
/// debit and credit cards, netbanking, wallets, EMI and Pay Later. Which ones
/// show is set in the Razorpay dashboard (Settings, Payment Methods), not here.
///
/// The app holds no Razorpay key: the small server next to the website
/// (dashit.co.in/api/razorpay/, PHP on Hostinger) creates the Razorpay order and
/// hands back the key id, and afterwards checks Razorpay's signature. Only a
/// confirmed payment places an order, and a payment Razorpay took is never left
/// without one: whenever the result is unclear (the shopper backed out, or the
/// result got lost), the server asks Razorpay whether it was paid.
///
/// Same flow as the Android app (`OnlinePayment.kt`).
final class OnlinePayment: NSObject {
    static let shared = OnlinePayment()

    private static let server = URL(string: "https://dashit.co.in/api/razorpay/")!

    /// False in builds without the Razorpay SDK.
    static var isAvailable: Bool {
        #if canImport(Razorpay)
        return true
        #else
        return false
        #endif
    }

    // MARK: - Paying

    private enum Outcome {
        case paid([AnyHashable: Any])
        case failed(code: Int32, description: String)
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
    #if canImport(Razorpay)
    private var checkout: RazorpayCheckout?
    #endif

    /// Takes payment for the order `orderCode` (its DASHit code, sent to
    /// Razorpay as the receipt) in Razorpay's checkout. Throws `.cancelled` if
    /// the shopper backs out without paying. `onConfirming` fires once the
    /// shopper is back and the payment is being checked.
    @MainActor
    func pay(
        orderCode: String,
        amountRupees: Double,
        customer: UserProfile,
        onConfirming: @escaping @MainActor () -> Void = {}
    ) async throws -> PaymentReceipt {
        guard Self.isAvailable else { throw OnlinePaymentError.unavailable }
        let paise = Int((amountRupees * 100).rounded())
        // The server only starts a payment for a signed-in shopper, so it needs their token.
        let token = try await AuthService.shared.idToken()
        let order: CreatedOrder = try await post("create-order.php", body: ["amount": paise, "receipt": orderCode, "id_token": token])

        let outcome = await authorize(order, orderCode: orderCode, customer: customer)
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
            // Code 2 is the shopper closing the checkout without paying.
            if code == 2 || description.localizedCaseInsensitiveContains("cancel") {
                throw OnlinePaymentError.cancelled
            }
            throw OnlinePaymentError.failed("The payment didn't go through. Nothing was charged.")
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

    /// Opens Razorpay's checkout and waits for its answer.
    @MainActor
    private func authorize(_ order: CreatedOrder, orderCode: String, customer: UserProfile) async -> Outcome {
        #if canImport(Razorpay)
        return await withCheckedContinuation { continuation in
            self.continuation = continuation
            let checkout = RazorpayCheckout.initWithKey(order.key_id, andDelegateWithData: self)
            self.checkout = checkout
            var prefill: [String: Any] = [:]
            if !customer.mobile.isEmpty { prefill["contact"] = "+91\(customer.mobile)" }
            if let email = customer.email, !email.isEmpty { prefill["email"] = email }
            let options: [String: Any] = [
                "amount": order.amount,
                "currency": order.currency,
                "order_id": order.order_id,
                "name": "DASHit",
                "description": "Order \(orderCode)",
                "image": "https://dashit.co.in/dashit-app-icon.png",
                "prefill": prefill,
                "theme": ["color": "#FF5B00"],
                // A failed attempt (wrong PIN, bank declined) can be tried again, or with another method.
                "retry": ["enabled": true, "max_count": 3],
                "timeout": 600
            ]
            checkout.open(options)
        }
        #else
        return .failed(code: 0, description: "Razorpay SDK missing")
        #endif
    }

    private func finish(_ outcome: Outcome) {
        guard let pending = continuation else { return }
        continuation = nil
        pending.resume(returning: outcome)
    }

    @MainActor
    private func release() {
        #if canImport(Razorpay)
        checkout = nil
        #endif
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

#if canImport(Razorpay)
extension OnlinePayment: RazorpayPaymentCompletionProtocolWithData {
    func onPaymentSuccess(_ payment_id: String, andData response: [AnyHashable: Any]?) {
        var data = response ?? [:]
        data["razorpay_payment_id"] = data["razorpay_payment_id"] ?? payment_id
        DispatchQueue.main.async { self.finish(.paid(data)) }
    }

    func onPaymentError(_ code: Int32, description str: String, andData response: [AnyHashable: Any]?) {
        DispatchQueue.main.async { self.finish(.failed(code: code, description: str)) }
    }
}
#endif
