import Foundation
import FirebaseCore
import FirebaseAuth
import FirebaseFirestore

/// Central Firebase lifecycle coordinator
final class FirebaseManager {
    static let shared = FirebaseManager()
    
    private(set) var isConfigured: Bool = false
    
    private init() {}
    
    func configure() {
        guard !isConfigured else { return }
        
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
