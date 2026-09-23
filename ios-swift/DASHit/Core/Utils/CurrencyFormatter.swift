import Foundation

enum CurrencyFormatter {
    private static let formatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencySymbol = "₹"
        f.maximumFractionDigits = 0
        f.locale = Locale(identifier: "en_IN")
        return f
    }()
    
    static func format(_ amount: Double) -> String {
        return formatter.string(from: NSNumber(value: amount)) ?? "₹\(Int(amount))"
    }
    
    static func format(_ amount: Int) -> String {
        return "₹\(amount)"
    }
}
