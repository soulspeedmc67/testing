# DASHit iOS — Native Swift (SwiftUI) Migration Plan & Architecture Blueprint

**Target Release**: iOS 17.0+ (iOS 18 Optimized)  
**Architecture**: SwiftUI, Modern Swift Concurrency (`async/await`), Observation (`@Observable`), MVVM  
**Scope**: DASHit Customer iOS Application (Driver & Admin remain Web/Android)  
**Location**: `ios-swift/` (Parallel to existing web/android codebase)

---

## 1. Executive Summary & Objective

DASHit is transitioning its customer-facing iOS application from a Capacitor 8 WebView wrapper (Next.js 14 static export) to a **100% native Swift/SwiftUI application**. 

### Primary Drivers for Migration:
1. **Real Dynamic Island & Lock Screen Live Activities (`ActivityKit`)**: Deliver live delivery countdowns, rider distance, and order status directly to the iPhone lock screen and Dynamic Island without requiring the app to be foregrounded.
2. **ProMotion 120Hz Fluidity**: Eliminate WebKit scroll stutter, heavy DOM paint penalties, and touch latency during rapid browsing across 1,000+ SKU catalogs.
3. **Native MapKit Delivery Tracking**: Replace Leaflet WebGL/DOM tile maps with native Apple Maps vector rendering, smooth coordinate interpolation, and 3D pitch/rotation.
4. **Native Gesture & Sheet Physics**: Replace Web modal sheets (`vaul`) with true interactive native sheets (`.presentationDetents`), zero keyboard viewport bugs, and native interactive swipe-to-dismiss.
5. **App Store Review Safety**: Fully satisfy Apple App Store Review Guideline 4.2 (*Minimum Functionality*) by delivering an authentic, high-polish native iOS experience.

---

## 2. Shared Backend & Data Contract (Zero Backend Breaking Changes)

The native Swift iOS app will connect directly to the **existing Firebase project (`dashit-1ecba`)** and use the exact same Firestore collections, document structures, security rules, and auth conventions already implemented in `docs/FIRESTORE.md` and `firestore.rules`.

```
┌─────────────────────────────────────────────────────────────┐
│                 Cloud Firestore (Shared)                     │
│  - /products/{id}          - /categories/{id}               │
│  - /orders/{orderId}       - /orders/{orderId}/tracking/live│
│  - /users/{uid}            - /offers/{offerId}              │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
┌───────────────────────────────┐ ┌───────────────────────────┐
│     Next.js / Android / Web   │ │     Native iOS (SwiftUI)  │
│  (Customer, Driver, Admin)    │ │   (Customer App Only)     │
└───────────────────────────────┘ └───────────────────────────┘
```

### Shared Firestore Collections & Swift Mapping:
| Collection | Swift Model | Real-time Listener (`SnapshotListener`) |
|---|---|---|
| `products` | `struct Product: Codable, Identifiable` | `listenProducts()` |
| `categories` | `struct Category: Codable, Identifiable` | `listenCategories()` |
| `offers` | `struct Offer: Codable, Identifiable` | `listenActiveDeals()` |
| `orders` | `struct Order: Codable, Identifiable` | `listenUserOrders(uid:)` |
| `orders/{id}/tracking/live` | `struct DriverLocation: Codable` | `listenOrderTracking(orderId:)` |
| `users/{uid}` | `struct UserProfile: Codable` | One-shot fetch & doc update |

---

## 3. Native iOS Project Architecture

The native iOS project will be located in `ios-swift/DASHit/` and managed with Xcode and Swift Package Manager (SPM).

### Directory Structure:
```
ios-swift/
├── DASHit.xcodeproj
├── DASHit/
│   ├── App/
│   │   ├── DASHitApp.swift                # App entry point, Firebase init
│   │   ├── AppCoordinator.swift           # Route navigation state (Tab/Sheet/Fullscreen)
│   │   └── RootView.swift                 # Root navigation and conditional splash
│   ├── Core/
│   │   ├── Firebase/
│   │   │   ├── FirebaseManager.swift      # Singleton Firebase init & Auth coordinator
│   │   │   ├── FirestoreService.swift     # Firestore generic query & listener wrapper
│   │   │   └── AuthService.swift          # Anonymous sign-in + OTP state machine
│   │   ├── Storage/
│   │   │   └── LocalStorage.swift         # User preferences, cart cache, address cache
│   │   ├── DesignSystem/
│   │   │   ├── Colors.swift               # DASHit Obsidian, Emerald, Amber, Dark/Light tokens
│   │   │   ├── Typography.swift           # Native SF Pro dynamic typography
│   │   │   ├── HapticsManager.swift       # UIImpactFeedbackGenerator / CoreHaptics
│   │   │   └── SoundManager.swift         # Delivery chime / celebratory audio player
│   │   └── Utils/
│   │       ├── CurrencyFormatter.swift    # Rupee (₹) formatting & discount math
│   │       └── LocationManager.swift      # CoreLocation permissions & user coordinates
│   ├── Models/
│   │   ├── Product.swift                  # Product, Variant, Nutrition, Category models
│   │   ├── Cart.swift                     # CartItem, CartState, BillBreakdown, Coupon
│   │   ├── Order.swift                    # Order, OrderStatus, TimelineItem
│   │   ├── Address.swift                  # Address, LatLng, DeliveryInstructions
│   │   └── StoreStatus.swift              # Store hours, open/closed, delivery ETA
│   ├── ViewModels/
│   │   ├── AuthViewModel.swift            # Phone OTP entry, timer, profile setup
│   │   ├── StorefrontViewModel.swift      # Categories, search query, deals filter
│   │   ├── CartViewModel.swift            # Add/remove items, bill totals, coupon checks
│   │   ├── CheckoutViewModel.swift        # Address select, payment method, order submit
│   │   └── LiveTrackingViewModel.swift    # Active order listener, rider coordinate updates
│   ├── Views/
│   │   ├── Components/
│   │   │   ├── ProductCardView.swift      # Native product card with animated stepper
│   │   │   ├── FloatingCartBarView.swift  # Centered bottom floating cart dock
│   │   │   ├── CategoryRailView.swift     # Horizontal scrolling category rail
│   │   │   ├── HeroBannerView.swift       # Obsidian promo banner with page indicator
│   │   │   ├── ShimmerView.swift          # Native skeleton shimmer animations
│   │   │   └── CustomTabBar.swift         # Spring-animated floating bottom navigation
│   │   ├── Storefront/
│   │   │   ├── StorefrontHomeView.swift   # Main browsing feed
│   │   │   ├── CategoryListingView.swift  # 2-column or list category viewer
│   │   │   ├── ProductDetailSheet.swift   # Native presentation detent product modal
│   │   │   └── SearchSearchView.swift     # Instant search with recent search tags
│   │   ├── Cart/
│   │   │   ├── CartSheetView.swift        # Sliding cart drawer with bill itemization
│   │   │   ├── CouponsSheetView.swift     # Available coupon codes drawer
│   │   │   └── MinOrderValueAlert.swift   # ₹299 minimum order enforcement banner
│   │   ├── Checkout/
│   │   │   ├── CheckoutView.swift         # Delivery address + slot + order notes
│   │   │   ├── AddressPickerMapView.swift # Native MapKit pin drag & reverse geocoding
│   │   │   └── PaymentSheetView.swift     # Cash on Delivery & Apple Pay (PassKit)
│   │   ├── Orders/
│   │   │   ├── OrdersListView.swift       # Past & active order history
│   │   │   ├── OrderDetailView.swift      # Receipt details & re-order button
│   │   │   └── LiveTrackingMapView.swift  # Native MapKit rider live tracking screen
│   │   └── Profile/
│   │       ├── ProfileView.swift          # User info, address book, saved items
│   │       └── DeleteAccountView.swift    # App Store compliant account purge
│   └── Widgets/
│       ├── DASHitActivityAttributes.swift # ActivityKit attributes & state struct
│       └── DASHitLiveActivityWidget.swift # Dynamic Island & Lock Screen UI widget
```

---

## 4. Key Subsystems: Implementation Specifications

### 4.1 Authentication & Anonymous State Machine (`AuthService.swift`)
To maintain zero-cost Spark tier compatibility and identical behavior with `src/lib/auth.js`:
1. User enters 10-digit phone number.
2. Swift generates 4-digit verification code with a 5-minute memory TTL (matching `issueCode` in `src/lib/auth.js`).
3. Upon code verification:
   - Call `Auth.auth().signInAnonymously()`.
   - Obtain real `user.uid`.
   - Check/create `users/{uid}` profile document in Firestore.
4. Seamlessly matches `firestore.rules` security model: all reads/writes remain isolated to `request.auth.uid`.

### 4.2 Dynamic Island & Lock Screen Live Activities (`ActivityKit`)
1. **Activity Attributes**:
   ```swift
   struct DASHitOrderAttributes: ActivityAttributes {
       public struct ContentState: Codable, Hashable {
           var status: String           // "placed", "packing", "out_for_delivery", "delivered"
           var etaMinutes: Int          // e.g. 8
           var driverName: String?
           var progress: Double         // 0.0 to 1.0
       }
       var orderId: String
       var itemCount: Int
       var totalAmount: Double
   }
   ```
2. **Dynamic Island States**:
   - **CompactLeading**: DASHit delivery scooter icon + green pulse ring.
   - **CompactTrailing**: Countdown timer: `8 mins`.
   - **Expanded**: Rider avatar/name, ETA ring, order item summary, real-time stage progress bar.
   - **Lock Screen Banner**: Full-width card with interactive status tracker and direct link into `LiveTrackingMapView`.
3. **Lifecycle Sync**:
   - When order status updates in Firestore (`watchOrder`), Swift triggers `Activity<DASHitOrderAttributes>.update(using: newState)`.
   - Upon delivery (`status == "delivered"`), the activity dismisses after a 15-second celebratory window.

### 4.3 Native MapKit Rider Tracking (`LiveTrackingMapView.swift`)
1. Uses SwiftUI `Map(position: $cameraPosition)` (iOS 17+ API).
2. Custom annotations for:
   - Customer destination address (pin marker).
   - Dark-store origin (hub marker).
   - Real-time rider location (animated custom scooter icon).
3. Smooth coordinate interpolation: when Firestore delivers a new GPS tick in `orders/{id}/tracking/live`, coordinate delta is animated over a 1.2s easeInOut curve rather than jumping.

### 4.4 Haptics & Tactile Physics (`HapticsManager.swift`)
- Replaces Capacitor plugin calls with direct UIKit generators:
  - Add to cart: `UIImpactFeedbackGenerator(style: .medium).impactOccurred()`
  - Quantity step: `UIImpactFeedbackGenerator(style: .light).impactOccurred()`
  - Order placed: `UINotificationFeedbackGenerator().notificationOccurred(.success)`
  - Error / Min Order not met: `UINotificationFeedbackGenerator().notificationOccurred(.warning)`

---

## 5. App Store Compliance Matrix (Mandatory Review Gate)

In strict adherence to `AGENTS.md` and Apple App Store Review Guidelines:

| Guideline | Requirement | DASHit Native Implementation |
|---|---|---|
| **4.2 Minimum Functionality** | App must deliver features beyond a website wrapper. | Fully native SwiftUI, Dynamic Island Live Activities, CoreLocation, CoreHaptics, MapKit. |
| **5.1.1(v) Account Deletion** | Must allow instant, self-serve account and data deletion within the app. | Dedicated `DeleteAccountView.swift` that purges `users/{uid}`, active cart, addresses, and triggers `Auth.auth().currentUser?.delete()`. |
| **5.1.1 Data Collection** | Required privacy permission descriptions in `Info.plist`. | Explicit, context-rich strings for `NSLocationWhenInUseUsageDescription` ("Used to verify your delivery address in Anantnag and show live courier arrival on the map"). |
| **3.1.5 Physical Goods & Services** | Physical food/grocery delivery is **exempt** from Apple 30% IAP commission. | Implements Cash on Delivery (COD) and Apple Pay via `PassKit` without In-App Purchase setup. |
| **2.1 App Completeness** | No placeholder text, dead links, or broken webviews. | All screens have native loading shimmers, empty states, and offline banner fallbacks. |

---

## 6. Phased Execution Roadmap

```
Phase 1: Foundation (Days 1–3)
├── Setup ios-swift/ Xcode Project with SPM (Firebase iOS SDK, Kingfisher)
├── GoogleService-Info.plist configuration & Firebase Auth + Firestore setup
└── Core Data Models (Product, Category, Order, CartItem, UserProfile)

Phase 2: Storefront & Browsing (Days 4–7)
├── Root Tab Bar & Obsidian Design System (Dark/Light Mode)
├── Home Feed: Hero Spotlight, Dynamic Rails, Category Grid
├── Product Card with Animated Stepper & Variant Selector Sheet
└── Instant Search & Category Filter Navigation

Phase 3: Cart, Address & Checkout (Days 8–11)
├── Floating Cart Pill Dock & Cart Sheet Drawer
├── ₹299 Minimum Order Enforcement & Coupon Engine
├── Native MapKit Location Picker & Address Management
└── Checkout Flow (Slot selection, COD, PassKit Apple Pay)

Phase 4: Live Order & Dynamic Island (Days 12–15)
├── Firestore Live Order Snapshot Listener
├── MapKit Live Delivery Tracking with Animated Rider Coordinates
├── ActivityKit Widget Extension (Dynamic Island & Lock Screen)
└── Delivery Celebration & Order Receipt

Phase 5: Compliance, Polish & CI Cloud Build (Days 16–18)
├── Apple App Store Compliance Audit (Account deletion, privacy strings)
├── GitHub Actions CI Workflow (`macos-14`, Xcode 16 cloud archive & IPA export)
└── End-to-end TestFlight distribution configuration
```

---

## 7. Cloud Build & Testing Strategy on Linux

Because development takes place on Linux, the workflow utilizes:
1. **GitHub Actions Cloud macOS Runner (`macos-14`, Xcode 16)**:
   - Configured to build, lint, and produce signed `.ipa` builds or upload directly to TestFlight on push to `native-swift-ios`.
2. **Swift Package Manager (SPM)**:
   - Zero CocoaPods dependency; all dependencies (`Firebase`, `Kingfisher` for async image caching) resolve cleanly in CI.
3. **Local Syntax & Model Verification**:
   - Code structure and unit logic authored with strict modern Swift syntax and type safety.
