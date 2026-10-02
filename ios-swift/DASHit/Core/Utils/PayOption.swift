import UIKit

/// One way to pay online, picked in the checkout before Razorpay opens. The
/// checkout then shows only that way (a UPI app, cards, netbanking...), so the
/// shopper chooses in DASHit, not in a long list inside Razorpay. Same list as
/// the Android app's `PayOption.kt`.
struct PayOption: Identifiable, Equatable {
    /// Saved as the shopper's last choice: "upi:gpay", "upi", "card", ...
    let id: String
    let title: String
    let subtitle: String
    /// Razorpay's method: upi, card, netbanking, wallet, emi, paylater.
    let method: String
    /// Razorpay's name for a UPI app, when this is one.
    var upiApp: String? = nil
    /// SF Symbol for everything that isn't an app.
    var symbol: String = "creditcard"
    /// The app's logo in the asset catalogue (Razorpay's set), for UPI apps.
    var logo: String? { upiApp.flatMap { Self.logos[$0] } }

    private static let logos = [
        "google_pay": "PayLogo_google_pay", "phonepe": "PayLogo_phonepe", "paytm": "PayLogo_paytm",
        "bhim": "PayLogo_bhim", "cred": "PayLogo_cred", "amazon_pay": "PayLogo_amazonpay", "mobikwik": "PayLogo_mobikwik"
    ]

    /// Razorpay checkout `config` showing only this way to pay.
    var checkoutConfig: [String: Any] {
        var instruments: [[String: Any]]
        if let upiApp {
            instruments = [["method": "upi", "flows": ["intent"], "apps": [upiApp]]]
        } else if method == "emi" {
            instruments = [["method": "emi"], ["method": "cardless_emi"]]
        } else {
            instruments = [["method": method]]
        }
        return [
            "display": [
                "blocks": ["dashit": ["name": title, "instruments": instruments]],
                "sequence": ["block.dashit"],
                "preferences": ["show_default_blocks": false]
            ]
        ]
    }

    /// UPI apps Razorpay can open, by the URL scheme that shows they're installed
    /// (each is listed in LSApplicationQueriesSchemes).
    private static let knownUpiApps: [(scheme: String, title: String, razorpay: String)] = [
        ("tez", "Google Pay", "google_pay"),
        ("phonepe", "PhonePe", "phonepe"),
        ("paytmmp", "Paytm", "paytm"),
        ("bhim", "BHIM", "bhim"),
        ("credpay", "CRED", "cred"),
        ("amazonpay", "Amazon Pay", "amazon_pay"),
        ("navi", "Navi", "navi"),
        ("mobikwik", "MobiKwik", "mobikwik"),
        ("whatsapp", "WhatsApp", "whatsapp")
    ]

    /// The UPI apps on this phone, best known first.
    @MainActor
    static var installedUpiApps: [PayOption] {
        knownUpiApps.compactMap { app in
            guard let url = URL(string: "\(app.scheme)://"), UIApplication.shared.canOpenURL(url) else { return nil }
            return PayOption(id: "upi:\(app.razorpay)", title: app.title, subtitle: "UPI", method: "upi", upiApp: app.razorpay, symbol: "indianrupeesign.circle")
        }
    }

    static let anyUpi = PayOption(id: "upi", title: "UPI ID or other UPI app", subtitle: "Enter your UPI ID, or pick another app", method: "upi", symbol: "qrcode")

    /// Everything besides UPI that Razorpay takes in India.
    static let others: [PayOption] = [
        PayOption(id: "card", title: "Credit or debit card", subtitle: "Visa, Mastercard, RuPay, Amex", method: "card", symbol: "creditcard"),
        PayOption(id: "netbanking", title: "Netbanking", subtitle: "All major Indian banks", method: "netbanking", symbol: "building.columns"),
        PayOption(id: "wallet", title: "Wallets", subtitle: "Paytm, PhonePe, Amazon Pay, MobiKwik and more", method: "wallet", symbol: "wallet.pass"),
        PayOption(id: "emi", title: "EMI", subtitle: "Card and cardless EMI", method: "emi", symbol: "calendar"),
        PayOption(id: "paylater", title: "Pay Later", subtitle: "Simpl, LazyPay, ICICI PayLater and more", method: "paylater", symbol: "clock")
    ]

    @MainActor
    static var all: [PayOption] { installedUpiApps + [anyUpi] + others }

    static func == (a: PayOption, b: PayOption) -> Bool { a.id == b.id }
}
