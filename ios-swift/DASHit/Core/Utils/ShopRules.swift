import Foundation

/// The shop's order rules: the minimum order, the delivery fee by order size,
/// the handling charge, the free first orders, cash on delivery and the extra
/// charge for rain, snow or a rush.
///
/// The shop changes them from the staff console or the admin app. They are
/// saved on `config/store`, which every shop app already listens to, so a
/// change reaches customers at once with no new build. Ported from
/// `src/lib/deliveryCharges.js` (Android: `ShopRules.kt`): keep the three in
/// step. The values below apply until the settings arrive, and for any field
/// the shop hasn't set. Each property is also the field's name on `config/store`.
struct ShopRules: Equatable {
    /// The smallest items total we deliver. Fees and offers don't count towards it.
    var minOrderValue: Double = 100
    /// On every order, whatever its size.
    var handlingFee: Double = 11
    /// Orders under this pay `deliverySmallPercent` of the items total.
    var deliverySmallBelow: Double = 180
    var deliverySmallPercent: Double = 40
    /// From `deliverySmallBelow` up to `deliveryLowFrom`.
    var deliveryMidFee: Double = 35
    /// From here up the fee is at its lowest.
    var deliveryLowFrom: Double = 300
    var deliveryLowFee: Double = 25
    /// A customer's first orders are delivered free. 0 ends the offer.
    var freeDeliveryOrders: Int = 5
    /// Cash on delivery, and whether it is also taken from 8 pm to 6 am.
    var codEnabled: Bool = true
    var codAtNight: Bool = false
    /// The extra charge for rain, snow or a rush. While it is on, every order
    /// pays `extraChargeAmount` on top of the bill, free delivery included.
    /// `extraChargeLabel` is its name on the bill; blank means `defaultExtraChargeLabel`.
    var extraChargeOn: Bool = false
    var extraChargeAmount: Double = 20
    var extraChargeLabel: String = ""

    static let extraChargeMax: Double = 500
    static let defaultExtraChargeLabel = "Extra delivery charge"

    init() {}

    /// From the `config/store` document; anything missing keeps its default.
    init(data: [String: Any]) {
        func amount(_ key: String) -> Double? {
            guard let value = (data[key] as? NSNumber)?.doubleValue, value >= 0 else { return nil }
            return value
        }
        if let value = amount("minOrderValue") { minOrderValue = value }
        if let value = amount("handlingFee") { handlingFee = value }
        if let value = amount("deliverySmallBelow") { deliverySmallBelow = value }
        if let value = amount("deliverySmallPercent") { deliverySmallPercent = min(100, value) }
        if let value = amount("deliveryMidFee") { deliveryMidFee = value }
        if let value = amount("deliveryLowFrom") { deliveryLowFrom = value }
        if let value = amount("deliveryLowFee") { deliveryLowFee = value }
        if let value = amount("freeDeliveryOrders") { freeDeliveryOrders = Int(min(value, 100_000)) }
        if let value = data["codEnabled"] as? Bool { codEnabled = value }
        if let value = data["codAtNight"] as? Bool { codAtNight = value }
        if let value = data["extraChargeOn"] as? Bool { extraChargeOn = value }
        if let value = amount("extraChargeAmount") { extraChargeAmount = min(Self.extraChargeMax, value.rounded()) }
        if let value = data["extraChargeLabel"] as? String { extraChargeLabel = Self.cleanExtraLabel(value) }
    }

    /// The rules as last heard from `config/store`. `StoreStatusStore` keeps
    /// this up to date; the bill (`CartBillBreakdown`) reads it.
    static var current = ShopRules()

    /// What an order with this items total pays for delivery with no offer and no code.
    func standardDeliveryFee(forSubtotal subtotal: Double) -> Double {
        if subtotal < deliverySmallBelow {
            return (subtotal * deliverySmallPercent / 100).rounded()
        }
        if subtotal < deliveryLowFrom {
            return deliveryMidFee
        }
        return deliveryLowFee
    }

    /// The line under "Delivery fee" on the bill, saying which size of order this is.
    func tierLabel(forSubtotal subtotal: Double) -> String {
        if subtotal < deliverySmallBelow {
            return "\(Self.whole(deliverySmallPercent))% delivery charge (orders under ₹\(Self.whole(deliverySmallBelow)))"
        }
        if subtotal < deliveryLowFrom {
            return "₹\(Self.whole(deliveryMidFee)) delivery charge (orders ₹\(Self.whole(deliverySmallBelow)) - ₹\(Self.whole(deliveryLowFrom - 1)))"
        }
        return "₹\(Self.whole(deliveryLowFee)) delivery charge (orders above ₹\(Self.whole(deliveryLowFrom - 1)))"
    }

    /// The extra charge on an order placed now, in whole rupees; 0 while it is off.
    var extraCharge: Double {
        extraChargeOn ? max(0, extraChargeAmount) : 0
    }

    /// The extra charge's name on the bill: what the shop called it, or "Extra delivery charge".
    static func extraChargeTitle(_ label: String?) -> String {
        let clean = cleanExtraLabel(label ?? "")
        return clean.isEmpty ? defaultExtraChargeLabel : clean
    }

    static func cleanExtraLabel(_ text: String) -> String {
        String(text.trimmingCharacters(in: .whitespacesAndNewlines).prefix(40))
    }

    /// Whether cash on delivery can be chosen for an order placed at `date`.
    func allowsCash(at date: Date = Date()) -> Bool {
        codEnabled && (codAtNight || !NightCharge.isNightHours(date))
    }

    /// Why cash on delivery can't be chosen at `date`; nil when it can.
    func cashUnavailableNote(at date: Date = Date()) -> String? {
        if !codEnabled { return "Not available right now. Please pay online." }
        if !codAtNight && NightCharge.isNightHours(date) { return "Not available after 8 pm. Please pay online." }
        return nil
    }

    /// The fields as they are saved on `config/store`.
    var fields: [String: Any] {
        [
            "minOrderValue": minOrderValue,
            "handlingFee": handlingFee,
            "deliverySmallBelow": deliverySmallBelow,
            "deliverySmallPercent": deliverySmallPercent,
            "deliveryMidFee": deliveryMidFee,
            "deliveryLowFrom": deliveryLowFrom,
            "deliveryLowFee": deliveryLowFee,
            "freeDeliveryOrders": freeDeliveryOrders,
            "codEnabled": codEnabled,
            "codAtNight": codAtNight,
            "extraChargeOn": extraChargeOn,
            "extraChargeAmount": extraChargeAmount,
            "extraChargeLabel": extraChargeLabel
        ]
    }

    /// "35" for 35.0, "12.5" for 12.5: amounts as the shop typed them.
    static func whole(_ value: Double) -> String {
        value == value.rounded() && abs(value) < 1e12 ? String(Int(value)) : String(value)
    }
}
