# Graph Report - Blinkit  (2026-09-29)

## Corpus Check
- 395 files · ~2,646,240 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4049 nodes · 8275 edges · 248 communities (223 shown, 25 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 369 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ed29846c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- FirestoreService
- db.js
- OnlinePayment
- hapticLight
- AppDelegate
- PressableButtonStyle
- InteractiveMapModal.jsx
- package.json
- AdminDashboardViewModel
- RemotionDeliveryBadge.jsx
- ExampleInstrumentedTest.java
- .remember
- MainActivity
- build-app.sh
- gradlew
- test_enrichment_pipeline.py
- AnimatedSearchBar.jsx
- CategoryNavigationTabs.jsx
- PromoCardsCarousel.jsx
- auth.js
- DashitColors
- dependencies
- 📋 Master Client Discovery & Setup Checklist
- MainActivity.kt
- Keys
- Identifiable
- LiveTrackingMapScreen.kt
- AuthRepository
- AdminSession
- AddressSearchView
- PackageDescription
- StorefrontViewModel
- OrderRepository
- next.config.js
- AddProductSheetView
- StorefrontHomeView
- .format
- DASHit — Firestore Backend
- CartViewModel
- OrderComponents.kt
- LiveTrackingViewModel
- AddItemsSheet
- Distributor
- LoginProductMarquee.jsx
- String
- .saveResult
- index.js
- CatalogEnrichmentPipeline
- DASHit — Claude OS & Architecture Constitution
- Critical Gotchas & Pitfalls — DASHit
- Awesome Design Skill
- Image-to-Code Skill
- Playwright CLI Skill
- Taste Skill (Aesthetic & Editorial Judgment)
- Vercel Web Design Guidelines Skill
- Architecture & Data Flow — DASHit
- @capacitor/status-bar
- Session Handoff & Implementation Status
- seed-firestore.mjs
- README.md
- productPhotoMatch.js
- OnlinePayment
- StorefrontScreen.kt
- CartViewModel
- AdminTab
- EnrichmentDatabase
- CandidateSourceCollector
- AuthView
- DecodingKeys
- ShimmerView.swift
- DeliveryStage
- DASHitLiveActivityWidget.swift
- ProductCardView
- View
- SwiftUI
- ProductDetailSheet
- productPhotoFinder.js
- CartSheet.kt
- AdminDashboardView
- process_and_save_catalog_image
- _sign-in.php
- ProductCard.jsx
- hapticMedium
- tobacco.js
- ShimmerImage
- VoiceSearchRecognizer
- ActiveOrderStore
- OrderDetailSheetView
- OrderHistoryCard
- CachedAsyncImage
- DeliveredCelebrationSheet
- HapticsManager
- AuthService
- Outcome
- ProductPhotoStore
- String
- CouponTicket
- AddressPinPicker
- ScreenshotHooks
- StorefrontSearchView
- Icon
- DecodingKeys
- QuantityStepper
- LocalStorage
- CheckoutViewModel
- AddressMenuPopup
- LiveOrderFloatingTracker.jsx
- Hashable
- ProfileView
- CsvInventoryView.jsx
- ProductPhotoSheets.jsx
- api.js
- OrderStatusPill
- Foundation
- BarcodeCamera
- OpenFactsUpload
- CameraBarcodeReader
- FreeDeliveryCelebration
- FloatingCartBarView
- RiderMapMarker
- cn
- DASHit iOS — Native Swift (SwiftUI) Migration Plan & Architecture Blueprint
- OrderStageIcon
- AdminHomeView
- Coupon
- DecodingKeys
- CategoryCollageTile
- EnrichmentApiHandler
- AdminHomeView.swift
- AddToOpenFactsSheet
- Order
- Coordinator
- HelpSupportView
- Offset
- AuthError
- SplashView
- LiveActivityManager
- MapTracking.jsx
- HapticsManager
- .scene
- AddressBook
- SignInCodeEntry
- TabBarVisibility
- CategoriesView
- RootView
- What you need to set up (once)
- TicketShape
- test-seo-output.mjs
- .decode
- generate_and_assign_ai_packshot
- darkify.py
- CatalogueView.jsx
- xcyop.js
- HelpSupportScreen.kt
- TabItem
- Quote
- DASHit — Driver Fleet Multi-Drop Tracking & Admin CSV Suite Specification
- .dismiss
- CartDrawerSheet.jsx
- DashitLogo3D.jsx
- UIKit
- Dark Mode — Handoff
- Field
- OrderStatus
- CheckoutView
- HeroBannerView
- StartupLocation
- TodoRow
- SafariView
- csvInventory.js
- DASHitLiveActivityWidget
- UIColor
- LocationProvider
- OrderNotifications
- NSObject
- Tobacco
- DeliveryAddress
- Offer
- OrderProgressRail
- Phase
- Kind
- StoreConfig
- generate-sitemap.mjs
- SoundManager
- OrderLocation
- StoreStatus
- ProfileView.swift
- CatalogEnricherView.jsx
- AppHomeScreenMock.jsx
- storage.js
- Category
- assets/packshots/manifest.json
- products/packshots/manifest.json
- android-compose/gradlew
- button.jsx
- DASHit Agent Instructions
- ProductPhotoStore.swift
- Step
- seed-emulator-admin.mjs
- permissions.js
- CLAUDE_IOS_TAKEOVER_PROMPT.md
- firebase
- vaul
- run-antigravity.sh
- validate-seo.mjs
- products.js
- sync-and-push.sh
- generate_splash_screens.py
- OrderProcessingView.jsx
- FloatingCartBar.jsx
- canvas-confetti
- @capacitor/cli
- react-dom
- scripts
- generate_app_icons.py
- @react-three/fiber
- @remotion/player
- BklitAreaChart.jsx
- package_ipas.py
- server.js
- _app.js
- build-release.sh

## God Nodes (most connected - your core abstractions)
1. `AdminDashboardViewModel` - 88 edges
2. `Keys` - 48 edges
3. `getDb()` - 44 edges
4. `AdminDashboardView` - 39 edges
5. `hapticLight()` - 38 edges
6. `HapticsManager` - 34 edges
7. `OrderRepository` - 34 edges
8. `DeliveryStage` - 34 edges
9. `ProfessionalAdminDashboard()` - 34 edges
10. `StorefrontHomeView` - 33 edges

## Surprising Connections (you probably didn't know these)
- `.addressMenu` --calls--> `AddressMenuPopup`  [INFERRED]
  ios-swift/DASHit/App/RootView.swift → ios-swift/DASHit/Views/Address/AddressMenuPopup.swift
- `.body` --calls--> `PressableButtonStyle`  [INFERRED]
  ios-swift/DASHit/Views/Components/CategoryCollageTile.swift → ios-swift/DASHit/Core/DesignSystem/Motion.swift
- `.body` --calls--> `PressableButtonStyle`  [INFERRED]
  ios-swift/DASHit/Views/Components/FloatingCartBarView.swift → ios-swift/DASHit/Core/DesignSystem/Motion.swift
- `.thumbnails` --calls--> `CachedAsyncImage`  [INFERRED]
  ios-swift/DASHit/Views/Components/FloatingCartBarView.swift → ios-swift/DASHit/Core/Utils/ProductPhotoStore.swift
- `.emptyCount` --references--> `AdminDashboardViewModel`  [INFERRED]
  ios-swift/DASHit/Views/Admin/AdminDashboardView.swift → ios-swift/DASHit/ViewModels/AdminDashboardViewModel.swift

## Import Cycles
- None detected.

## Communities (248 total, 25 thin omitted)

### Community 0 - "FirestoreService"
Cohesion: 0.05
Nodes (42): CatalogueSync, .canFetchChangesOnly, .minimumExpectedCount, .syncedAt, DeferredListener, .inner, FirestoreService, OrderWriteError (+34 more)

### Community 1 - "db.js"
Cohesion: 0.08
Nodes (63): DistributorsView(), EMPTY_FORM, PhotoResultsSheet(), adjustSingleProductStock(), assignDefaultDistributor(), assignDriver(), broadcastProducts(), broadcastStoreConfig() (+55 more)

### Community 2 - "OnlinePayment"
Cohesion: 0.07
Nodes (45): AnyHashable, CheckedContinuation, Decodable, Int32, CreatedOrder, Once, OnlinePayment, .isAvailable (+37 more)

### Community 3 - "hapticLight"
Cohesion: 0.09
Nodes (32): AppFeatureShowcase(), LiveDeliveryMapPreview, CancelOrderModal(), CategoryGridSixPack(), SIX_PACK_CATEGORIES, CATEGORY_STRIP, CategoryScroller(), ModifyOrderModal() (+24 more)

### Community 4 - "AppDelegate"
Cohesion: 0.18
Nodes (9): AppDelegate, Any, Bool, UIScene, UISceneSession, UIWindow, UIApplication, UIApplicationDelegate (+1 more)

### Community 5 - "PressableButtonStyle"
Cohesion: 0.06
Nodes (39): FocusState, AppReveal, .canPlay, ButtonStyle, .pressable, LaunchReveal, LaunchRevealTrigger, PressableButtonStyle (+31 more)

### Community 6 - "InteractiveMapModal.jsx"
Cohesion: 0.11
Nodes (23): ALIAS_PRESETS, HUB_POS, InteractiveMapModal(), MapWithPin, POPULAR_AREAS, LocationPickerModal(), renderAliasIcon(), calculateDeliveryEta() (+15 more)

### Community 7 - "package.json"
Cohesion: 0.18
Nodes (10): autoprefixer, devDependencies, autoprefixer, postcss, tailwindcss, tailwindcss, name, private (+2 more)

### Community 8 - "AdminDashboardViewModel"
Cohesion: 0.06
Nodes (42): .body, AdminDashboardViewModel, .activeOrdersCount, .bestSellers, .deletedProductIds, .filteredOrders, .filteredProducts, .lowStockCount (+34 more)

### Community 9 - "RemotionDeliveryBadge.jsx"
Cohesion: 0.22
Nodes (4): DeliveryScooterComposition(), Player, Player, StopwatchGuaranteeComposition()

### Community 10 - "ExampleInstrumentedTest.java"
Cohesion: 0.33
Nodes (5): ExampleInstrumentedTest, ExampleUnitTest, androidx.test.ext.junit.runners.AndroidJUnit4, org.junit.runner.RunWith, org.junit.Test

### Community 11 - ".remember"
Cohesion: 0.08
Nodes (44): blurReveal(), Modifier, LaunchReveal, pressable(), slideInFromLeft(), UserProfile, AuthButton(), AuthField() (+36 more)

### Community 12 - "MainActivity"
Cohesion: 0.21
Nodes (8): MainActivity, android.content.Intent, android.content.res.Configuration, android.os.Bundle, android.view.View, com.getcapacitor.BridgeActivity, com.google.android.gms.auth.api.signin.GoogleSignInClient, Override

### Community 13 - "build-app.sh"
Cohesion: 0.40
Nodes (4): ANDROID_HOME, JAVA_HOME, PATH, build-app.sh script

### Community 14 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 15 - "test_enrichment_pipeline.py"
Cohesion: 0.09
Nodes (36): Persistent Database & Aggressive Multi-Tier Caching for DASHit Catalog…, are_pack_sizes_compatible(), clean_barcode(), extract_variant(), normalize_product_record(), parse_pack_size(), Any, Product Data Normalizer for DASHit Catalog Enrichment. Provides canonical… (+28 more)

### Community 20 - "auth.js"
Cohesion: 0.10
Nodes (43): CookieConsentBanner(), cacheLocalUser(), completeGoogleRedirect(), completeGoogleSignIn(), deleteAccount(), ensureRecaptcha(), ensureUserProfile(), getLocalUser() (+35 more)

### Community 21 - "DashitColors"
Cohesion: 0.09
Nodes (35): DashitColors, Modifier, Product, ProductCard(), Modifier, QuantityStepper(), StepperSize, COMPACT (+27 more)

### Community 22 - "dependencies"
Cohesion: 0.05
Nodes (37): animejs, @capacitor/android, @capacitor/app, @capacitor/core, @capacitor/haptics, @capacitor/ios, @capacitor/local-notifications, @capacitor/splash-screen (+29 more)

### Community 23 - "📋 Master Client Discovery & Setup Checklist"
Cohesion: 0.18
Nodes (10): 📅 15-Day Milestone Tracker, **ADMIN PAGE**, 📋 Master Client Discovery & Setup Checklist, SECTION 1: Brand & Identity, SECTION 2: Dark Room & Delivery Zone (Anantnag), SECTION 3: Scooter Delivery Team, SECTION 4: Product Catalog & Categories, SECTION 5: Pricing, Charges & Order Rules (+2 more)

### Community 24 - "MainActivity.kt"
Cohesion: 0.07
Nodes (23): AppReveal, DashitTheme(), DeliveryEta, ListenerRegistration, StateFlow, Quote, State, StoreStatus (+15 more)

### Community 25 - "Keys"
Cohesion: 0.05
Nodes (44): Keys, address, alias, couponCode, createdAt, deliveryAddress, deliveryFee, discount (+36 more)

### Community 26 - "Identifiable"
Cohesion: 0.09
Nodes (35): AnyCancellable, Identifiable, CatalogueStore, .products, .remoteCategories, .searchEntries, CategoryTile, Department (+27 more)

### Community 27 - "LiveTrackingMapScreen.kt"
Cohesion: 0.11
Nodes (39): AddressSelectionSheet(), DeliveryAddress, SheetState, OsmPinPickerView(), SavedAddressItem, bearing(), ChangeWindowRow(), darkMapFilter() (+31 more)

### Community 28 - "AuthRepository"
Cohesion: 0.10
Nodes (17): AuthRepository, Context, Exception, FirebaseFirestore, JSONObject, SharedPreferences, StateFlow, UserProfile (+9 more)

### Community 30 - "AdminSession"
Cohesion: 0.07
Nodes (28): App, AuthStateDidChangeListenerHandle, Field, FirebaseCore, AdminSession, AdminSignInView, .body, DASHitAdminApp (+20 more)

### Community 31 - "AddressSearchView"
Cohesion: 0.09
Nodes (27): AnantnagLocality, .coordinate, .id, CLLocationCoordinate2D, Double, String, AddressSearchModel, .localities (+19 more)

### Community 33 - "StorefrontViewModel"
Cohesion: 0.09
Nodes (23): Category, CategoryTile, Offer, NutritionFact, ProductVariant, shopCategory(), CatalogSeed, Product (+15 more)

### Community 34 - "OrderRepository"
Cohesion: 0.11
Nodes (19): DeliveryAddress, CartItem, Context, DriverLiveTracking, Exception, ListenerRegistration, Order, SharedPreferences (+11 more)

### Community 36 - "AddProductSheetView"
Cohesion: 0.11
Nodes (27): AudioToolbox, AddDriverSheetView, .body, AddOfferSheetView, .body, AddProductSheetView, .body, .canSave (+19 more)

### Community 37 - "StorefrontHomeView"
Cohesion: 0.09
Nodes (27): HeaderBackdrop, .body, HomeChromeState, PinnedSearchBackdrop, .body, StatusBarBackdrop, .body, StorefrontHomeView (+19 more)

### Community 38 - ".format"
Cohesion: 0.08
Nodes (30): CurrencyFormatter, Double, Int, String, CartLineRow, .body, CartSheetView, .billCard (+22 more)

### Community 39 - "DASHit — Firestore Backend"
Cohesion: 0.22
Nodes (8): 1. One-time setup (you must do these — I cannot access your console), 2. Data model, 3. Security model, 4. Realtime, without Socket.io, 5. Known constraints on Spark, 6. Native (Capacitor) note for Phone Auth, DASHit — Firestore Backend, Why live tracking is a subcollection, not fields on the order

### Community 40 - "CartViewModel"
Cohesion: 0.10
Nodes (16): CartBillBreakdown, CartItem, Coupon, Product, AddItemsSheet(), AisleChip(), Order, Product (+8 more)

### Community 41 - "OrderComponents.kt"
Cohesion: 0.09
Nodes (24): DriverLiveTracking, Order, OrderStatus, CANCELLED, DELIVERED, OUT_FOR_DELIVERY, PACKING, PLACED (+16 more)

### Community 42 - "LiveTrackingViewModel"
Cohesion: 0.11
Nodes (17): RoadRouter, CLLocationCoordinate2D, MKMapRect, LiveTrackingViewModel, Bool, CLLocationCoordinate2D, DriverLiveTracking, Int (+9 more)

### Community 43 - "AddItemsSheet"
Cohesion: 0.09
Nodes (27): AddableLine, .name, .originalPrice, .price, .unit, AddItemsSheet, .addedCount, .aisleChips (+19 more)

### Community 44 - "Distributor"
Cohesion: 0.10
Nodes (21): Distributor, .isReal, .isSelf, Bool, Decoder, Set, String, AdminCSVImportView (+13 more)

### Community 48 - "String"
Cohesion: 0.14
Nodes (18): CSVStockImport, Item, .currentStock, .hasNewPhoto, .isNew, .shownPrice, Mode, add (+10 more)

### Community 49 - ".saveResult"
Cohesion: 0.09
Nodes (18): Driver, Double, Int, String, offers, Any, Bool, Error (+10 more)

### Community 50 - "index.js"
Cohesion: 0.12
Nodes (10): BreadcrumbJsonLd(), GroceryStoreJsonLd(), OrganizationJsonLd(), WebSiteJsonLd(), SEO(), goBack(), historyDepth(), HelpPage() (+2 more)

### Community 51 - "CatalogEnrichmentPipeline"
Cohesion: 0.09
Nodes (17): auto_detect_columns(), CatalogEnrichmentPipeline, Any, Generates products_enriched.csv format:…, Generates failed_products.csv format:…, Administrator manual override: choose candidate image and auto-approve., Admin marks product as rejected., Processes manual user image upload for a product. (+9 more)

### Community 64 - "DASHit — Claude OS & Architecture Constitution"
Cohesion: 0.20
Nodes (9): 1. Knowledge Graph Navigation (Graphify), 2. Progressive Context Router (Load ONLY when relevant), 3. Strict Project Constraints (NEVER VIOLATE), 4. Tech Stack & Key Locations, 5. Skills Guidance (On-Demand Only), 6. Development & Verification Commands, 7. Execution & Token Efficiency Rules, 8. App Store & Google Play Compliance (Mandatory Gate) (+1 more)

### Community 65 - "Critical Gotchas & Pitfalls — DASHit"
Cohesion: 0.14
Nodes (13): 10. Native iOS (ios-swift): Three Ways a Stock File Quit the Admin App, 1. No Server-Side Next.js Features in Mobile Apps, 2. Physical Device Verification vs GitHub Releases, 3. Capacitor Asset Syncing Trap, 4. Android Haptic Motor Harshness, 5. Virtual Keyboard & Floating Docks, 6. Safe Area Insets, 6b. Modal Sheets: Background Scroll & the vaul Conflict (+5 more)

### Community 66 - "Awesome Design Skill"
Cohesion: 0.33
Nodes (5): Awesome Design Skill, Core Rules & Patterns, Purpose, When NOT to Use, When to Use

### Community 67 - "Image-to-Code Skill"
Cohesion: 0.33
Nodes (5): Image-to-Code Skill, Purpose, When NOT to Use, When to Use, Workflow & Guidelines

### Community 68 - "Playwright CLI Skill"
Cohesion: 0.33
Nodes (5): Core Commands & Workflow, Playwright CLI Skill, Purpose, When NOT to Use, When to Use

### Community 69 - "Taste Skill (Aesthetic & Editorial Judgment)"
Cohesion: 0.33
Nodes (5): Purpose, Taste Skill (Aesthetic & Editorial Judgment), The Anti-Slop Aesthetic Checklist, When NOT to Use, When to Use

### Community 70 - "Vercel Web Design Guidelines Skill"
Cohesion: 0.33
Nodes (5): Essential Principles, Purpose, Vercel Web Design Guidelines Skill, When NOT to Use, When to Use

### Community 71 - "Architecture & Data Flow — DASHit"
Cohesion: 0.33
Nodes (5): 1. System Overview, 2. Client Architecture & State Flow, 3. UI Component Hierarchy & Docking System, 4. Hardware & Native Bridge, Architecture & Data Flow — DASHit

### Community 73 - "Session Handoff & Implementation Status"
Cohesion: 0.11
Nodes (18): 0. Where the work stopped (read this first), 1. Backend: Express + Socket.io → Firestore, 2. How auth works now, 3. What the USER must do (blocked on them, not on you), 4. Earlier work this session (all VERIFIED, all shipped to the Pixel), 4b. This session: admin.js fully migrated + three real bugs fixed, 4c. `src/lib/openFoodFacts.js` (new), 5. Next tasks, in order (+10 more)

### Community 74 - "seed-firestore.mjs"
Cohesion: 0.43
Nodes (6): chunk(), here, loadEnv(), main(), readJson(), root

### Community 76 - "productPhotoMatch.js"
Cohesion: 0.13
Nodes (25): AddProductView(), ProductImage(), productImageUrl(), brandMatches(), brandWords(), chooseSearchMatch(), CORPORATE_WORDS, hasWord() (+17 more)

### Community 77 - "OnlinePayment"
Cohesion: 0.14
Nodes (19): Failed, Activity, Bitmap, Context, Exception, Intent, JSONObject, Razorpay (+11 more)

### Community 78 - "StorefrontScreen.kt"
Cohesion: 0.11
Nodes (26): BottomNavBar(), getTabIcons(), ImageVector, Modifier, NavigationTab, CATEGORIES, HOME, ORDERS (+18 more)

### Community 79 - "CartViewModel"
Cohesion: 0.12
Nodes (13): CartViewModel, .appliedCoupon, .items, .totalQuantity, Bool, CartBillBreakdown, CartItem, Coupon (+5 more)

### Community 80 - "AdminTab"
Cohesion: 0.07
Nodes (28): CaseIterable, AdminSortOption, distributorAsc, distributorDesc, .id, nameAsc, stockAsc, stockDesc (+20 more)

### Community 81 - "EnrichmentDatabase"
Cohesion: 0.16
Nodes (7): Connection, EnrichmentDatabase, Any, Look up previously verified product to avoid redundant processing., Saves or updates enriched product in persistent catalog., SQLite-backed persistent catalog, candidate registry, and caching engine., Recounts status numbers for a job from actual items and updates job record.

### Community 82 - "CandidateSourceCollector"
Cohesion: 0.10
Nodes (16): CandidateSourceCollector, _fetch_json(), _is_safe_url(), MasterAssetBankRegistry, Any, Path, _rate_limit(), Multi-Source Candidate Image & Metadata Retrieval for DASHit. Source Priority:… (+8 more)

### Community 83 - "AuthView"
Cohesion: 0.11
Nodes (21): AttributedString, AuthFieldStyle, AuthView, .backdrop, .isReady, .isSignUp, .legalLine, .legalText (+13 more)

### Community 84 - "DecodingKeys"
Cohesion: 0.07
Nodes (27): DecodingKeys, ageRestricted, badge, barcode, cat, category, distributor, id (+19 more)

### Community 85 - "ShimmerView.swift"
Cohesion: 0.15
Nodes (23): CategorySidebarSkeleton, .body, HomeFeedSkeleton, .body, OrderListSkeleton, .body, ProductCardSkeleton, .body (+15 more)

### Community 86 - "DeliveryStage"
Cohesion: 0.14
Nodes (21): ActivityAttributes, .title, ContentState, .stage, DASHitOrderAttributes, DeliveryStage, .badgeText, cancelled (+13 more)

### Community 87 - "DASHitLiveActivityWidget.swift"
Cohesion: 0.14
Nodes (24): ActivityViewContext, CompactETAView, .body, CountdownText, .body, .body, ExpandedETAView, .body (+16 more)

### Community 88 - "ProductCardView"
Cohesion: 0.10
Nodes (22): ProductCardView, .ageTag, .body, .discountTag, .hasVariants, .imageWell, .tileShape, Bool (+14 more)

### Community 89 - "View"
Cohesion: 0.17
Nodes (18): BrandMapMarker, .body, DeliveryCodeRow, .body, LiveTrackingMapView, .body, .map, .mapScreen (+10 more)

### Community 90 - "SwiftUI"
Cohesion: 0.10
Nodes (14): AVFoundation, Combine, FirebaseFirestore, CGFloat, Color, View, ProductRailView, .body (+6 more)

### Community 91 - "ProductDetailSheet"
Cohesion: 0.10
Nodes (21): ProductDetailSheet, .body, .detailsList, .discountPercent, .lineId, .originalPrice, .price, .selectedVariant (+13 more)

### Community 92 - "productPhotoFinder.js"
Cohesion: 0.19
Nodes (22): findInIndianCatalog(), VERIFIED_INDIAN_BARCODES, classifyCategory(), createRateLimiter(), fetchOffProduct(), getJson(), QUEUES, searchOffByBarcode() (+14 more)

### Community 93 - "CartSheet.kt"
Cohesion: 0.14
Nodes (20): DashitMotion, isAgeRestricted(), BillDetailsCard(), BillRow(), CartItemsCard(), CartLineRow(), CartSheet(), CouponCard() (+12 more)

### Community 94 - "AdminDashboardView"
Cohesion: 0.13
Nodes (14): AdminDashboardView, .addProductDirectContent, .distributorsTabContent, .emptyCount, .metricsStripView, .ordersTabContent, .ridersTabContent, .sidebar (+6 more)

### Community 95 - "process_and_save_catalog_image"
Cohesion: 0.14
Nodes (18): build_packshot_library(), Build script for DASHit Curated Master FMCG Asset Bank. Downloads source…, compile_all(), Compiles and bundles photos for ALL products in DASHit directly inside the app.…, get_rembg_session(), normalize_to_square(), process_and_save_catalog_image(), Image (+10 more)

### Community 96 - "_sign-in.php"
Cohesion: 0.12
Nodes (13): dashit_base64url(), dashit_firebase_custom_token(), dashit_forget_old_records(), dashit_is_review_mobile(), dashit_normalized_mobile(), dashit_private_dir(), dashit_service_account(), dashit_sign_in_config() (+5 more)

### Community 97 - "ProductCard.jsx"
Cohesion: 0.16
Nodes (14): CAMPAIGN_CATEGORIES, CAMPAIGN_PRODUCTS, triggerFlyToCart(), ProductCard(), ProductCardStepper(), variantCartId(), VariantSelectorModal(), useAgeGate() (+6 more)

### Community 98 - "hapticMedium"
Cohesion: 0.17
Nodes (15): AVAILABLE_COUPONS, CouponsDrawer(), LocationPermissionModal(), OrderingForSomeoneElseModal(), PaymentMethodModal(), DECLARATIONS, TobaccoDeclarationSheet(), DraggableSheet() (+7 more)

### Community 99 - "tobacco.js"
Cohesion: 0.15
Nodes (18): AgeGateContext, AgeGateProvider(), FALLBACK, AGE_RESTRICTED_CATEGORIES, confirmAge(), hasConfirmedAge(), isAgeRestricted(), MIN_AGE (+10 more)

### Community 100 - "ShimmerImage"
Cohesion: 0.22
Nodes (20): CategoriesScreen(), CartViewModel, CategoryTile, StorefrontViewModel, SidebarItem(), CategorySidebarSkeleton(), HomeFeedSkeleton(), Modifier (+12 more)

### Community 101 - "VoiceSearchRecognizer"
Cohesion: 0.15
Nodes (15): AVAudioPCMBuffer, Bool, CGFloat, String, TimeInterval, Timer, Void, VoiceSearchRecognizer (+7 more)

### Community 102 - "ActiveOrderStore"
Cohesion: 0.18
Nodes (8): .body, String, ActiveOrderStore, Bool, DriverLiveTracking, ListenerRegistration, Order, String

### Community 103 - "OrderDetailSheetView"
Cohesion: 0.12
Nodes (16): OrderItemGroup, .id, CartItem, Order, .detailToolbar, OrderDetailSheetView, .body, .isAllPacked (+8 more)

### Community 104 - "OrderHistoryCard"
Cohesion: 0.15
Nodes (17): Order, .placedDateText, OrderHistoryCard, .cardShape, .stage, .statusColor, .units, OrderHistoryStore (+9 more)

### Community 105 - "CachedAsyncImage"
Cohesion: 0.16
Nodes (18): AsyncImagePhase, CachedAsyncImage, Content, .body, .productPhoto, ShimmerView, OrderDetailSheet, .body (+10 more)

### Community 106 - "DeliveredCelebrationSheet"
Cohesion: 0.13
Nodes (19): CGSize, CheckmarkShape, ConfettiBurst, .body, DeliveredCelebrationSheet, .body, .emblem, .summary (+11 more)

### Community 107 - "HapticsManager"
Cohesion: 0.14
Nodes (6): CHHapticEngine, CHHapticEvent, Float, HapticsManager, Bool, TimeInterval

### Community 108 - "AuthService"
Cohesion: 0.21
Nodes (13): AuthService, .firebaseUID, .isReadyToOrder, .needsName, CodeSent, CodeVerified, ServerError, Any (+5 more)

### Community 109 - "Outcome"
Cohesion: 0.17
Nodes (14): product, Outcome, busy, found, notAPackBarcode, notFound, offline, .pack (+6 more)

### Community 110 - "ProductPhotoStore"
Cohesion: 0.18
Nodes (11): .body, ProductPhotoStore, Bool, CGFloat, Never, Task, UIImage, URL (+3 more)

### Community 111 - "String"
Cohesion: 0.22
Nodes (8): Entry, ProductSearch, RecentSearches, Int, Product, String, Text, Substring

### Community 112 - "CouponTicket"
Cohesion: 0.13
Nodes (20): CouponsSheetView, .bestCode, .body, .codeField, .orderedCoupons, .subtotal, CouponTicket, .details (+12 more)

### Community 113 - "AddressPinPicker"
Cohesion: 0.15
Nodes (17): AddressPinPicker, .body, .canSave, .centrePin, .form, .map, .quote, .serviceability (+9 more)

### Community 114 - "ScreenshotHooks"
Cohesion: 0.10
Nodes (20): ScreenshotHooks, .adminDemo, .adminOpenOrder, .adminTab, .demoCart, .demoOrder, .demoOrderPacking, .demoOrderPlaced (+12 more)

### Community 115 - "StorefrontSearchView"
Cohesion: 0.24
Nodes (14): StorefrontSearchView, .idle, .isShowingResults, .results, .searchBar, .suggestions, .tobaccoList, .trimmedQuery (+6 more)

### Community 116 - "Icon"
Cohesion: 0.19
Nodes (18): AddressCard(), CheckoutSheet(), findActivity(), GuaranteeCard(), android, CartViewModel, DeliveryAddress, OnlinePayment (+10 more)

### Community 117 - "DecodingKeys"
Cohesion: 0.12
Nodes (18): CodingKey, DecodingKeys, createdAt, defaultAddress, displayName, email, id, lastLoginAt (+10 more)

### Community 118 - "QuantityStepper"
Cohesion: 0.12
Nodes (17): Font, QuantityStepper, .body, .glyphWidth, .height, .labelFont, .shape, .width (+9 more)

### Community 119 - "LocalStorage"
Cohesion: 0.12
Nodes (4): LocalStorage, CartItem, DeliveryAddress, UserProfile

### Community 120 - "CheckoutViewModel"
Cohesion: 0.14
Nodes (14): CheckoutViewModel, .chosenApp, .deliveryQuote, Bool, CartViewModel, DeliveryAddress, DeliveryEta, OnlinePayment (+6 more)

### Community 121 - "AddressMenuPopup"
Cohesion: 0.19
Nodes (13): AddressMenuPopup, .body, .cardShape, ScreenAnchor, Bool, CGFloat, CGRect, Int (+5 more)

### Community 122 - "LiveOrderFloatingTracker.jsx"
Cohesion: 0.19
Nodes (16): DeliveryStatusIcon(), SIZES, statusToMark(), advanceStatus(), LiveOrderFloatingTracker(), resolveOrderStatusDetails(), stageIndexFor(), STAGES (+8 more)

### Community 123 - "Hashable"
Cohesion: 0.24
Nodes (13): Codable, Hashable, NutritionFact, Product, .discountPercent, .isAgeRestricted, .isAvailable, ProductVariant (+5 more)

### Community 124 - "ProfileView"
Cohesion: 0.20
Nodes (13): ProfileView, .body, .cardShape, .rowDivider, .signedOutCard, .signOutAndDelete, .versionLine, Bool (+5 more)

### Community 125 - "CsvInventoryView.jsx"
Cohesion: 0.15
Nodes (14): AdminSheet(), CsvInventoryView(), FILTERS, ImportRow, nextFrame(), readLastSource(), rememberSource(), StockSourceSheet() (+6 more)

### Community 126 - "ProductPhotoSheets.jsx"
Cohesion: 0.22
Nodes (16): NeedsPhotoRow(), NeedsPhotoSheet(), downloadCsv(), normaliseImageUrl(), photoListToCsv(), setManualProductPhoto(), setManualProductPhotos(), checkPhoto() (+8 more)

### Community 127 - "api.js"
Cohesion: 0.18
Nodes (14): currentUid(), ensureAuthenticatedUid(), fetchAdminOrders(), fetchCatalogue(), fetchUserOrderHistory(), readLocal(), submitOrder(), updateAdminOrderStatus() (+6 more)

### Community 128 - "OrderStatusPill"
Cohesion: 0.12
Nodes (17): OrderStatusPill, .accent, .body, .etaMinutes, .itemCount, .progress, .ring, .stage (+9 more)

### Community 129 - "Foundation"
Cohesion: 0.18
Nodes (5): ActivityKit, CoreLocation, Foundation, CatalogSeed, Product

### Community 130 - "BarcodeCamera"
Cohesion: 0.17
Nodes (9): AVCaptureConnection, AVCaptureDevice, AVCaptureMetadataOutput, AVCaptureMetadataOutputObjectsDelegate, AVCaptureVideoPreviewLayer, AVMetadataObject, BarcodeCamera, CameraPreviewController (+1 more)

### Community 131 - "OpenFactsUpload"
Cohesion: 0.31
Nodes (9): Failure, .errorDescription, OpenFactsUpload, Any, Data, Int, String, UIImage (+1 more)

### Community 132 - "CameraBarcodeReader"
Cohesion: 0.21
Nodes (11): BarcodeScannerSheet, .body, .guide, CameraBarcodeReader, .hasLight, Binding, Bool, Context (+3 more)

### Community 133 - "FreeDeliveryCelebration"
Cohesion: 0.18
Nodes (12): FreeDeliveryCelebration, .interfaceStyle, FreeDeliveryToast, .body, FreeDeliveryToastModel, FreeDeliveryToastOverlay, .body, Never (+4 more)

### Community 134 - "FloatingCartBarView"
Cohesion: 0.13
Nodes (15): FloatingCartBarView, .body, .pill, .subtitle, .thumbnails, String, Void, AgeGateSheet (+7 more)

### Community 135 - "RiderMapMarker"
Cohesion: 0.16
Nodes (13): DestinationMapMarker, .body, RiderArtwork, RiderMapMarker, .body, .spriteName, CGRect, CLLocationCoordinate2D (+5 more)

### Community 136 - "cn"
Cohesion: 0.15
Nodes (16): react, react, Badge(), badgeVariants, Card, CardContent, CardDescription, CardFooter (+8 more)

### Community 137 - "DASHit iOS — Native Swift (SwiftUI) Migration Plan & Architecture Blueprint"
Cohesion: 0.12
Nodes (15): 1. Executive Summary & Objective, 2. Shared Backend & Data Contract (Zero Backend Breaking Changes), 3. Native iOS Project Architecture, 4.1 Authentication & Anonymous State Machine (`AuthService.swift`), 4.2 Dynamic Island & Lock Screen Live Activities (`ActivityKit`), 4.3 Native MapKit Rider Tracking (`LiveTrackingMapView.swift`), 4.4 Haptics & Tactile Physics (`HapticsManager.swift`), 4. Key Subsystems: Implementation Specifications (+7 more)

### Community 138 - "OrderStageIcon"
Cohesion: 0.23
Nodes (9): GraphicsContext, Ease, Kind, packing, received, OrderStageIcon, .body, Color (+1 more)

### Community 139 - "AdminHomeView"
Cohesion: 0.23
Nodes (12): GridItem, AdminHomeView, .body, .chartColumns, .greeting, .greetingText, .isWide, .statColumns (+4 more)

### Community 140 - "Coupon"
Cohesion: 0.27
Nodes (9): CartBillBreakdown, CartItem, .quantity, Coupon, Bool, Decoder, Double, Int (+1 more)

### Community 141 - "DecodingKeys"
Cohesion: 0.12
Nodes (16): DecodingKeys, barcode, cat, category, id, image, img, maxQuantity (+8 more)

### Community 142 - "CategoryCollageTile"
Cohesion: 0.18
Nodes (14): CategoryCard, .tileShape, CategoryCollageTile, .body, .collage, .extraCount, .shownCount, .tileShape (+6 more)

### Community 143 - "EnrichmentApiHandler"
Cohesion: 0.17
Nodes (9): BaseHTTPRequestHandler, HTTPServer, EnrichmentApiHandler, REST API Service for DASHit Catalog Enrichment Pipeline. Uses Python standard…, Handles requests in a separate thread., Routes and dispatches REST API calls., run_server(), ThreadedHTTPServer (+1 more)

### Community 144 - "AdminHomeView.swift"
Cohesion: 0.19
Nodes (12): Charts, .bestSellersChart, .hourChart, .salesChart, .stockChart, AdminStyle, ChartCard, EmptyChart (+4 more)

### Community 145 - "AddToOpenFactsSheet"
Cohesion: 0.26
Nodes (8): Login, OpenFactsAccount, AddToOpenFactsSheet, .body, .canAdd, Bool, String, PhotosPickerItem

### Community 146 - "Order"
Cohesion: 0.24
Nodes (10): DriverLiveTracking, .coordinate, Order, .modifyWindowEnd, CartItem, CLLocationCoordinate2D, Date, Double (+2 more)

### Community 147 - "Coordinator"
Cohesion: 0.22
Nodes (9): CameraCapture, Coordinator, Any, Context, UIImage, Void, UIImagePickerController, UIImagePickerControllerDelegate (+1 more)

### Community 148 - "HelpSupportView"
Cohesion: 0.21
Nodes (12): HelpSupportView, .body, .header, LegalPage, .id, Question, .id, SupportContact (+4 more)

### Community 149 - "Offset"
Cohesion: 0.32
Nodes (13): drawPacking(), drawReceived(), easeInOut(), easeOut(), easeOutBack(), Modifier, OrderStageIcon(), segment() (+5 more)

### Community 150 - "AuthError"
Cohesion: 0.14
Nodes (12): FirebaseAuth, AuthError, .errorDescription, invalidMobile, missingName, network, notSignedIn, other (+4 more)

### Community 151 - "SplashView"
Cohesion: 0.29
Nodes (7): SplashView, .body, CGFloat, Double, Int, Void, Animation

### Community 152 - "LiveActivityManager"
Cohesion: 0.26
Nodes (7): LiveActivityManager, Activity, Date, DriverLiveTracking, Int, Order, String

### Community 153 - "MapTracking.jsx"
Cohesion: 0.32
Nodes (11): ANANTNAG_ROUTE_COORDS, createDashitRiderIcon(), createDestinationIcon(), createStoreIcon(), LiveDeliveryMapPreview(), create3DDestinationIcon(), create3DRiderIcon(), MapTracking() (+3 more)

### Community 154 - "HapticsManager"
Cohesion: 0.45
Nodes (4): HapticsManager, Context, View, Vibrator

### Community 155 - ".scene"
Cohesion: 0.17
Nodes (11): CAPBridgeViewController, MainViewController, SceneDelegate, Set, UIScene, UISceneSession, UIWindow, NSUserActivity (+3 more)

### Community 156 - "AddressBook"
Cohesion: 0.33
Nodes (6): AddressBook, Bool, DeliveryAddress, String, .savedRows, DeliveryAddress

### Community 157 - "SignInCodeEntry"
Cohesion: 0.23
Nodes (10): ResendCodeButton, .body, SignInCodeEntry, .body, Bool, Color, Date, Int (+2 more)

### Community 158 - "TabBarVisibility"
Cohesion: 0.22
Nodes (5): FollowsTabBar, CGFloat, Content, TabBarVisibility, View

### Community 159 - "CategoriesView"
Cohesion: 0.18
Nodes (11): CategoriesView, .isLoadingCatalogue, .products, .selectedTile, .sidebar, .tiles, Bool, CategoryTile (+3 more)

### Community 160 - "RootView"
Cohesion: 0.18
Nodes (11): ColorScheme, .body, RootView, .addressMenu, .colorScheme, .orderPill, .tabSelection, Binding (+3 more)

### Community 161 - "What you need to set up (once)"
Cohesion: 0.17
Nodes (11): 1. WhatsApp: phone number ID and a permanent token, 2. WhatsApp: the message template, 3. Firebase: the service account key, 4. Put the secrets on Hostinger, 5. Check it works, 6. App Store review, 7. Tighten the Firestore rules (last), How it works (+3 more)

### Community 162 - "TicketShape"
Cohesion: 0.23
Nodes (8): InsettableShape, .body, CGFloat, CGRect, Path, TicketShape, VerticalLine, Shape

### Community 163 - "test-seo-output.mjs"
Cohesion: 0.15
Nodes (11): delHtml, __dirname, __filename, helpHtml, homeHtml, OUT, privHtml, robots (+3 more)

### Community 164 - ".decode"
Cohesion: 0.29
Nodes (6): Data, KeyedDecodingContainer, Double, Int, String, Key

### Community 165 - "generate_and_assign_ai_packshot"
Cohesion: 0.27
Nodes (11): build_packshot_prompt(), generate_and_assign_ai_packshot(), generate_fallback_studio_packshot(), generate_with_google_imagen(), get_curated_studio_packshot(), Any, Constructs an optimized commercial e-commerce studio packshot prompt., Generates a commercial-grade 1024x1024 studio packshot on seamless pure white… (+3 more)

### Community 166 - "darkify.py"
Cohesion: 0.29
Nodes (11): family(), in_scope(), main(), map_utility(), process_file(), process_literal(), Map a bare utility (no variant prefix) to its dark counterpart., Return the rewritten class-list body, plus the additions made. (+3 more)

### Community 167 - "CatalogueView.jsx"
Cohesion: 0.33
Nodes (9): CatalogueView(), InventoryView(), CATALOGUE_CSV_COLUMNS, generateCsvString(), INVENTORY_CSV_COLUMNS, RFC-4180, ORDERS_CSV_COLUMNS, triggerCsvDownload() (+1 more)

### Community 168 - "xcyop.js"
Cohesion: 0.11
Nodes (23): AdminLayout(), BatchInwardView(), ImporterView(), OffersView(), PhotoSearchStatus(), StoreControlsView(), BarcodeScannerView(), playBeepSound() (+15 more)

### Community 169 - "HelpSupportScreen.kt"
Cohesion: 0.35
Nodes (8): ContactRow(), HelpSupportScreen(), Color, Context, ImageVector, Intent, Question, SupportContact

### Community 170 - "TabItem"
Cohesion: 0.22
Nodes (9): CustomTabBar, .body, Int, TabItem, categories, home, .iconName, orderAgain (+1 more)

### Community 171 - "Quote"
Cohesion: 0.27
Nodes (9): DeliveryEta, Quote, .distanceText, .shortDistanceText, Bool, CLLocationCoordinate2D, Double, Int (+1 more)

### Community 172 - "DASHit — Driver Fleet Multi-Drop Tracking & Admin CSV Suite Specification"
Cohesion: 0.04
Nodes (47): 10.1 Multi-Drop Queue & Map Verification, 10.2 GPS Telemetry & Dynamic ETA Verification, 10.3 CSV Importer Review & Exporter Verification, 10. Testing & Verification Protocol, 1. System Architecture & Core Principles, 2.1 Problem Definition, 2.2 Functional Requirements, 2.3 Data Structure & Order Sequence State (+39 more)

### Community 173 - ".dismiss"
Cohesion: 0.24
Nodes (7): DeleteAccountView, .body, .canContinue, .isBusy, .mobile, Bool, String

### Community 174 - "CartDrawerSheet.jsx"
Cohesion: 0.27
Nodes (7): CartDrawerSheet(), EmptyCartState(), SUGGESTED_SEARCH_CHIPS, watchStoreConfig(), isFirebaseConfigured, useStoreDetails(), useStoreStatus()

### Community 175 - "DashitLogo3D.jsx"
Cohesion: 0.29
Nodes (6): DashitLogo3D(), DASHIT_MARK_SVG, MARK_NAVY, MARK_ORANGE, hasWebGL(), HeroObject3D()

### Community 176 - "UIKit"
Cohesion: 0.22
Nodes (5): Capacitor, CoreHaptics, PhotosUI, Security, UIKit

### Community 177 - "Dark Mode — Handoff"
Cohesion: 0.20
Nodes (9): 1. What already exists, 2. What was done, 3. Project constraints you must respect, 4. Commands, Bulk styling (applied and corrected), Dark Mode — Handoff, Still open, Theme engine (done, verified working) (+1 more)

### Community 178 - "Field"
Cohesion: 0.20
Nodes (10): Field, barcode, brand, category, image, mrp, name, price (+2 more)

### Community 179 - "OrderStatus"
Cohesion: 0.20
Nodes (10): OrderStatus, cancelled, delivered, .iconName, outForDelivery, packing, placed, .progress (+2 more)

### Community 180 - "CheckoutView"
Cohesion: 0.22
Nodes (7): DeliveryEta, Int, .body, CheckoutView, .deliveryHeadline, String, .headerEta

### Community 181 - "HeroBannerView"
Cohesion: 0.29
Nodes (8): HeroBannerView, .copy, HeroCarouselView, .body, CGFloat, Offer, String, Void

### Community 182 - "StartupLocation"
Cohesion: 0.33
Nodes (5): CLLocationManagerDelegate, StartupLocation, CLLocation, CLLocationManager, Error

### Community 183 - "TodoRow"
Cohesion: 0.22
Nodes (8): .todoCard, .body, .body, CGFloat, Color, Void, TodoRow, .body

### Community 184 - "SafariView"
Cohesion: 0.28
Nodes (6): .body, CGFloat, SafariView, Context, SFSafariViewController, UIViewControllerRepresentable

### Community 185 - "csvInventory.js"
Cohesion: 0.19
Nodes (16): buildImportPlan(), CANONICAL_FIELDS, DELIMITERS, detectDelimiter(), EXPORT_COLUMNS, HEADER_ALIASES, headerScore(), RFC-4180 (+8 more)

### Community 186 - "DASHitLiveActivityWidget"
Cohesion: 0.22
Nodes (8): DASHitLiveActivityWidget, DASHitWidgetsBundle, .body, Widget, Widget, WidgetBundle, WidgetConfiguration, WidgetKit

### Community 187 - "UIColor"
Cohesion: 0.43
Nodes (4): Color, UIColor, Color, UInt32

### Community 188 - "LocationProvider"
Cohesion: 0.32
Nodes (5): LocationProvider, CLLocation, CLLocationCoordinate2D, CLLocationManager, Error

### Community 189 - "OrderNotifications"
Cohesion: 0.29
Nodes (3): OrderNotifications, Order, UserNotifications

### Community 190 - "NSObject"
Cohesion: 0.25
Nodes (7): ForegroundPresenter, Void, NSObject, UNNotification, UNNotificationPresentationOptions, UNUserNotificationCenter, UNUserNotificationCenterDelegate

### Community 191 - "Tobacco"
Cohesion: 0.54
Nodes (4): Bool, Product, String, Tobacco

### Community 192 - "DeliveryAddress"
Cohesion: 0.36
Nodes (6): DeliveryAddress, .coordinate, .formattedSummary, CLLocationCoordinate2D, Double, String

### Community 193 - "Offer"
Cohesion: 0.39
Nodes (6): Offer, .code, Bool, Double, Int, String

### Community 194 - "OrderProgressRail"
Cohesion: 0.32
Nodes (6): OrderProgressRail, .body, .endMarker, .marker, CGFloat, Double

### Community 195 - "Phase"
Cohesion: 0.29
Nodes (7): Equatable, Phase, denied, finished, idle, listening, unavailable

### Community 196 - "Kind"
Cohesion: 0.29
Nodes (6): Kind, beauty, food, .id, .site, .title

### Community 197 - "StoreConfig"
Cohesion: 0.48
Nodes (5): StoreConfig, Bool, Double, Int, String

### Community 198 - "generate-sitemap.mjs"
Cohesion: 0.29
Nodes (5): __dirname, __filename, sitemapContent, STATIC_ROUTES, targetPath

### Community 200 - "OrderLocation"
Cohesion: 0.40
Nodes (4): OrderLocation, .deliveryAddress, Decoder, DeliveryAddress

### Community 201 - "StoreStatus"
Cohesion: 0.53
Nodes (4): StoreStatus, Bool, Int, String

### Community 202 - "ProfileView.swift"
Cohesion: 0.33
Nodes (5): AppearanceSetting, .body, AuthView.Mode, .id, Self

### Community 203 - "CatalogEnricherView.jsx"
Cohesion: 0.60
Nodes (3): CatalogEnricherView(), getApiBase(), resolveImageUrl()

### Community 204 - "AppHomeScreenMock.jsx"
Cohesion: 0.40
Nodes (3): AppHomeScreenMock(), CATEGORY_RAIL, ESSENTIAL_RAILS

### Community 205 - "storage.js"
Cohesion: 0.33
Nodes (3): consentIndexedDB, consentLocalStorage, encryptedStorage

### Community 206 - "Category"
Cohesion: 0.60
Nodes (3): Category, Int, String

### Community 207 - "assets/packshots/manifest.json"
Cohesion: 0.40
Nodes (4): description, items, total_items, version

### Community 208 - "products/packshots/manifest.json"
Cohesion: 0.40
Nodes (4): description, items, total_items, version

### Community 209 - "android-compose/gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 210 - "button.jsx"
Cohesion: 0.50
Nodes (3): Button, buttonSizes, buttonVariants

### Community 213 - "Step"
Cohesion: 0.67
Nodes (3): Step, code, number

### Community 221 - "validate-seo.mjs"
Cohesion: 0.29
Nodes (5): __dirname, errors, __filename, passes, ROOT

### Community 228 - "generate_splash_screens.py"
Cohesion: 0.47
Nodes (5): main(), make_solid_white(), make_transparent_icon(), Creates a pure solid white splash image., Creates a transparent 1x1 icon for the initial OS launch.

### Community 244 - "OrderProcessingView.jsx"
Cohesion: 0.19
Nodes (24): DriversView(), OrderDetailDrawer(), OrderProcessingView(), PrintPackingSlip(), SlipBody(), getOrderGracePeriodSeconds(), groupOrderItemsByDistributor(), ORDER_STATUS (+16 more)

### Community 265 - "FloatingCartBar.jsx"
Cohesion: 0.11
Nodes (20): AnimatedCounter(), BottomNav(), NAV_ITEMS, STOREFRONT_TABS, DashitAnimatedLogo(), EMPTY_CART, FloatingCartBar(), NAVBAR_ROUTES (+12 more)

### Community 321 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, dev, export:zip, fb:emulate, fb:rules, seed:firestore, serve:static (+4 more)

### Community 346 - "generate_app_icons.py"
Cohesion: 0.33
Nodes (6): create_adaptive_foreground(), create_icon(), create_round_icon(), Creates a square icon with solid background and centered scaled logo mark., Creates a circular icon with transparent corners., Creates an Android adaptive icon foreground (transparent canvas, safe zone…

### Community 372 - "BklitAreaChart.jsx"
Cohesion: 0.40
Nodes (3): DATA_MONTH, DATA_TODAY, DATA_WEEK

### Community 391 - "server.js"
Cohesion: 0.14
Nodes (15): fs, { handleApiRequest }, http, MIME, path, ROOT, server, ensureEnrichmentService() (+7 more)

### Community 425 - "_app.js"
Cohesion: 0.12
Nodes (26): AppearanceSetting(), OPTIONS, AppHeader(), DASH_SLOT, EASE_IN_OUT, EASE_OUT_EXPO, PremiumSplashScreen(), ThemeContext (+18 more)

### Community 471 - "build-release.sh"
Cohesion: 0.40
Nodes (4): ANDROID_HOME, JAVA_HOME, PATH, build-release.sh script

## Knowledge Gaps
- **754 isolated node(s):** `PLACED`, `PACKING`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED` (+749 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AdminDashboardViewModel` connect `AdminDashboardViewModel` to `Identifiable`, `AddProductSheetView`, `StoreConfig`, `OrderDetailSheetView`, `AdminHomeView`, `Distributor`, `String`, `.saveResult`, `AdminTab`, `AdminHomeView.swift`, `TodoRow`, `SwiftUI`, `AdminDashboardView`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `Foundation` connect `Foundation` to `FirestoreService`, `OnlinePayment`, `Coupon`, `AuthError`, `Identifiable`, `AdminSession`, `AddressSearchView`, `.decode`, `.format`, `Distributor`, `UIKit`, `.saveResult`, `OrderNotifications`, `Tobacco`, `Offer`, `StoreConfig`, `SoundManager`, `StoreStatus`, `Category`, `CartViewModel`, `SwiftUI`, `Outcome`, `String`, `ScreenshotHooks`, `DecodingKeys`, `LocalStorage`, `CheckoutViewModel`, `Hashable`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `CatalogEnrichmentPipeline` connect `CatalogEnrichmentPipeline` to `EnrichmentDatabase`, `CandidateSourceCollector`, `test_enrichment_pipeline.py`, `EnrichmentApiHandler`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `AdminDashboardViewModel` (e.g. with `.handleScan()` and `.distributorCard()`) actually correct?**
  _`AdminDashboardViewModel` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PLACED`, `PACKING`, `OUT_FOR_DELIVERY` to the rest of the system?**
  _754 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `FirestoreService` be split into smaller, more focused modules?**
  _Cohesion score 0.05034965034965035 - nodes in this community are weakly interconnected._
- **Should `db.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07836538461538461 - nodes in this community are weakly interconnected._