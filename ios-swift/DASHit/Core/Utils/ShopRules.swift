import Foundation
import CoreLocation

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
    /// How far from the store we deliver, in a straight line (km). 0 means no limit.
    var deliveryRadiusKm: Double = 8
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
    /// The oldest iPhone app the shop takes orders from, as the App Store
    /// writes it ("1.0.3"); blank means every version. iPhone only: an older
    /// app shows the update sheet (`AppVersion`), and `firestore.rules` refuse
    /// its orders by `minIosVersionCode`, saved beside it.
    var minIosVersion: String = ""
    /// What the update screen says (`updateTitle`, `updateMessage`): the shop's own
    /// words; blank means the built-in ones (`UpdateRequiredView`). Apps from 1.0.4 on read them.
    var updateTitle: String = ""
    var updateMessage: String = ""
    static let updateTitleMax = 60
    static let updateMessageMax = 300
    /// The wallet's welcome credit in whole rupees, and the most one order may use.
    /// Off by default (0): it only works once the shop sets an amount. See `Wallet`.
    var walletWelcomeAmount: Int = 0
    var walletMaxPerOrder: Int = 0
    /// Where the store is now, when the shop has moved it (`storeLat`, `storeLng`,
    /// `storeLabel` on `config/store`, set in the staff console or this admin app):
    /// nil means the built-in hub. Read by `DeliveryEta`, so every distance, time,
    /// delivery-area check and distance charge follows it. Not part of `fields`:
    /// it is saved by `StoreLocation`, so saving the rules never overwrites it.
    var storeLat: Double? = nil
    var storeLng: Double? = nil
    var storeLabel: String = ""

    /// The shop's chosen store spot, if it set one.
    var storeCoordinate: CLLocationCoordinate2D? {
        guard let lat = storeLat, let lng = storeLng else { return nil }
        return CLLocationCoordinate2D(latitude: lat, longitude: lng)
    }

    /// How the delivery time is worked out: minutes to pack, the rider's speed, a safety buffer,
    /// and the least time ever promised; in high demand the promise is at least `highDemandMinutes`.
    /// `orderChangeSeconds` is how long a customer has to cancel or add items after ordering.
    /// The built-in values are what the app always used.
    var etaPackingMinutes: Double = 3
    var etaSpeedKmh: Double = 18
    var etaBufferMinutes: Double = 3
    var etaMinMinutes: Double = 8
    var highDemandMinutes: Int = 18
    var orderChangeSeconds: Int = 30

    static let walletMax = 5000
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
        if let value = amount("deliveryRadiusKm") { deliveryRadiusKm = min(50, value) }
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
        if let value = data["minIosVersion"] as? String { minIosVersion = Self.cleanVersion(value) }
        if let value = data["updateTitle"] as? String { updateTitle = String(value.trimmingCharacters(in: .whitespacesAndNewlines).prefix(Self.updateTitleMax)) }
        if let value = data["updateMessage"] as? String { updateMessage = String(value.trimmingCharacters(in: .whitespacesAndNewlines).prefix(Self.updateMessageMax)) }
        if let value = amount("walletWelcomeAmount") { walletWelcomeAmount = Int(min(Double(Self.walletMax), value.rounded(.down))) }
        if let lat = (data["storeLat"] as? NSNumber)?.doubleValue,
           let lng = (data["storeLng"] as? NSNumber)?.doubleValue,
           StoreLocation.isValid(lat: lat, lng: lng) {
            storeLat = lat
            storeLng = lng
            storeLabel = String(((data["storeLabel"] as? String) ?? "").trimmingCharacters(in: .whitespacesAndNewlines).prefix(60))
        }
        if let value = amount("etaPackingMinutes") { etaPackingMinutes = min(60, value) }
        if let value = amount("etaSpeedKmh") { etaSpeedKmh = min(80, max(5, value)) }
        if let value = amount("etaBufferMinutes") { etaBufferMinutes = min(60, value) }
        if let value = amount("etaMinMinutes") { etaMinMinutes = min(120, value) }
        if let value = amount("highDemandMinutes") { highDemandMinutes = Int(min(240, value)) }
        if let value = amount("orderChangeSeconds") { orderChangeSeconds = Int(min(600, max(10, value))) }
        if let value = amount("walletMaxPerOrder") { walletMaxPerOrder = Int(min(Double(Self.walletMax), value.rounded(.down))) }
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

    /// Whether an address `distanceKm` from the store is inside the delivery area.
    func delivers(distanceKm: Double) -> Bool {
        deliveryRadiusKm <= 0 || distanceKm <= deliveryRadiusKm
    }

    /// Why an order for an address `distanceKm` away is refused.
    func outsideAreaMessage(distanceKm: Double) -> String {
        "We deliver within \(Self.whole(deliveryRadiusKm)) km of our store. This address is \(String(format: "%.1f", distanceKm)) km away, so we can't deliver there yet."
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

    /// Whether this app is too old for the shop: it has to be updated before it can be used.
    var mustUpdate: Bool {
        AppVersion.isOlder(than: minIosVersion)
    }

    /// "1.0.3" as typed, or blank if it isn't a version.
    static func cleanVersion(_ text: String) -> String {
        let clean = text.trimmingCharacters(in: .whitespacesAndNewlines)
        return AppVersion.code(from: clean) == nil ? "" : clean
    }

    /// Whether cash on delivery can be chosen for an order placed at `date`.
    func allowsCash(at date: Date = Date()) -> Bool {
        codEnabled && (codAtNight || !NightCharge.isNightHours(date))
    }

    /// Why cash on delivery can't be chosen at `date`; nil when it can.
    func cashUnavailableNote(at date: Date = Date()) -> String? {
        if !codEnabled { return "Not available right now. Please pay online." }
        if !codAtNight && NightCharge.isNightHours(date) { return "Not available after \(NightCharge.startLabel). Please pay online." }
        return nil
    }

    /// The fields as they are saved on `config/store`.
    var fields: [String: Any] {
        [
            "minOrderValue": minOrderValue,
            "handlingFee": handlingFee,
            "deliveryRadiusKm": deliveryRadiusKm,
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
            "extraChargeLabel": extraChargeLabel,
            "minIosVersion": minIosVersion,
            "updateTitle": updateTitle,
            "updateMessage": updateMessage,
            "etaPackingMinutes": etaPackingMinutes,
            "etaSpeedKmh": etaSpeedKmh,
            "etaBufferMinutes": etaBufferMinutes,
            "etaMinMinutes": etaMinMinutes,
            "highDemandMinutes": highDemandMinutes,
            "orderChangeSeconds": orderChangeSeconds,
            "walletWelcomeAmount": walletWelcomeAmount,
            "walletMaxPerOrder": walletMaxPerOrder,
            // The same as a number, which is what `firestore.rules` compare.
            "minIosVersionCode": AppVersion.code(from: minIosVersion) ?? 0
        ]
    }

    /// "35" for 35.0, "12.5" for 12.5: amounts as the shop typed them.
    static func whole(_ value: Double) -> String {
        value == value.rounded() && abs(value) < 1e12 ? String(Int(value)) : String(value)
    }
}
