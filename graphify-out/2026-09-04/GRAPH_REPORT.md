# Graph Report - Blinkit  (2026-09-04)

## Corpus Check
- 122 files · ~125,451 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 504 nodes · 867 edges · 76 communities (47 shown, 29 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c4986dea`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- hapticLight
- orders.js
- pages/index.js
- InteractiveMapModal.jsx
- AppDelegate
- LiveOrderFloatingTracker.jsx
- admin.js
- package.json
- server/index.js
- RemotionDeliveryBadge.jsx
- ExampleInstrumentedTest.java
- dependencies
- MainActivity.java
- build-app.sh
- gradlew
- socket.js
- AnimatedSearchBar.jsx
- CategoryNavigationTabs.jsx
- PromoCardsCarousel.jsx
- CartDrawerSheet.jsx
- @capacitor/app
- @capacitor/cli
- 📋 Master Client Discovery & Setup Checklist
- @capacitor/haptics
- @capacitor/ios
- @capacitor/local-notifications
- @capacitor/core
- clsx
- express
- framer-motion
- Package.swift
- lucide-react
- mongoose
- next.config.js
- leaflet
- next
- react-dom
- react-leaflet
- @remotion/player
- socket.io
- socket.io-client
- tailwind-merge
- vaul
- account.js
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
- @capacitor/android
- README.md

## God Nodes (most connected - your core abstractions)
1. `hapticLight()` - 39 edges
2. `hapticMedium()` - 30 edges
3. `cn()` - 19 edges
4. `goBack()` - 12 edges
5. `BottomNav()` - 11 edges
6. `AppDelegate` - 10 edges
7. `ProductCardStepper()` - 10 edges
8. `SPRING_SNAPPY` - 10 edges
9. `Critical Gotchas & Pitfalls — DASHit` - 10 edges
10. `📋 Master Client Discovery & Setup Checklist` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Tabs()` --references--> `react`  [EXTRACTED]
  src/components/ui/tabs.jsx → package.json
- `TabsList()` --references--> `react`  [EXTRACTED]
  src/components/ui/tabs.jsx → package.json
- `BottomNav()` --calls--> `hapticLight()`  [EXTRACTED]
  src/components/BottomNav.jsx → src/lib/haptics.js
- `CategoryGridSixPack()` --calls--> `hapticLight()`  [EXTRACTED]
  src/components/CategoryGridSixPack.jsx → src/lib/haptics.js
- `CategoryScroller()` --calls--> `hapticLight()`  [EXTRACTED]
  src/components/CategoryScroller.jsx → src/lib/haptics.js

## Import Cycles
- None detected.

## Communities (76 total, 29 thin omitted)

### Community 0 - "hapticLight"
Cohesion: 0.10
Nodes (32): CAMPAIGN_CATEGORIES, CAMPAIGN_PRODUCTS, CheckoutLoginModal(), AVAILABLE_COUPONS, CouponsDrawer(), triggerFlyToCart(), FreeDeliveryCelebrationModal(), LoginProductMarquee() (+24 more)

### Community 1 - "orders.js"
Cohesion: 0.11
Nodes (22): react, react, DashitAnimatedLogo(), DashitProgressBadge(), Badge(), badgeVariants, Button, buttonSizes (+14 more)

### Community 2 - "pages/index.js"
Cohesion: 0.12
Nodes (29): CategoryGridSixPack(), SIX_PACK_CATEGORIES, CATEGORY_STRIP, CategoryScroller(), LocationPickerModal(), ProductCard(), ProductCardSkeleton(), CURATED_RAILS (+21 more)

### Community 3 - "InteractiveMapModal.jsx"
Cohesion: 0.18
Nodes (12): HUB_POS, InteractiveMapModal(), MapWithPin, MapTracking(), fetchRoadRoute(), reverseGeocodeCoords(), searchPlacesAutocomplete(), ConfirmLocationPage() (+4 more)

### Community 4 - "AppDelegate"
Cohesion: 0.09
Nodes (20): Any, Bool, Capacitor, AppDelegate, UIScene, UISceneSession, UIWindow, SceneDelegate (+12 more)

### Community 5 - "LiveOrderFloatingTracker.jsx"
Cohesion: 0.11
Nodes (23): AnimatedCounter(), AppHeader(), BottomNav(), NAV_ITEMS, STOREFRONT_TABS, DeliveryStatusIcon(), SIZES, statusToMark() (+15 more)

### Community 6 - "admin.js"
Cohesion: 0.21
Nodes (17): BklitAreaChart(), DATA_MONTH, DATA_TODAY, DATA_WEEK, fetchAdminOrders(), updateAdminOrderStatus(), addExclusiveOffer(), DEFAULT_OFFERS (+9 more)

### Community 7 - "package.json"
Cohesion: 0.12
Nodes (16): autoprefixer, devDependencies, autoprefixer, postcss, tailwindcss, tailwindcss, name, private (+8 more)

### Community 8 - "server/index.js"
Cohesion: 0.12
Nodes (12): app, DATA_DIR, express, fs, http, io, orders, path (+4 more)

### Community 9 - "RemotionDeliveryBadge.jsx"
Cohesion: 0.22
Nodes (4): DeliveryScooterComposition(), Player, Player, StopwatchGuaranteeComposition()

### Community 10 - "ExampleInstrumentedTest.java"
Cohesion: 0.33
Nodes (5): ExampleInstrumentedTest, ExampleUnitTest, androidx.test.ext.junit.runners.AndroidJUnit4, org.junit.runner.RunWith, org.junit.Test

### Community 11 - "dependencies"
Cohesion: 0.29
Nodes (7): animejs, canvas-confetti, dependencies, animejs, canvas-confetti, remotion, remotion

### Community 12 - "MainActivity.java"
Cohesion: 0.47
Nodes (4): MainActivity, android.os.Bundle, com.getcapacitor.BridgeActivity, Override

### Community 13 - "build-app.sh"
Cohesion: 0.40
Nodes (4): ANDROID_HOME, JAVA_HOME, PATH, build-app.sh script

### Community 14 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 20 - "CartDrawerSheet.jsx"
Cohesion: 0.40
Nodes (3): EmptyCartState(), EmptySearchState(), SUGGESTED_SEARCH_CHIPS

### Community 23 - "📋 Master Client Discovery & Setup Checklist"
Cohesion: 0.18
Nodes (10): 📅 15-Day Milestone Tracker, **ADMIN PAGE**, 📋 Master Client Discovery & Setup Checklist, SECTION 1: Brand & Identity, SECTION 2: Dark Room & Delivery Zone (Anantnag), SECTION 3: Scooter Delivery Team, SECTION 4: Product Catalog & Categories, SECTION 5: Pricing, Charges & Order Rules (+2 more)

### Community 48 - "account.js"
Cohesion: 0.17
Nodes (15): hapticCartAdd, goBack(), historyDepth(), hasSystemBackGesture(), isAndroid(), isIOS(), addToWishlist(), getWishlist() (+7 more)

### Community 64 - "DASHit — Claude OS & Architecture Constitution"
Cohesion: 0.22
Nodes (8): 1. Knowledge Graph Navigation (Graphify), 2. Progressive Context Router (Load ONLY when relevant), 3. Strict Project Constraints (NEVER VIOLATE), 4. Tech Stack & Key Locations, 5. Skills Guidance (On-Demand Only), 6. Development & Verification Commands, 7. Execution & Token Efficiency Rules, DASHit — Claude OS & Architecture Constitution

### Community 65 - "Critical Gotchas & Pitfalls — DASHit"
Cohesion: 0.18
Nodes (10): 1. No Server-Side Next.js Features in Mobile Apps, 2. Physical Device Verification vs GitHub Releases, 3. Capacitor Asset Syncing Trap, 4. Android Haptic Motor Harshness, 5. Virtual Keyboard & Floating Docks, 6. Safe Area Insets, 7. Leaflet: Never Hand-Roll Panning, 8. Component Prop Contracts Are Loose (+2 more)

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
Cohesion: 0.25
Nodes (7): 1. What Changed in the Latest Session, 1b. What Changed in the Prior Session, 1b. What Changed in the Prior Session, 1b. What Changed in the Prior Session, 2. Current Verification Status, 3. Next Recommended Actions, Session Handoff & Implementation Status

## Knowledge Gaps
- **146 isolated node(s):** `build-app.sh script`, `JAVA_HOME`, `ANDROID_HOME`, `PATH`, `PackageDescription` (+141 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `orders.js`, `package.json`, `@capacitor/app`, `@capacitor/cli`, `@capacitor/haptics`, `@capacitor/ios`, `@capacitor/local-notifications`, `@capacitor/core`, `clsx`, `express`, `framer-motion`, `lucide-react`, `mongoose`, `leaflet`, `next`, `react-dom`, `react-leaflet`, `@remotion/player`, `socket.io`, `socket.io-client`, `tailwind-merge`, `vaul`, `@capacitor/status-bar`, `@capacitor/android`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Why does `react` connect `orders.js` to `dependencies`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **What connects `build-app.sh script`, `JAVA_HOME`, `ANDROID_HOME` to the rest of the system?**
  _146 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `hapticLight` be split into smaller, more focused modules?**
  _Cohesion score 0.1027450980392157 - nodes in this community are weakly interconnected._
- **Should `orders.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11260504201680673 - nodes in this community are weakly interconnected._
- **Should `pages/index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11962833914053426 - nodes in this community are weakly interconnected._
- **Should `AppDelegate` be split into smaller, more focused modules?**
  _Cohesion score 0.08866995073891626 - nodes in this community are weakly interconnected._