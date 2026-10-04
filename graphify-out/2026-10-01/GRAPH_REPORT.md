# Graph Report - Blinkit  (2026-09-30)

## Corpus Check
- 406 files · ~1,437,263 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4160 nodes · 8507 edges · 249 communities (225 shown, 24 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 383 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ed29846c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- FirestoreService
- db.js
- OnlinePayment
- motion.js
- AppDelegate
- Motion.swift
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
- SearchScreen.kt
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
- OrderDetailSheetView
- StorefrontHomeView
- CartSheetView
- DASHit — Firestore Backend
- CartViewModel
- OrderStatus
- LiveTrackingViewModel
- AddItemsSheet
- Distributor
- LoginProductMarquee.jsx
- String
- Driver
- JsonLd.jsx
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
- sources.py
- AuthView
- DecodingKeys
- ShimmerView.swift
- DeliveryStage
- DASHitLiveActivityWidget.swift
- ProductCardView
- View
- .dashitCard
- ProductDetailSheet
- productPhotoFinder.js
- CartSheet.kt
- AdminDashboardView
- normalize_to_square
- _sign-in.php
- productCatalog.js
- hapticLight
- tobacco.js
- DashitColors
- VoiceSearchRecognizer
- ActiveOrderStore
- OrderComponents.kt
- OrderHistoryCard
- OrderProgressRail
- CachedAsyncImage
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
- Product
- ProfileView
- csvInventory.js
- ProductPhotoSheets.jsx
- .addItems
- OrderStatusPill
- SwiftUI
- BarcodeCamera
- OpenFactsUpload
- StorefrontSearchField
- ProductPhotos
- .format
- RiderMapMarker
- cn
- DASHit iOS — Native Swift (SwiftUI) Migration Plan & Architecture Blueprint
- OrderStageIcon
- AdminHomeView
- Coupon
- DecodingKeys
- CategoryCollageTile
- EnrichmentApiHandler
- CatalogueSync
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
- UIKit
- AddressBook
- SignInCodeEntry
- TabBarVisibility
- CategoriesView
- RootView
- What you need to set up (once)
- TobaccoListView
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
- DeliveryEta
- Dark Mode — Handoff
- UpdateError
- OrderStatus
- StorefrontHomeView.swift
- HeroBannerView
- DeliveryAddress
- build-catalog-index.mjs
- SafariView
- CategoryTabsView
- DASHitWidgetsBundle
- download_all_photos.py
- isPlaceholderImage
- FreeDeliveryStrip
- FirestoreService.swift
- Tobacco
- RoadRouter
- Offer
- AgeGateSheet
- Phase
- Kind
- Hashable
- generate-sitemap.mjs
- SoundManager
- DriverLiveTracking
- extract_all_blinkit_sitemaps.py
- ProfileView.swift
- CatalogEnricherView.jsx
- AppHomeScreenMock.jsx
- storage.js
- PressableButtonStyle
- OrderNotifications
- check_disk_space
- android-compose/gradlew
- .addItems
- DASHit Agent Instructions
- ObservableObject
- Step
- seed-emulator-admin.mjs
- permissions.js
- CLAUDE_IOS_TAKEOVER_PROMPT.md
- Mode
- @capacitor/haptics
- run-antigravity.sh
- validate-seo.mjs
- products.js
- sync-and-push.sh
- generate_splash_screens.py
- leaflet
- remotion
- tailwind-merge
- three
- OrderProcessingView.jsx
- FloatingCartBar.jsx
- canvas-confetti
- scripts
- generate_app_icons.py
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

## Communities (249 total, 24 thin omitted)

### Community 0 - "FirestoreService"
Cohesion: 0.16
Nodes (11): FirestoreService, Category, Double, DriverLiveTracking, ListenerRegistration, Offer, Order, String (+3 more)

### Community 1 - "db.js"
Cohesion: 0.08
Nodes (54): PhotoResultsSheet(), fetchCatalogue(), adjustSingleProductStock(), broadcastProducts(), broadcastStoreConfig(), bulkUpdateProductStock(), canFetchChangesOnly(), deductInventoryForOrder() (+46 more)

### Community 2 - "OnlinePayment"
Cohesion: 0.06
Nodes (51): AnyHashable, CheckedContinuation, Decodable, Int32, CreatedOrder, Once, OnlinePayment, .isAvailable (+43 more)

### Community 3 - "motion.js"
Cohesion: 0.12
Nodes (22): AppFeatureShowcase(), CancelOrderModal(), CategoryGridSixPack(), SIX_PACK_CATEGORIES, CATEGORY_STRIP, CategoryScroller(), CURATED_RAILS, PromoBanner() (+14 more)

### Community 4 - "AppDelegate"
Cohesion: 0.18
Nodes (9): AppDelegate, Any, Bool, UIScene, UISceneSession, UIWindow, UIApplication, UIApplicationDelegate (+1 more)

### Community 5 - "Motion.swift"
Cohesion: 0.18
Nodes (11): LaunchReveal, LaunchRevealTrigger, SlideInFromLeading, Binding, Bool, Content, Int, Set (+3 more)

### Community 6 - "InteractiveMapModal.jsx"
Cohesion: 0.12
Nodes (23): ALIAS_PRESETS, HUB_POS, InteractiveMapModal(), MapWithPin, POPULAR_AREAS, LocationPickerModal(), renderAliasIcon(), calculateDeliveryEta() (+15 more)

### Community 7 - "package.json"
Cohesion: 0.18
Nodes (10): autoprefixer, devDependencies, autoprefixer, postcss, tailwindcss, tailwindcss, name, private (+2 more)

### Community 8 - "AdminDashboardViewModel"
Cohesion: 0.05
Nodes (50): AdminDashboardViewModel, .activeOrdersCount, .bestSellers, .deletedProductIds, .filteredOrders, .filteredProducts, .lowStockCount, .ordersByHourToday (+42 more)

### Community 9 - "RemotionDeliveryBadge.jsx"
Cohesion: 0.22
Nodes (4): DeliveryScooterComposition(), Player, Player, StopwatchGuaranteeComposition()

### Community 10 - "ExampleInstrumentedTest.java"
Cohesion: 0.33
Nodes (5): ExampleInstrumentedTest, ExampleUnitTest, androidx.test.ext.junit.runners.AndroidJUnit4, org.junit.runner.RunWith, org.junit.Test

### Community 11 - ".remember"
Cohesion: 0.09
Nodes (39): UserProfile, AuthButton(), AuthField(), AuthMode, LogIn, SignUp, AuthScreen(), AuthStep (+31 more)

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
Cohesion: 0.08
Nodes (38): are_pack_sizes_compatible(), clean_barcode(), extract_variant(), normalize_product_record(), parse_pack_size(), Any, Product Data Normalizer for DASHit Catalog Enrichment. Provides canonical…, Extracts numerical quantity and canonical base unit. e.g. "70g" -> {"raw":… (+30 more)

### Community 20 - "auth.js"
Cohesion: 0.08
Nodes (51): currentUid(), ensureAuthenticatedUid(), fetchAdminOrders(), fetchUserOrderHistory(), readLocal(), submitOrder(), updateAdminOrderStatus(), writeLocal() (+43 more)

### Community 21 - "SearchScreen.kt"
Cohesion: 0.08
Nodes (35): NutritionFact, Product, Modifier, Product, ProductCard(), Modifier, QuantityStepper(), StepperSize (+27 more)

### Community 22 - "dependencies"
Cohesion: 0.05
Nodes (37): animejs, @capacitor/android, @capacitor/app, @capacitor/cli, @capacitor/core, @capacitor/ios, @capacitor/local-notifications, @capacitor/splash-screen (+29 more)

### Community 23 - "📋 Master Client Discovery & Setup Checklist"
Cohesion: 0.18
Nodes (10): 📅 15-Day Milestone Tracker, **ADMIN PAGE**, 📋 Master Client Discovery & Setup Checklist, SECTION 1: Brand & Identity, SECTION 2: Dark Room & Delivery Zone (Anantnag), SECTION 3: Scooter Delivery Team, SECTION 4: Product Catalog & Categories, SECTION 5: Pricing, Charges & Order Rules (+2 more)

### Community 24 - "MainActivity.kt"
Cohesion: 0.17
Nodes (8): AppReveal, DashitTheme(), android, Bundle, StorefrontViewModel, MainActivity, SplashOverlay(), ComponentActivity

### Community 25 - "Keys"
Cohesion: 0.05
Nodes (44): Keys, address, alias, couponCode, createdAt, deliveryAddress, deliveryFee, discount (+36 more)

### Community 26 - "Identifiable"
Cohesion: 0.10
Nodes (32): AnyCancellable, Identifiable, CatalogueStore, .products, .remoteCategories, .searchEntries, CategoryTile, Department (+24 more)

### Community 27 - "LiveTrackingMapScreen.kt"
Cohesion: 0.17
Nodes (24): AddressSelectionSheet(), DeliveryAddress, SheetState, OsmPinPickerView(), SavedAddressItem, bearing(), darkMapFilter(), destinationMarkerBitmap() (+16 more)

### Community 28 - "AuthRepository"
Cohesion: 0.10
Nodes (17): AuthRepository, Context, Exception, FirebaseFirestore, JSONObject, SharedPreferences, StateFlow, UserProfile (+9 more)

### Community 30 - "AdminSession"
Cohesion: 0.06
Nodes (29): App, AuthStateDidChangeListenerHandle, Field, FirebaseCore, AdminSession, AdminSignInView, .body, DASHitAdminApp (+21 more)

### Community 31 - "AddressSearchView"
Cohesion: 0.10
Nodes (25): AnantnagLocality, .coordinate, .id, CLLocationCoordinate2D, Double, String, AddressSearchModel, .localities (+17 more)

### Community 33 - "StorefrontViewModel"
Cohesion: 0.09
Nodes (22): Category, CategoryTile, Offer, ProductVariant, shopCategory(), CatalogSeed, Product, CatalogueSync (+14 more)

### Community 34 - "OrderRepository"
Cohesion: 0.19
Nodes (8): CartItem, Context, DriverLiveTracking, ListenerRegistration, SharedPreferences, StateFlow, OrderRepository, DocumentSnapshot

### Community 36 - "OrderDetailSheetView"
Cohesion: 0.09
Nodes (35): AddDriverSheetView, AddOfferSheetView, AddProductSheetView, .body, .canSave, .existingItem, .priceValue, AddSupplierSheetView (+27 more)

### Community 37 - "StorefrontHomeView"
Cohesion: 0.12
Nodes (17): StorefrontHomeView, .address, .addressKey, .addressLine, .body, .deliveryQuote, .storeChip, .welcomeBanner (+9 more)

### Community 38 - "CartSheetView"
Cohesion: 0.20
Nodes (12): CartLineRow, CartSheetView, .billCard, .cardShape, .couponRow, .emptyState, .itemsCard, .proceedBar (+4 more)

### Community 39 - "DASHit — Firestore Backend"
Cohesion: 0.22
Nodes (8): 1. One-time setup (you must do these — I cannot access your console), 2. Data model, 3. Security model, 4. Realtime, without Socket.io, 5. Known constraints on Spark, 6. Native (Capacitor) note for Phone Auth, DASHit — Firestore Backend, Why live tracking is a subcollection, not fields on the order

### Community 40 - "CartViewModel"
Cohesion: 0.10
Nodes (15): CartBillBreakdown, CartItem, Coupon, FloatingCartBar(), CartBillBreakdown, CartItem, Modifier, CartViewModel (+7 more)

### Community 41 - "OrderStatus"
Cohesion: 0.11
Nodes (15): DriverLiveTracking, Order, OrderStatus, CANCELLED, DELIVERED, OUT_FOR_DELIVERY, PACKING, PLACED (+7 more)

### Community 42 - "LiveTrackingViewModel"
Cohesion: 0.14
Nodes (14): LiveTrackingViewModel, Bool, CLLocationCoordinate2D, DriverLiveTracking, Int, ListenerRegistration, MapCameraPosition, MKMapRect (+6 more)

### Community 43 - "AddItemsSheet"
Cohesion: 0.09
Nodes (27): AddableLine, .name, .originalPrice, .price, .unit, AddItemsSheet, .addedCount, .aisleChips (+19 more)

### Community 44 - "Distributor"
Cohesion: 0.09
Nodes (21): Distributor, .isReal, .isSelf, Bool, Decoder, Set, String, AdminCSVImportView (+13 more)

### Community 48 - "String"
Cohesion: 0.09
Nodes (28): CSVStockImport, Field, barcode, brand, category, image, mrp, name (+20 more)

### Community 49 - "Driver"
Cohesion: 0.36
Nodes (5): Driver, Double, Int, String, .body

### Community 50 - "JsonLd.jsx"
Cohesion: 0.13
Nodes (9): BreadcrumbJsonLd(), GroceryStoreJsonLd(), OrganizationJsonLd(), WebSiteJsonLd(), SEO(), goBack(), historyDepth(), HelpPage() (+1 more)

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
Cohesion: 0.10
Nodes (19): 0. Where the work stopped (read this first), 0a. Security audit (2026-09-30, after the Blaze upgrade), 1. Backend: Express + Socket.io → Firestore, 2. How auth works now, 3. What the USER must do (blocked on them, not on you), 4. Earlier work this session (all VERIFIED, all shipped to the Pixel), 4b. This session: admin.js fully migrated + three real bugs fixed, 4c. `src/lib/openFoodFacts.js` (new) (+11 more)

### Community 74 - "seed-firestore.mjs"
Cohesion: 0.43
Nodes (6): chunk(), here, loadEnv(), main(), readJson(), root

### Community 76 - "productPhotoMatch.js"
Cohesion: 0.23
Nodes (15): brandMatches(), brandWords(), chooseSearchMatch(), CORPORATE_WORDS, hasWord(), LANGUAGE_ORDER, parsePackSize(), sameSize() (+7 more)

### Community 77 - "OnlinePayment"
Cohesion: 0.14
Nodes (19): Failed, Activity, Bitmap, Context, Exception, Intent, JSONObject, Razorpay (+11 more)

### Community 78 - "StorefrontScreen.kt"
Cohesion: 0.09
Nodes (29): blurReveal(), DashitMotion, Modifier, LaunchReveal, pressable(), slideInFromLeft(), DeliveryAddress, BottomNavBar() (+21 more)

### Community 79 - "CartViewModel"
Cohesion: 0.07
Nodes (25): CartViewModel, .appliedCoupon, .items, .totalQuantity, Bool, CartBillBreakdown, CartItem, Coupon (+17 more)

### Community 80 - "AdminTab"
Cohesion: 0.07
Nodes (28): CaseIterable, AdminSortOption, distributorAsc, distributorDesc, .id, nameAsc, stockAsc, stockDesc (+20 more)

### Community 81 - "EnrichmentDatabase"
Cohesion: 0.16
Nodes (7): Connection, EnrichmentDatabase, Any, Look up previously verified product to avoid redundant processing., Saves or updates enriched product in persistent catalog., SQLite-backed persistent catalog, candidate registry, and caching engine., Recounts status numbers for a job from actual items and updates job record.

### Community 82 - "sources.py"
Cohesion: 0.13
Nodes (13): _fetch_json(), _is_safe_url(), MasterAssetBankRegistry, Any, Path, _rate_limit(), Multi-Source Candidate Image & Metadata Retrieval for DASHit. Source Priority:…, Curated Master FMCG Asset Bank Registry. Provides instant, verified, high-… (+5 more)

### Community 83 - "AuthView"
Cohesion: 0.14
Nodes (17): AttributedString, AuthFieldStyle, AuthView, .backdrop, .isReady, .isSignUp, .legalLine, .legalText (+9 more)

### Community 84 - "DecodingKeys"
Cohesion: 0.07
Nodes (27): DecodingKeys, ageRestricted, badge, barcode, cat, category, distributor, id (+19 more)

### Community 85 - "ShimmerView.swift"
Cohesion: 0.15
Nodes (22): CategorySidebarSkeleton, .body, HomeFeedSkeleton, .body, OrderListSkeleton, .body, ProductCardSkeleton, .body (+14 more)

### Community 86 - "DeliveryStage"
Cohesion: 0.15
Nodes (20): ActivityAttributes, ContentState, .stage, DASHitOrderAttributes, DeliveryStage, .badgeText, cancelled, delivered (+12 more)

### Community 87 - "DASHitLiveActivityWidget.swift"
Cohesion: 0.13
Nodes (27): ActivityViewContext, CompactETAView, .body, CountdownText, .body, DASHitLiveActivityWidget, .body, ExpandedETAView (+19 more)

### Community 88 - "ProductCardView"
Cohesion: 0.12
Nodes (16): ProductCardView, .ageTag, .body, .discountTag, .hasVariants, .tileShape, Bool, Product (+8 more)

### Community 89 - "View"
Cohesion: 0.18
Nodes (17): BrandMapMarker, .body, DeliveryCodeRow, .body, LiveTrackingMapView, .body, .map, .mapScreen (+9 more)

### Community 90 - ".dashitCard"
Cohesion: 0.33
Nodes (4): CGFloat, Color, View, S

### Community 91 - "ProductDetailSheet"
Cohesion: 0.09
Nodes (21): ProductDetailSheet, .body, .detailsList, .discountPercent, .lineId, .originalPrice, .price, .selectedVariant (+13 more)

### Community 92 - "productPhotoFinder.js"
Cohesion: 0.17
Nodes (24): findInIndianCatalog(), VERIFIED_INDIAN_BARCODES, saveFoundProductPhotos(), classifyCategory(), createRateLimiter(), fetchOffProduct(), getJson(), QUEUES (+16 more)

### Community 93 - "CartSheet.kt"
Cohesion: 0.24
Nodes (14): isAgeRestricted(), BillDetailsCard(), BillRow(), CartItemsCard(), CartLineRow(), CartSheet(), CouponCard(), CartBillBreakdown (+6 more)

### Community 94 - "AdminDashboardView"
Cohesion: 0.10
Nodes (16): AdminDashboardView, .addProductDirectContent, .distributorsTabContent, .emptyCount, .metricsStripView, .offersTabContent, .ordersTabContent, .ridersTabContent (+8 more)

### Community 95 - "normalize_to_square"
Cohesion: 0.06
Nodes (35): build_packshot_library(), Build script for DASHit Curated Master FMCG Asset Bank. Downloads source…, compile_all(), Compiles and bundles photos for ALL products in DASHit directly inside the app.…, get_rembg_session(), normalize_to_square(), process_and_save_catalog_image(), Image (+27 more)

### Community 96 - "_sign-in.php"
Cohesion: 0.10
Nodes (21): dashit_firebase_custom_token(), dashit_forget_old_records(), dashit_is_review_mobile(), dashit_normalized_mobile(), dashit_service_account(), dashit_sign_in_config(), dashit_with_store(), dashit_base64url() (+13 more)

### Community 97 - "productCatalog.js"
Cohesion: 0.15
Nodes (27): args, catalog, FILE, picked, ROOT, shelf, CatalogPickerView(), catalogStarterCsv() (+19 more)

### Community 98 - "hapticLight"
Cohesion: 0.10
Nodes (28): CAMPAIGN_CATEGORIES, CAMPAIGN_PRODUCTS, AVAILABLE_COUPONS, CouponsDrawer(), triggerFlyToCart(), LocationPermissionModal(), ModifyOrderModal(), OrderingForSomeoneElseModal() (+20 more)

### Community 99 - "tobacco.js"
Cohesion: 0.10
Nodes (29): ProductCard(), DECLARATIONS, TobaccoDeclarationSheet(), AgeGateContext, AgeGateProvider(), FALLBACK, AGE_RESTRICTED_CATEGORIES, confirmAge() (+21 more)

### Community 100 - "DashitColors"
Cohesion: 0.16
Nodes (26): DashitColors, CategoriesScreen(), CartViewModel, CategoryTile, StorefrontViewModel, SidebarItem(), CategoryCollageTile(), CollageCell() (+18 more)

### Community 101 - "VoiceSearchRecognizer"
Cohesion: 0.22
Nodes (9): AVAudioPCMBuffer, Bool, CGFloat, TimeInterval, Timer, VoiceSearchRecognizer, SFSpeechAudioBufferRecognitionRequest, SFSpeechRecognitionTask (+1 more)

### Community 102 - "ActiveOrderStore"
Cohesion: 0.18
Nodes (8): .body, String, ActiveOrderStore, Bool, DriverLiveTracking, ListenerRegistration, Order, String

### Community 103 - "OrderComponents.kt"
Cohesion: 0.13
Nodes (26): AddItemsSheet(), AisleChip(), Order, Product, ChangeWindowRow(), DriverLiveTracking, Order, Product (+18 more)

### Community 104 - "OrderHistoryCard"
Cohesion: 0.15
Nodes (17): Order, .placedDateText, OrderHistoryCard, .cardShape, .stage, .statusColor, .units, OrderHistoryStore (+9 more)

### Community 105 - "OrderProgressRail"
Cohesion: 0.12
Nodes (17): .body, .title, OrderDetailSheet, .body, .cardShape, .stage, Content, Order (+9 more)

### Community 106 - "CachedAsyncImage"
Cohesion: 0.19
Nodes (16): AsyncImagePhase, CachedAsyncImage, .body, Content, .body, .body, CGFloat, String (+8 more)

### Community 107 - "HapticsManager"
Cohesion: 0.14
Nodes (6): CHHapticEngine, CHHapticEvent, Float, HapticsManager, Bool, TimeInterval

### Community 108 - "AuthService"
Cohesion: 0.21
Nodes (13): AuthService, .firebaseUID, .isReadyToOrder, .needsName, CodeSent, CodeVerified, ServerError, Any (+5 more)

### Community 109 - "Outcome"
Cohesion: 0.18
Nodes (14): product, Outcome, busy, found, notAPackBarcode, notFound, offline, .pack (+6 more)

### Community 110 - "ProductPhotoStore"
Cohesion: 0.22
Nodes (9): ProductPhotoStore, Bool, CGFloat, Never, Task, UIImage, URL, URLResponse (+1 more)

### Community 111 - "String"
Cohesion: 0.22
Nodes (8): Entry, ProductSearch, RecentSearches, Int, Product, String, Text, Substring

### Community 112 - "CouponTicket"
Cohesion: 0.05
Nodes (46): CGSize, InsettableShape, CouponsSheetView, .bestCode, .body, .codeField, .orderedCoupons, .subtotal (+38 more)

### Community 113 - "AddressPinPicker"
Cohesion: 0.10
Nodes (23): LocationProvider, CLLocation, CLLocationCoordinate2D, CLLocationManager, Error, .body, AddressPinPicker, .body (+15 more)

### Community 114 - "ScreenshotHooks"
Cohesion: 0.10
Nodes (20): ScreenshotHooks, .adminDemo, .adminOpenOrder, .adminTab, .demoCart, .demoOrder, .demoOrderPacking, .demoOrderPlaced (+12 more)

### Community 115 - "StorefrontSearchView"
Cohesion: 0.24
Nodes (14): StorefrontSearchView, .idle, .isShowingResults, .results, .searchBar, .suggestions, .tobaccoList, .trimmedQuery (+6 more)

### Community 116 - "Icon"
Cohesion: 0.19
Nodes (19): FreeDeliveryStrip(), FreeDeliveryToast(), FreeDeliveryToastHost(), CartBillBreakdown, Modifier, AddressCard(), CheckoutSheet(), findActivity() (+11 more)

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
Cohesion: 0.09
Nodes (21): CheckoutViewModel, .chosenApp, .deliveryQuote, Bool, CartViewModel, DeliveryAddress, DeliveryEta, OnlinePayment (+13 more)

### Community 121 - "AddressMenuPopup"
Cohesion: 0.19
Nodes (13): AddressMenuPopup, .body, .cardShape, ScreenAnchor, Bool, CGFloat, CGRect, Int (+5 more)

### Community 122 - "LiveOrderFloatingTracker.jsx"
Cohesion: 0.20
Nodes (15): DeliveryStatusIcon(), SIZES, statusToMark(), advanceStatus(), LiveOrderFloatingTracker(), resolveOrderStatusDetails(), stageIndexFor(), STAGES (+7 more)

### Community 123 - "Product"
Cohesion: 0.26
Nodes (11): NutritionFact, Product, .discountPercent, .isAgeRestricted, .isAvailable, ProductVariant, Bool, Decoder (+3 more)

### Community 124 - "ProfileView"
Cohesion: 0.20
Nodes (13): ProfileView, .body, .cardShape, .rowDivider, .signedOutCard, .signOutAndDelete, .versionLine, Bool (+5 more)

### Community 125 - "csvInventory.js"
Cohesion: 0.09
Nodes (31): AdminSheet(), CsvInventoryView(), FILTERS, ImportRow, nextFrame(), readLastSource(), rememberSource(), StockSourceSheet() (+23 more)

### Community 126 - "ProductPhotoSheets.jsx"
Cohesion: 0.21
Nodes (17): NeedsPhotoRow(), NeedsPhotoSheet(), normaliseImageUrl(), photoListToCsv(), setManualProductPhoto(), setManualProductPhotos(), checkPhoto(), findContentBox() (+9 more)

### Community 127 - ".addItems"
Cohesion: 0.22
Nodes (11): AlreadyPaid, Exception, Order, UserProfile, Network, NothingAdded, NotSignedIn, OrderError (+3 more)

### Community 128 - "OrderStatusPill"
Cohesion: 0.12
Nodes (16): OrderStatusPill, .accent, .etaMinutes, .itemCount, .progress, .ring, .stage, .subtitle (+8 more)

### Community 129 - "SwiftUI"
Cohesion: 0.10
Nodes (12): ActivityKit, AudioToolbox, Combine, CoreLocation, FirebaseFirestore, Foundation, CatalogSeed, Product (+4 more)

### Community 130 - "BarcodeCamera"
Cohesion: 0.06
Nodes (30): AVCaptureConnection, AVCaptureDevice, AVCaptureMetadataOutput, AVCaptureMetadataOutputObjectsDelegate, AVCaptureVideoPreviewLayer, AVMetadataObject, ForegroundPresenter, OrderNotifications (+22 more)

### Community 131 - "OpenFactsUpload"
Cohesion: 0.31
Nodes (9): Failure, .errorDescription, OpenFactsUpload, Any, Data, Int, String, UIImage (+1 more)

### Community 132 - "StorefrontSearchField"
Cohesion: 0.21
Nodes (11): FocusState, StorefrontSearchField, .body, .fieldShape, .hint, .searchIcon, Binding, Bool (+3 more)

### Community 133 - "ProductPhotos"
Cohesion: 0.30
Nodes (6): Context, ProductPhotos, SmallerOpenFoodFactsPhotos, ImageLoader, ImageResult, Interceptor

### Community 134 - ".format"
Cohesion: 0.11
Nodes (17): CurrencyFormatter, Double, Int, String, FloatingCartBarView, .body, .pill, .subtitle (+9 more)

### Community 135 - "RiderMapMarker"
Cohesion: 0.16
Nodes (13): DestinationMapMarker, .body, RiderArtwork, RiderMapMarker, .body, .spriteName, CGRect, CLLocationCoordinate2D (+5 more)

### Community 136 - "cn"
Cohesion: 0.13
Nodes (19): react, react, Badge(), badgeVariants, Button, buttonSizes, buttonVariants, Card (+11 more)

### Community 137 - "DASHit iOS — Native Swift (SwiftUI) Migration Plan & Architecture Blueprint"
Cohesion: 0.12
Nodes (15): 1. Executive Summary & Objective, 2. Shared Backend & Data Contract (Zero Backend Breaking Changes), 3. Native iOS Project Architecture, 4.1 Authentication & Anonymous State Machine (`AuthService.swift`), 4.2 Dynamic Island & Lock Screen Live Activities (`ActivityKit`), 4.3 Native MapKit Rider Tracking (`LiveTrackingMapView.swift`), 4.4 Haptics & Tactile Physics (`HapticsManager.swift`), 4. Key Subsystems: Implementation Specifications (+7 more)

### Community 138 - "OrderStageIcon"
Cohesion: 0.21
Nodes (10): GraphicsContext, .body, Ease, Kind, packing, received, OrderStageIcon, .body (+2 more)

### Community 139 - "AdminHomeView"
Cohesion: 0.10
Nodes (32): Charts, GridItem, AdminHomeView, .bestSellersChart, .body, .chartColumns, .greeting, .greetingText (+24 more)

### Community 140 - "Coupon"
Cohesion: 0.27
Nodes (9): CartBillBreakdown, CartItem, .quantity, Coupon, Bool, Decoder, Double, Int (+1 more)

### Community 141 - "DecodingKeys"
Cohesion: 0.12
Nodes (16): DecodingKeys, barcode, cat, category, id, image, img, maxQuantity (+8 more)

### Community 142 - "CategoryCollageTile"
Cohesion: 0.20
Nodes (13): CategoryCard, .tileShape, CategoryCollageTile, .body, .collage, .extraCount, .shownCount, .tileShape (+5 more)

### Community 143 - "EnrichmentApiHandler"
Cohesion: 0.17
Nodes (9): BaseHTTPRequestHandler, HTTPServer, EnrichmentApiHandler, REST API Service for DASHit Catalog Enrichment Pipeline. Uses Python standard…, Handles requests in a separate thread., Routes and dispatches REST API calls., run_server(), ThreadedHTTPServer (+1 more)

### Community 144 - "CatalogueSync"
Cohesion: 0.24
Nodes (9): CatalogueSync, .canFetchChangesOnly, .minimumExpectedCount, .syncedAt, Bool, Date, Int, Product (+1 more)

### Community 145 - "AddToOpenFactsSheet"
Cohesion: 0.20
Nodes (10): Login, OpenFactsAccount, AddToOpenFactsSheet, .body, .canAdd, Bool, String, Void (+2 more)

### Community 146 - "Order"
Cohesion: 0.24
Nodes (7): Order, .isPaidOnline, .modifyWindowEnd, Bool, Date, Int, TimeInterval

### Community 147 - "Coordinator"
Cohesion: 0.18
Nodes (9): CameraCapture, Coordinator, Any, Context, UIImage, PhotosUI, UIImagePickerController, UIImagePickerControllerDelegate (+1 more)

### Community 148 - "HelpSupportView"
Cohesion: 0.21
Nodes (12): HelpSupportView, .body, .header, LegalPage, .id, Question, .id, SupportContact (+4 more)

### Community 149 - "Offset"
Cohesion: 0.26
Nodes (15): OrderStatus, OrderStageHero(), drawPacking(), drawReceived(), easeInOut(), easeOut(), easeOutBack(), Modifier (+7 more)

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
Cohesion: 0.24
Nodes (15): LiveDeliveryMapPreview, ANANTNAG_ROUTE_COORDS, createDashitRiderIcon(), createDestinationIcon(), createStoreIcon(), LiveDeliveryMapPreview(), create3DDestinationIcon(), create3DRiderIcon() (+7 more)

### Community 154 - "HapticsManager"
Cohesion: 0.45
Nodes (4): HapticsManager, Context, View, Vibrator

### Community 155 - "UIKit"
Cohesion: 0.09
Nodes (20): Capacitor, CAPBridgeViewController, CoreHaptics, CryptoKit, ImageIO, MainViewController, SceneDelegate, Set (+12 more)

### Community 156 - "AddressBook"
Cohesion: 0.33
Nodes (6): AddressBook, Bool, DeliveryAddress, String, .savedRows, DeliveryAddress

### Community 157 - "SignInCodeEntry"
Cohesion: 0.23
Nodes (10): ResendCodeButton, .body, SignInCodeEntry, .body, Bool, Color, Date, Int (+2 more)

### Community 158 - "TabBarVisibility"
Cohesion: 0.20
Nodes (6): FollowsTabBar, CGFloat, Content, TabBarVisibility, View, ViewModifier

### Community 159 - "CategoriesView"
Cohesion: 0.18
Nodes (11): CategoriesView, .isLoadingCatalogue, .products, .selectedTile, .sidebar, .tiles, Bool, CategoryTile (+3 more)

### Community 160 - "RootView"
Cohesion: 0.18
Nodes (11): ColorScheme, .body, RootView, .addressMenu, .colorScheme, .orderPill, .tabSelection, Binding (+3 more)

### Community 161 - "What you need to set up (once)"
Cohesion: 0.17
Nodes (11): 1. WhatsApp: phone number ID and a permanent token, 2. WhatsApp: the message template, 3. Firebase: the service account key, 4. Put the secrets on Hostinger, 5. Check it works, 6. App Store review, 7. Tighten the Firestore rules (last), How it works (+3 more)

### Community 162 - "TobaccoListView"
Cohesion: 0.20
Nodes (11): .imageWell, .heroImage, .body, PlainPackArt, .body, Product, Void, TobaccoListView (+3 more)

### Community 163 - "test-seo-output.mjs"
Cohesion: 0.15
Nodes (11): delHtml, __dirname, __filename, helpHtml, homeHtml, OUT, privHtml, robots (+3 more)

### Community 164 - ".decode"
Cohesion: 0.29
Nodes (6): Data, KeyedDecodingContainer, Double, Int, String, Key

### Community 165 - "generate_and_assign_ai_packshot"
Cohesion: 0.17
Nodes (14): build_packshot_prompt(), generate_and_assign_ai_packshot(), generate_fallback_studio_packshot(), generate_with_google_imagen(), get_curated_studio_packshot(), Any, Constructs an optimized commercial e-commerce studio packshot prompt., Generates a commercial-grade 1024x1024 studio packshot on seamless pure white… (+6 more)

### Community 166 - "darkify.py"
Cohesion: 0.29
Nodes (11): family(), in_scope(), main(), map_utility(), process_file(), process_literal(), Map a bare utility (no variant prefix) to its dark counterpart., Return the rewritten class-list body, plus the additions made. (+3 more)

### Community 167 - "CatalogueView.jsx"
Cohesion: 0.36
Nodes (8): CatalogueView(), InventoryView(), CATALOGUE_CSV_COLUMNS, generateCsvString(), INVENTORY_CSV_COLUMNS, RFC-4180, ORDERS_CSV_COLUMNS, triggerCsvDownload()

### Community 168 - "xcyop.js"
Cohesion: 0.09
Nodes (33): AdminLayout(), BatchInwardView(), DistributorsView(), EMPTY_FORM, ImporterView(), OffersView(), PhotoSearchStatus(), StoreControlsView() (+25 more)

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
Cohesion: 0.08
Nodes (22): OrderItemGroup, .id, CartItem, Order, .body, .body, .body, .body (+14 more)

### Community 174 - "CartDrawerSheet.jsx"
Cohesion: 0.31
Nodes (6): CartDrawerSheet(), EmptyCartState(), SUGGESTED_SEARCH_CHIPS, watchStoreConfig(), useStoreDetails(), useStoreStatus()

### Community 175 - "DashitLogo3D.jsx"
Cohesion: 0.29
Nodes (6): DashitLogo3D(), DASHIT_MARK_SVG, MARK_NAVY, MARK_ORANGE, hasWebGL(), HeroObject3D()

### Community 176 - "DeliveryEta"
Cohesion: 0.29
Nodes (6): DeliveryEta, ListenerRegistration, StateFlow, Quote, State, StoreStatus

### Community 177 - "Dark Mode — Handoff"
Cohesion: 0.20
Nodes (9): 1. What already exists, 2. What was done, 3. Project constraints you must respect, 4. Commands, Bulk styling (applied and corrected), Dark Mode — Handoff, Still open, Theme engine (done, verified working) (+1 more)

### Community 178 - "UpdateError"
Cohesion: 0.18
Nodes (10): OrderUpdater, String, UpdateError, alreadyPaid, .errorDescription, network, nothingAdded, notSignedIn (+2 more)

### Community 179 - "OrderStatus"
Cohesion: 0.20
Nodes (10): OrderStatus, cancelled, delivered, .iconName, outForDelivery, packing, placed, .progress (+2 more)

### Community 180 - "StorefrontHomeView.swift"
Cohesion: 0.25
Nodes (9): HeaderBackdrop, .body, HomeChromeState, PinnedSearchBackdrop, .body, StatusBarBackdrop, .body, .pinnedSearch (+1 more)

### Community 181 - "HeroBannerView"
Cohesion: 0.29
Nodes (8): HeroBannerView, .copy, HeroCarouselView, .body, CGFloat, Offer, String, Void

### Community 182 - "DeliveryAddress"
Cohesion: 0.17
Nodes (11): CLLocationManagerDelegate, StartupLocation, CLLocation, CLLocationManager, Error, DeliveryAddress, .coordinate, .formattedSummary (+3 more)

### Community 183 - "build-catalog-index.mjs"
Cohesion: 0.27
Nodes (10): isBundle(), key(), LEADING_WORDS, main(), OUT, OWN_LABELS, ROOT, shelfFor() (+2 more)

### Community 184 - "SafariView"
Cohesion: 0.28
Nodes (6): .body, CGFloat, SafariView, Context, SFSafariViewController, UIViewControllerRepresentable

### Community 185 - "CategoryTabsView"
Cohesion: 0.33
Nodes (7): CategorySymbol, CategoryTabsView, .body, Bool, Category, String, Void

### Community 186 - "DASHitWidgetsBundle"
Cohesion: 0.33
Nodes (5): DASHitWidgetsBundle, .body, Widget, WidgetBundle, WidgetKit

### Community 187 - "download_all_photos.py"
Cohesion: 0.40
Nodes (9): batch_update_db(), check_disk_space(), download_single_item(), get_optimized_cdn_url(), init_db(), main(), Path, Transforms CDN URL to 512px WebP for optimal quality-to-size ratio. (+1 more)

### Community 188 - "isPlaceholderImage"
Cohesion: 0.36
Nodes (8): AddProductView(), ProductImage(), productImageUrl(), loadCatalog(), findPhotoFor(), isPlaceholderImage(), photoGaps(), PLACEHOLDER_HOSTS

### Community 189 - "FreeDeliveryStrip"
Cohesion: 0.25
Nodes (8): .cartContent, FreeDeliveryStrip, .body, .isUnlocked, .progress, Bool, CartBillBreakdown, CGFloat

### Community 190 - "FirestoreService.swift"
Cohesion: 0.29
Nodes (6): DeferredListener, .inner, OrderWriteError, .errorDescription, timedOut, LocalizedError

### Community 191 - "Tobacco"
Cohesion: 0.54
Nodes (4): Bool, Product, String, Tobacco

### Community 192 - "RoadRouter"
Cohesion: 0.50
Nodes (3): RoadRouter, CLLocationCoordinate2D, MKMapRect

### Community 193 - "Offer"
Cohesion: 0.39
Nodes (6): Offer, .code, Bool, Double, Int, String

### Community 194 - "AgeGateSheet"
Cohesion: 0.32
Nodes (7): AgeGateSheet, .body, Product, Void, TobaccoDeclarationSheet, .body, .body

### Community 195 - "Phase"
Cohesion: 0.29
Nodes (7): Equatable, Phase, denied, finished, idle, listening, unavailable

### Community 196 - "Kind"
Cohesion: 0.29
Nodes (6): Kind, beauty, food, .id, .site, .title

### Community 197 - "Hashable"
Cohesion: 0.16
Nodes (14): Codable, Hashable, Category, Int, String, StoreConfig, Bool, Double (+6 more)

### Community 198 - "generate-sitemap.mjs"
Cohesion: 0.29
Nodes (5): __dirname, __filename, sitemapContent, STATIC_ROUTES, targetPath

### Community 199 - "SoundManager"
Cohesion: 0.22
Nodes (4): AVAudioPlayer, AVFoundation, SoundManager, Speech

### Community 200 - "DriverLiveTracking"
Cohesion: 0.24
Nodes (9): DriverLiveTracking, .coordinate, OrderLocation, .deliveryAddress, CartItem, CLLocationCoordinate2D, Decoder, DeliveryAddress (+1 more)

### Community 201 - "extract_all_blinkit_sitemaps.py"
Cohesion: 0.36
Nodes (7): extract_all(), fetch_single_sitemap(), parse_sitemap_urls(), Converts a URL slug into a clean product title., Fetches all product sub-sitemap URLs from Blinkit's root sitemap., Fetches and parses a single subcategory sitemap XML., slug_to_title()

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

### Community 206 - "PressableButtonStyle"
Cohesion: 0.33
Nodes (7): ButtonStyle, .pressable, PressableButtonStyle, CGFloat, .topBar, .trailing, .header

### Community 207 - "OrderNotifications"
Cohesion: 0.22
Nodes (7): Context, Order, OrderNotifications, description, items, total_items, version

### Community 208 - "check_disk_space"
Cohesion: 0.48
Nodes (6): check_disk_space(), download_image(), main(), Path, Checks if sufficient free disk space exists., Downloads a single image from Blinkit CDN.

### Community 209 - "android-compose/gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 212 - "ObservableObject"
Cohesion: 0.40
Nodes (3): AppReveal, .canPlay, ObservableObject

### Community 213 - "Step"
Cohesion: 0.67
Nodes (3): Step, code, number

### Community 217 - "Mode"
Cohesion: 0.67
Nodes (3): Mode, logIn, signUp

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
Cohesion: 0.15
Nodes (13): scripts, build, catalog:build, dev, export:zip, fb:emulate, fb:rules, seed:firestore (+5 more)

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
Cohesion: 0.10
Nodes (31): AppearanceSetting(), OPTIONS, AppHeader(), CookieConsentBanner(), DASH_SLOT, EASE_IN_OUT, EASE_OUT_EXPO, PremiumSplashScreen() (+23 more)

### Community 471 - "build-release.sh"
Cohesion: 0.40
Nodes (4): ANDROID_HOME, JAVA_HOME, PATH, build-release.sh script

## Knowledge Gaps
- **768 isolated node(s):** `PLACED`, `PACKING`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED` (+763 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SwiftUI` connect `SwiftUI` to `OrderStatusPill`, `BarcodeCamera`, `StorefrontSearchField`, `Motion.swift`, `.format`, `RiderMapMarker`, `OrderStageIcon`, `AdminHomeView`, `CategoryCollageTile`, `Coordinator`, `HelpSupportView`, `SplashView`, `Identifiable`, `UIKit`, `SignInCodeEntry`, `AdminSession`, `TabBarVisibility`, `CategoriesView`, `TobaccoListView`, `OrderDetailSheetView`, `CartSheetView`, `AddItemsSheet`, `Distributor`, `.dismiss`, `StorefrontHomeView.swift`, `HeroBannerView`, `CategoryTabsView`, `DASHitWidgetsBundle`, `FreeDeliveryStrip`, `AgeGateSheet`, `SoundManager`, `ProfileView.swift`, `CartViewModel`, `AuthView`, `ShimmerView.swift`, `DASHitLiveActivityWidget.swift`, `ProductCardView`, `View`, `.dashitCard`, `ProductDetailSheet`, `OrderHistoryCard`, `OrderProgressRail`, `String`, `CouponTicket`, `QuantityStepper`, `CheckoutViewModel`, `AddressMenuPopup`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `Foundation` connect `SwiftUI` to `OnlinePayment`, `BarcodeCamera`, `.format`, `Coupon`, `AddToOpenFactsSheet`, `AuthError`, `Identifiable`, `AdminSession`, `AddressSearchView`, `.decode`, `Distributor`, `Driver`, `UpdateError`, `FirestoreService.swift`, `Tobacco`, `Offer`, `Hashable`, `SoundManager`, `DriverLiveTracking`, `CartViewModel`, `String`, `ScreenshotHooks`, `DecodingKeys`, `LocalStorage`, `CheckoutViewModel`, `Product`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `CatalogEnrichmentPipeline` connect `CatalogEnrichmentPipeline` to `EnrichmentDatabase`, `test_enrichment_pipeline.py`, `EnrichmentApiHandler`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `AdminDashboardViewModel` (e.g. with `.handleScan()` and `.distributorCard()`) actually correct?**
  _`AdminDashboardViewModel` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PLACED`, `PACKING`, `OUT_FOR_DELIVERY` to the rest of the system?**
  _768 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `db.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08350168350168351 - nodes in this community are weakly interconnected._
- **Should `OnlinePayment` be split into smaller, more focused modules?**
  _Cohesion score 0.057342657342657345 - nodes in this community are weakly interconnected._