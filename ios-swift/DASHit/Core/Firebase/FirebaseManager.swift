import Foundation
import FirebaseCore
import FirebaseAuth
import FirebaseFirestore
import FirebaseAppCheck

/// Central Firebase lifecycle coordinator
final class FirebaseManager {
    static let shared = FirebaseManager()
    
    private(set) var isConfigured: Bool = false
    
    private init() {}
    
    func configure() {
        guard !isConfigured else { return }

        // App Check has to be set up before FirebaseApp.configure().
        AppCheck.setAppCheckProviderFactory(DASHitAppCheckProviderFactory())

        // Check for bundled GoogleService-Info.plist
        if let filePath = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
           let options = FirebaseOptions(contentsOfFile: filePath) {
            FirebaseApp.configure(options: options)
            isConfigured = true
        } else if FirebaseApp.app() == nil {
            FirebaseApp.configure()
            isConfigured = true
        }
        
        // Configure Firestore cache settings for instant offline startup
        let db = Firestore.firestore()
        let settings = db.settings
        settings.cacheSettings = PersistentCacheSettings()
        db.settings = settings
    }
}

/// Firebase App Check: every Firestore and sign-in request carries a token
/// showing it came from this app on a real iPhone (Apple's DeviceCheck), not
/// from a script holding the public Firebase config. While App Check is set to
/// "monitor" in the Firebase console nothing is refused; once it is enforced,
/// requests without a token are, which is what stops a stranger running up
/// the Firestore bill.
///
/// The simulator can't use DeviceCheck, so it prints a debug token to the
/// Xcode console instead, to be added in the Firebase console.
final class DASHitAppCheckProviderFactory: NSObject, AppCheckProviderFactory {
    func createProvider(with app: FirebaseApp) -> AppCheckProvider? {
        #if targetEnvironment(simulator)
        return AppCheckDebugProvider(app: app)
        #else
        return DeviceCheckProvider(app: app)
        #endif
    }
}
