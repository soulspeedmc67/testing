# DASHit — Claude Takeover Prompt: Native Swift iOS App Polish & Optimization

Copy and paste the prompt below into your next Claude session:

---

```markdown
You are taking over the DASHit iOS development. The customer storefront iOS app has been fully migrated from Capacitor 8 to a 100% native Swift (SwiftUI) application.

### 1. Repository Layout & Dual-Account Push (CRITICAL RULE)
We maintain a dual-remote setup across two GitHub accounts:
- Main Repo: `/home/aleemkanyu/Projects/Blinkit` (branch `native-swift-ios`, origin `AleemKanyu/dashit`)
- Dedicated iOS Build Repo: `/home/aleemkanyu/Projects/dashit-ios` (branch `main`, origin `stiencoder/dashit`)

MANDATORY: Every time you make changes to the iOS Swift code, you MUST push to BOTH accounts so the user's primary repo stays updated AND the Xcode 16 macOS cloud runner on the second account automatically compiles the IPA.
Simply run this single script from the project root:
./sync-and-push.sh "Your descriptive commit message"

### 2. Architecture & Completed Foundation
- Target OS: iOS 17.0+ (iOS 18 Optimized) with ProMotion 120Hz support.
- Code Locations:
  - Inside main project: `ios-swift/DASHit/`
  - Inside standalone repo: `/home/aleemkanyu/Projects/dashit-ios/DASHit/`
- Backend: Shared Firebase Firestore (`dashit-1ecba`) & Anonymous Auth with 4-digit in-memory OTP state machine (zero-cost Spark tier).
- Catalog: 50-item offline seed in `Models/CatalogSeed.swift` with instant (<10ms) launch.
- Dynamic Island: Real iOS `ActivityKit` widget in `DASHitWidgets/` (`DASHitLiveActivityWidget.swift`).
- Map: Native Apple Maps (`MapKit`) in `AddressPickerMapView.swift` and `LiveTrackingMapView.swift`.

### 3. Your Goals for this Session
1. UI & Theme Parity with the Android/Web App:
   - Match the Obsidian dark theme palette: Background (`#09090B`), Card Surface (`#121216`), Elevated Surface (`#1A1A20`), Emerald Accent (`#10B981`), Amber Highlights (`#F59E0B`).
   - Polish the Storefront Home (`StorefrontHomeView.swift`): hero banner spotlights, category pills, everyday rails, and product card typography.
   - Polish the Product Details Sheet (`ProductDetailSheet.swift`): variant size pill selector, nutritional badges, and 18+ statutory warning modal for age-restricted items.
2. Maximize iPhone Fluidity & ProMotion (120Hz):
   - Refine spring animations on stepper increments (`+` / `-`), cart drawer transitions, and button taps.
   - Tune CoreHaptics (`HapticsManager.swift`) for crisp tactile feedback on every touch.
   - Handle safe areas cleanly across all iPhone form factors (Dynamic Island, notch, and home bar).
3. Dynamic Island & Live Activity Polish:
   - Enhance `DASHitLiveActivityWidget.swift` with a sleek progress bar, delivery ETA countdown timer, rider avatar/scooter icon, and compact Dynamic Island pill.
4. App Store Compliance:
   - Keep `DeleteAccountView.swift` (Guideline 5.1.1(v)), `PrivacyInfo.xcprivacy`, and location permission strings in `Info.plist` intact.

Review `docs/SWIFT_IOS_MIGRATION_PLAN.md` before making architectural decisions. When done with your edits, run `./sync-and-push.sh "<commit message>"` and verify the build status on `stiencoder/dashit`.
```
