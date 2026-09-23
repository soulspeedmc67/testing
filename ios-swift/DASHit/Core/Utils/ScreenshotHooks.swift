#if DEBUG
import Foundation

/// Launch arguments the CI simulator-screenshot job uses to put the app into a
/// known state (Debug builds only; Release and the shipped IPA never see this).
/// Arguments arrive through UserDefaults' argument domain, e.g.
/// `-DASHitDemoCart YES -DASHitScrollTo categories -DASHitOpenProduct 1`.
enum ScreenshotHooks {
    static var demoCart: Bool { UserDefaults.standard.bool(forKey: "DASHitDemoCart") }
    static var demoOrder: Bool { UserDefaults.standard.bool(forKey: "DASHitDemoOrder") }
    static var openCart: Bool { UserDefaults.standard.bool(forKey: "DASHitOpenCart") }
    static var scrollTarget: String? { UserDefaults.standard.string(forKey: "DASHitScrollTo") }
    static var openProductId: String? { UserDefaults.standard.string(forKey: "DASHitOpenProduct") }
    static var openAddressPicker: Bool { UserDefaults.standard.bool(forKey: "DASHitOpenAddress") }
    static var openTracking: Bool { UserDefaults.standard.bool(forKey: "DASHitOpenTracking") }
    static var openProfile: Bool { UserDefaults.standard.bool(forKey: "DASHitOpenProfile") }
    /// A TabItem raw value, e.g. "Categories" or "Order Again".
    static var initialTab: String? { UserDefaults.standard.string(forKey: "DASHitTab") }
}
#endif
