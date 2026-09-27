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
    /// The demo order is still "Placed", so its 30-second change window is open.
    static var demoOrderPlaced: Bool { UserDefaults.standard.bool(forKey: "DASHitDemoOrderPlaced") }
    static var openAddItems: Bool { UserDefaults.standard.bool(forKey: "DASHitOpenAddItems") }
    static var openCoupons: Bool { UserDefaults.standard.bool(forKey: "DASHitOpenCoupons") }
    /// A TabItem raw value, e.g. "Categories" or "Order Again".
    static var initialTab: String? { UserDefaults.standard.string(forKey: "DASHitTab") }
    /// The demo order is being packed (tracker shows the packing screen).
    static var demoOrderPacking: Bool { UserDefaults.standard.bool(forKey: "DASHitDemoOrderPacking") }
    /// Opens the log in / sign up screen in sign-up mode.
    static var openSignUp: Bool { UserDefaults.standard.bool(forKey: "DASHitOpenSignUp") }

    // Admin app
    /// Skips the owner sign-in and fills the dashboard with a sample shop.
    static var adminDemo: Bool { UserDefaults.standard.bool(forKey: "DASHitAdminDemo") }
    /// An AdminTab raw value, e.g. "Orders" or "Stock".
    static var adminTab: String? { UserDefaults.standard.string(forKey: "DASHitAdminTab") }
    /// Opens the first order's details.
    static var adminOpenOrder: Bool { UserDefaults.standard.bool(forKey: "DASHitAdminOpenOrder") }
}
#endif
