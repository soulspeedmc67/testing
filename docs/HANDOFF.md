# Session Handoff & Implementation Status

> Read this first, then `docs/FIRESTORE.md` if you are touching the backend and
> `docs/GOTCHAS.md` before debugging anything. Everything below is VERIFIED
> unless explicitly marked otherwise.

---

## Oct 4, 2026 (evening): blank pages, slow photos, first paint

Web parts VERIFIED on the production export (`out/`, served locally). iOS parts
are NOT compiled (no Swift on this machine) and need the GitHub Actions build.

- **Website blank after an order (fixed).** Checkout saved the delivery PIN as a
  number; `LiveOrderFloatingTracker` called `.trim()` on it and threw, and with
  no error boundary React emptied the whole page on every shop route while the
  order was live. Now the PIN is saved as text, the tracker accepts either, and
  `src/components/ErrorBoundary.jsx` wraps the page and each floating widget
  (`_app.js`), so one broken widget can't blank a page again.
- **Pages were invisible until all JavaScript ran (fixed).** `_app.js` started
  with the splash on, so every exported HTML file had the splash plus an
  `opacity:0` page wrapper. The splash state now starts off and is turned on in
  the layout effect only for an installed (Capacitor) app.
- **Slow photos (fixed on web and iOS).** Measured on dashit.co.in: small copies
  (`/products/thumbs/`) are 4–16 KB with `max-age` of a year; the 1000px
  originals (`/products/catalog/`) are missing for most products (404, not
  intermittent), and any photo address with a query string answers 404. Web
  cards and the iPhone app asked for the original first (iOS: four tries with
  waits). Both now ask for the small copy first and fall back once
  (`productImageUrl` in `ProductImage.jsx`, `ProductPhotoStore.swift`); the
  product page shows the small copy at once and swaps in the original if it
  exists. Android already did this.
- **Tracking page** (`src/pages/track/index.js`, `MapTracking.jsx`): the map is
  built straight away (it used to wait up to 4 s for the road route, on a black
  screen), a double-build race is closed, and made-up placeholders are gone
  (rider "Tariq Ahmad", order #98214, PIN 4289, 7 min / 1.7 km). No order shows
  "No order to track". The hard-coded `tel:` Call button was removed (owner's
  no-call-button rule). `watchOrder` / `watchOrderTracking` no longer retry
  every 2 s when Firestore answers "permission-denied".
- **Checkout** no longer reads saved orders during render (hydration mismatch
  that made React rebuild the page).
- **iOS Categories going blank: cause NOT reproduced.** Hardened instead:
  `CategoriesView` no longer calls `scrollTo` while the grid is being replaced
  (the per-shelf `.id` already opens at the top), shows a message instead of an
  empty pane, and `CatalogueDerive` falls back to one shelf per product category
  if Firestore `categories` matches no products. Check on a device.

### Later the same evening: fewer categories at once (website only)

VERIFIED on the production export at phone and desktop width. The iPhone and
Android apps were NOT changed by this; ask the owner before porting it.

- **Departments** (`GROUPS`, `buildAisleGroups`, `featuredAisles` in
  `src/lib/shopAisles.js`): the ~25 aisles sit under five departments (Fresh &
  daily, Snacks & drinks, Cooking & pantry, Personal & baby care, Home & more).
  An aisle not named in `GROUPS` lands in the last one.
- **Shop home** (`shop.js`): 7 aisles plus an "All categories" tile (was every
  aisle), the same 7 in the strip plus "More" (and whichever aisle is picked),
  and a product row for those 7 only. Product photos on the page went from 334
  to 139. A picked category now shows at once; it used to wait for the old list
  to fade out (`AnimatePresence mode="wait"`).
- **Categories page**: five department rows that open to their aisles, the
  first one open.
- **Search** (`search.js`, `src/lib/recentSearches.js`): an empty search shows
  this device's recent searches first (saved after typing pauses on a search
  that found something, `dashit_recent_searches`), with a small "Categories"
  button at the top right that swaps in the departments. Under them, two
  in-stock items from each everyday aisle.
- `ProductImage` shows a soft grey square while a photo loads, and photos
  already in the exported HTML are not hidden waiting for scripts.
- **iOS build 1.0.0 (411)** went to TestFlight from `soulspeedmc67/testing`
  `ios-release` (run 37217490462, "No errors uploading" for both the shop and
  admin apps). It has the photo and Categories fixes above, not this redesign.
  The compliance guard still prints 3 criticals (a localhost string in web
  files, Razorpay without StoreKit / Play Billing); physical groceries are
  exempt from in-app purchase, but answer for it before App Store review.

### Night of Oct 4: owner's rules for launch (website; VERIFIED on the export)

- **Delivery fee**: 40% of the order under ₹180 (was 30%), ₹35 from ₹180 to
  ₹299, ₹25 above ₹299; ₹11 handling on every order. Web
  (`FreeDeliveryProgress.jsx`) and iOS (`Cart.swift`, not built yet). Android
  not changed. The "first 5 orders free delivery" promo is still in the code:
  ask the owner whether it stays.
- **Right shelf for each product**: `src/lib/categorize.js` (ordered keyword
  rules, first match wins) gives every product `{cat, sub}` from its name;
  `catalogueFile.js` applies it when listing, so the saved copy keeps the
  catalogue's own category. About 1,300 of 4,650 products move. Website only:
  the apps still show the catalogue's categories. Shop shows the `sub` shelves
  as chips inside every aisle. New aisle: Clothing.
- **Shop chrome**: the order pill is now a bar at the top of the page, in the
  page flow (`_app.js`, next to `LaunchBar`); cart button bottom left; WhatsApp
  button bottom right with no pulse ring; the "FREE delivery above ₹299" pill
  and the free-delivery toast are gone; shop, categories and search use the
  full width on desktop (so does the header's inner row, width only).
- **Search**: Categories and Clear sit at the top right under the search bar.

### Late night Oct 4: the same rules in both apps

- **Android** (VERIFIED on the Pixel, release-signed build): cart bill is item
  total + delivery (40% under ₹180 / ₹35 / ₹25) + ₹11 handling (₹85 → ₹130);
  orders save `handlingFee`; home shows 6 everyday categories and their rows;
  Categories has five departments on the left, category chips and shelf chips
  on the right; search has a Categories button beside Clear. Android has no
  "first 5 orders free" promo (web and iOS do).
- **iOS**: same changes; compiled only by the GitHub Actions build.
- **Sorting rules are generated**: `android-compose/.../data/Shelves.kt` and
  `ios-swift/DASHit/Core/Utils/Shelves.swift` come from
  `src/lib/categorize.js`. Change the rules there and regenerate both, never
  by hand. The iOS admin app keeps the saved category (no re-shelving).
- Departments live in `Departments.kt` / `CatalogueDerive.departmentGroups` /
  `GROUPS` in `shopAisles.js`: keep the three in step.
- Handling charge is listed on the iOS order sheet, the web tracking page, the
  WhatsApp receipt and the packing slip (derived from the total for orders
  saved without `handlingFee`).

## Oct 3, 2026: web shop back for launch (5 Oct, 5 pm), iOS admin rider fix

- **Web shop restored** (pages removed in b7c93f3): /shop, /search, /categories,
  /product/?id=<id> (one page for every product; old /product/<id>/ links 302
  there via .htaccess), /checkout, /offers, /orders, /wishlist, /account,
  /login. Tobacco never shows on the website (`isTobaccoSectionEnabled` is off
  when not native).
- **No Firestore product reads**: every shop page reads the cron-built
  `/catalog/catalog.json` through `src/lib/catalogueFile.js` (browser ETag
  revalidation, then `/api/catalog/changes.php` every 60 s while visible). A
  shop visit costs one Firestore read (store open/closed). `createOrder` no
  longer reads each product from Firestore (shoppers can't, and it failed every
  web order); checkout checks stock against the catalogue and re-prices old carts.
- **Sign-in on the web**: Google (Firebase popup, redirect fallback), then the
  mobile number; SMS code through `send-otp.php`/`verify-otp.php` once 2Factor
  is configured (`src/lib/shopperAuth.js`, `CheckoutLoginModal.jsx`).
- **Payments on the web**: Razorpay Standard Checkout on the same PHP endpoints
  as the apps (`src/lib/razorpayWeb.js`); the order is written only after
  `verify-payment.php` recorded `payments/{id}`; a lost answer is checked with
  `payment-status.php`. Server keys are still TEST until live keys go in
  `dashit-secrets/razorpay.php`. .htaccess Permissions-Policy now allows
  `payment` for the page and api.razorpay.com.
- **Launch gate**: `src/lib/launch.js` (`LAUNCH_AT` = 5 Oct 2026 17:00 IST,
  `APK_URL`). Before it, the shop shows a top line and checkout refuses to
  place orders (button reads "Orders open 5 Oct, 5 pm"). Carts can be filled.
- **Landing page rewritten**: Shop now, Google Play / App Store "coming soon"
  badges (not links), "download the APK" link (default
  `https://github.com/soulspeedmc67/testing/releases/latest/download/DASHit.apk`,
  override with `NEXT_PUBLIC_APK_URL`; the repo must be public and the release
  asset named `DASHit.apk`), opening-day countdown. Removed invented claims
  (feature cards, "4.8 (10k)" ratings, "FSSAI / instant return" rows, made-up
  pack-of-2/4 variants, fake coupon codes on /offers).
- **iOS admin, "rider not assigned"**: since 717eb86 assigning keeps the order
  in Packing (the rider sends it out), but the admin never showed the rider, so
  it looked like nothing happened; save errors also showed behind the sheet.
  Now the card and the order sheet say "<rider> is coming to collect it" with
  "Change rider", errors show on the sheet, and writes always use the order's
  document id. Not compiled locally (Linux); needs the GitHub Actions build.

## Oct 1, 2026: tracking, payments, sign-in and security pass

- **Live tracking** (both apps): the route already ridden is trimmed away
  (nearest point on the polyline), the remaining distance and the ETA are worked
  out from what is left (`RouteProgress.kt`, `RouteGeometry.swift` +
  `LiveTrackingViewModel`). Not yet tested against a live order with rider GPS.
- **Android**: bottom nav hides on scroll down (`NestedScrollConnection` in
  `StorefrontScreen.kt`); search opens as an `AnimatedVisibility` overlay;
  category lists open at the top. **iOS**: categories open at the top
  (`showFromTop`), the catalogue is derived off the main thread and applied after
  the splash clears (`CatalogueDerive`, `CatalogueStore.commit`).
- **Product photos**: the photo host returns intermittent 404s for
  `/products/catalog/*` originals (about 45 % in a test). Both apps retry, then
  fall back to the thumbnail. Worth a look at the Hostinger side.
- **Razorpay**: Standard Checkout on both apps (Android `com.razorpay:checkout`,
  iOS SPM `RazorpayCheckout`), every method Razorpay offers (UPI, cards,
  netbanking, wallets, EMI, Pay Later). Server is in TEST mode until live keys go
  in `dashit-secrets/razorpay.php`. `create-order.php` now needs the shopper's
  Firebase ID token. **iOS has never been compiled locally**; the GitHub Actions
  build is the only compile check.
- **Sign-in**: WhatsApp codes and the "Is this your number?" step are gone; the
  number is confirmed with a 2Factor SMS code (§2, `docs/server-setup.md`). Waiting
  on the owner's 2Factor API key; until then numbers are saved unverified.
- **Google sign-in on Android** works once the signing key's SHA-1 is registered
  in Firebase (the machine's debug key and the original are; add the Play App
  Signing key when on Google Play).
- **Security audit**: `docs/SECURITY_AUDIT.md` lists what was fixed and what the
  owner still has to do (budget alert, App Check, API key restrictions,
  Cloudflare, disable Anonymous sign-in).

## Complaints & Copyright page — added (Sep 30, 2026)
- `src/pages/complaints.js` → `/complaints/`: grievance officer (support@dashit.co.in),
  copyright/trademark notice-and-takedown steps, 48 h reply / 36 h removal.
  Linked from the home footer, `/help`, Terms §8, the sitemap, both apps'
  Help & Support footers and Profile → Legal (iOS `ProfileView`, Android `ProfileScreen`).
- Grievance officer: Azan Mir (owner), via support@dashit.co.in — named on
  `/complaints/`, Terms §8 and Privacy §7.
- Android verified on the Pixel. iOS not built yet; web not deployed yet.

## Blinkit photos and catalogue — not used (Sep 30, 2026)
- No Blinkit photos or catalogue data are used anywhere in the app or build.
  The local archive (8.4 GB, gitignored via `/data/`; renamed by another tool
  from `data/products/blinkit/` to `data/products/catalog/`) is kept on disk at
  the owner's request — don't delete or move it.
- Removed: the uncommitted wiring that pointed the storefront at local Blinkit
  photos (saved in `data/backup/blinkit-photo-bank-wiring.patch`), and a
  names-only product-list feature built and then dropped at the owner's request
  (saved in `data/backup/catalog-work/`).

## Tobacco section (Blinkit-style) — added
- Tobacco (`isAgeRestricted` in `src/lib/ageGate.js`) is **hidden from all
  browsing**: shop, categories, search results, offers, checkout upsells,
  product "similar", order-again/modify lists, and the sitemap. Filtered via
  `browseable()` in `src/lib/tobacco.js`.
- Searching "cigarettes" etc. shows tobacco name rows + "No results" + the
  **"Looking for tobacco products?"** banner (`TobaccoSearchBanner.jsx`).
  "View items" → **"Please make sure…"** declaration
  (`TobaccoDeclarationSheet.jsx`: 18+/not on behalf of a minor, not near a
  school/college, photo ID at the door) → `/tobacco` section with plain,
  unbranded pack art (`public/art/tobacco-plain-pack.svg`).
- The declaration is stored as version 2 in `dashit_age_confirmed`; older
  "18+ only" confirmations are asked again once.
- **Store policy switch**: Apple guideline 1.4.3 forbids facilitating tobacco
  sales, so the section is **off inside the iOS app by default** (web and
  Android on — Google Play allows it in grocery apps with age-gating/ID check).
  Build-time env: `NEXT_PUBLIC_TOBACCO_SECTION=off` (off everywhere),
  `NEXT_PUBLIC_TOBACCO_IOS=on` (enable in iOS app; App Review risk).

## 0a. Security audit (2026-09-30, after the Blaze upgrade)

Changed in code (tested: PHP in a php:8.2 container, rules in the Firestore
emulator, 23/23 cases):
- **Paid-online orders need a server-recorded payment.** The admin and rider
  screens read any `paymentMethod` with online/UPI/card/prepaid as "collect
  nothing at the door", and the rules used to let a customer write that word
  freely. Now `verify-payment.php` / `payment-status.php` write
  `payments/{razorpay order id}` (service account, via Firestore REST in
  `public/api/_firebase.php`), and `firestore.rules` only accept such an order
  when that record's `receipt` is the order id and its `amount` covers the
  total. Totals fields must agree; 1–100 line items.
- **Add items is gone for paid orders** in both apps (it made a replacement
  order still marked paid, with the extra items never paid for).
- **Rate limits on every PHP endpoint** (`dashit_rate_limit` in `_http.php`,
  per network, IPv6 counted per /64): create-order 30/h, verify-payment 60/h,
  payment-status 120/h, verify-code 60/h; sign-in codes now also cap at
  10 per number per day.
- `categories` gets a public-read rule (both apps listen there; it was denied).

**Deploy order matters:** website (PHP) first, check one real online payment
creates `payments/{id}` in Firestore, *then* `firestore.rules`. Rules first
would refuse every online-paid order.

**App Check is in the code, in monitor mode until turned on in the console.**
Android: Play Integrity (release) / debug provider (debug builds print a
debug token to logcat), in `DashitApp.kt`. iOS: DeviceCheck (not App Attest,
which would need a new provisioning profile) / debug provider on the
simulator, in `FirebaseManager.swift`. Web staff pages: reCAPTCHA v3, only
when `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is set. Enforce in the console only
after its metrics show nearly all requests verified; the PHP endpoints don't
check App Check tokens yet.

Still open (need the owner's consoles or a bigger change): budget alerts,
App Check registration and enforcement, API-key restrictions, Phone sign-in
off, the website FTP login on soulspeedmc67/testing (deploys fail with 530),
server-side order pricing (prices and totals are still whatever the app
sends), and the hard-coded owner email in the rules not checking
`email_verified`.

## 0. Where the work stopped (read this first)

**The admin dashboard is now fully migrated to Firestore and access-gated.**
Driver console is still on old localStorage/mock data (§5, task 1) — pick that
up next. `npm run build` passes: 17/17 static pages, zero export errors.

### The user's Firebase project is live but rules are not deployed yet
This was discovered live during testing, not assumed: `.env.local` in this
environment has real Firebase config, and login correctly performs anonymous
sign-in — but the `users/{uid}` profile write fails with
`FirebaseError: permission-denied`. That means the project's Firestore is still
on its default deny-all rules; `firestore.rules` in this repo has never been
deployed. **Run `npm run fb:rules` before relying on any Firestore write.**
Reads/writes will keep failing (gracefully — see below) until then.

---

## 1. Backend: Express + Socket.io → Firestore

The old `server/index.js` (Express on :5001 with JSON files in `server/data/`) is
**superseded but not yet deleted** — leave it until the admin/driver screens are
migrated, since they still call it.

### Decisions the user made (do not re-litigate)
| Question | Decision |
|---|---|
| Auth | Customers: Google (Android) / Apple (iPhone), then a mobile number confirmed with a 2Factor SMS code (§2). Staff: email |
| Roles | `staff/{uid}` collection checked in security rules |
| Admin app | Separate **web-only** build (not yet done) |
| Plan | **Blaze** since 2026-09-30 (was Spark). Still no paid SMS; keep costs capped (§0a) |

The project is on Blaze now, so Cloud Functions are possible, but the owner's
worry is surprise bills: anything added must stay inside the free tiers and be
rate limited. Paid SMS is still out.

### Files created this session
| File | Purpose |
|---|---|
| `docs/FIRESTORE.md` | Setup checklist, data model, constraints |
| `firestore.rules` | Security enforcement (uid-based ownership) |
| `firestore.indexes.json`, `firebase.json` | Deploy + emulator config |
| `src/lib/firebase.js` | SSR-safe singleton, `AUTH_MODE` switch |
| `src/lib/auth.js` | OTP + anonymous sign-in, staff role lookup |
| `src/lib/db.js` | All collections + realtime listeners |
| `src/lib/api.js` | **Rewritten** onto Firestore, same export names |
| `scripts/seed-firestore.mjs` | Seeds from `server/data/*.json` |
| `.env.local.example` | Config template |

npm scripts added: `seed:firestore`, `fb:rules`, `fb:emulate`.

### Socket.io is now redundant
| Old socket event | Replacement in `src/lib/db.js` |
|---|---|
| `join_order_room` / `order_status_changed` | `watchOrder(orderId, cb)` |
| `update_driver_location` | `pushDriverLocation(orderId, payload)` |
| `driver_location_changed` | `watchOrderTracking(orderId, cb)` |

`socket.io-client` has been **completely removed** from all client components:
`LiveOrderFloatingTracker.jsx`, `MapTracking.jsx`, `orders.js`, and `driver.js`.
All real-time events now use Firestore `watchOrder` and `watchOrderTracking`.

> Design note worth preserving: live rider GPS lives in
> `orders/{id}/tracking/live`, a subcollection doc, *not* on the order document.
> On the order doc, every GPS tick would wake every customer and admin listening
> to that order and make it a write hotspot.

---

## 2. How auth works now

**Customers (iOS `ios-swift/`, Android `android-compose/`) sign in with Apple
(iPhone) or Google (Android), then give a mobile number the rider can call.**
The WhatsApp-code sign-in and the "Is this your number?" confirmation were
removed on 2026-10-01; a number is now confirmed with an SMS code through
**2Factor** (2factor.in). Setup: `docs/server-setup.md` §3.

1. The Firebase account (Google/Apple) is the customer. `users/{uid}` holds the
   profile; `firestore.rules` only let a Google/Apple account (or an older
   number account) write it or place orders.
2. After the number is typed the app POSTs it, with the shopper's Firebase ID
   token, to `public/api/auth/send-otp.php`, which asks 2Factor to text a code
   and returns a signed ticket (account + number + 2Factor session, 10 minutes).
3. The app POSTs number + code + ticket to `verify-otp.php`. If 2Factor says
   the code is right, the server writes `mobile` and `mobileVerified: true` on
   the profile with the service account. The rules stop an app turning
   `mobileVerified` on or keeping it after changing the number.
4. **If no 2Factor key is in `dashit-secrets/sign-in.php`, `send-otp.php`
   answers `{"configured": false}` and the apps just save the number
   (unverified).** The owner will add the key last; no app update is needed.
5. Spend is capped in `auth/_otp.php` (per network address, account, number,
   and per day for the whole shop).

Secrets live outside the website folder on Hostinger
(`domains/dashit.co.in/dashit-secrets/`).

**Staff** (web `/xcyop` admin, `/driver`, iOS admin app) are unchanged: email
sign-in, or the driver console's on-screen code + anonymous session. Keep
Anonymous sign-in enabled in Firebase for the driver console.

The web storefront no longer has customer sign-in at all (the site is a
download page), so `AUTH_MODE` in `src/lib/auth.js` only affects the driver
console.

---

## 3. What the USER must do (blocked on them, not on you)

Cannot be done from this environment — needs their Firebase console:
1. Create the project; Firestore in **`asia-south1`** (Mumbai).
2. **Authentication → Sign-in method → enable Anonymous.** ← required for the
   current auth flow; Phone is *not* needed.
3. Copy the web config into `.env.local` (see `.env.local.example`).
4. `npm run fb:rules` then `npm run seed:firestore`.
5. Sign in once, take the uid from Authentication → Users, create
   `staff/{uid}` with `role: "admin"`, `active: true`.

Until step 3 is done, `isFirebaseConfigured` is false and every data call falls
back to localStorage. The app runs fine in this state — that is deliberate.

---

## 4. Earlier work this session (all VERIFIED, all shipped to the Pixel)

- **Four dead interactions fixed** — silent prop-contract mismatches:
  `onQuickView` vs `onOpenQuickView` (home product cards were untappable),
  `cartQty`/`onAdd` vs `cart`/`onAddToCart` (quick-view ADD did nothing),
  missing `isOpen` on categories, and `===` id comparison across string/number.
  See `docs/GOTCHAS.md` §8.
- **Variant sheet** keeps the sheet open on add with inline −/qty/+ per size.
- **Navigation**: `src/lib/navigation.js` → `goBack(router, fallback)` replaces
  bare `router.back()` (which dead-ends on deep-link/cold-start entry).
- **Profile slide fixed**: `account.js` had `drag="x"` on the whole page; the
  iOS edge-swipe is now a 24px strip gated by `src/lib/platform.js`.
- **Palette unified**: `#FF5B00` brand orange everywhere (~200 touchpoints);
  legacy Blinkit green `#0c831f` removed as a *primary action* colour.
  **Green is reserved for semantic success/trust only** — `success` badge,
  admin "Delivered", driver confirmation, ShieldCheck icons. Do not re-sweep.
- **Live tracker**: minimal obsidian card; omnidirectional drag docks it to a
  52×76 edge puck; `DeliveryStatusIcon.jsx` shows a white circle with an animated
  parcel ("packing") or rider ("riding") mark chosen from live order status.
- **Map fixed**: `MapWithPinInner.jsx` had a hand-rolled `touchmove` `panBy()`
  running *alongside* Leaflet's own `dragging` — the map moved ~2× the finger.
  Now 1:1 (measured 119.9px for a 120px drag) and stable after release.
  See `docs/GOTCHAS.md` §7.

---

## 4b. This session: admin.js fully migrated + three real bugs fixed

**`src/pages/admin.js`** now runs entirely on `src/lib/db.js`, with the same
dual-path pattern as every other page (`isFirebaseConfigured` branches to
Firestore realtime vs. localStorage). All four tabs migrated:
- **Orders**: `watchAllOrders()` (no more 5s polling), `fsUpdateOrderStatus()`
- **Offers**: `watchOffers()` / `saveOffer()` / `deleteOffer()`, falls back to
  the existing `src/lib/offers.js` localStorage module when unconfigured
- **Importer**: rewritten onto `src/lib/openFoodFacts.js` (new file) — runs
  **client-side**, independent of Firebase config. See §4c, this was NOT a
  drop-in port: the old server set a `User-Agent` header, which browsers
  refuse to let JS set (forbidden header) — that header is simply gone.
- **Catalogue**: `watchProducts()` realtime, `upsertProduct()` / `fsDeleteProduct()`

**Access gate added**: `AdminAccessGate` (new default export) wraps the
dashboard. On Spark there are no custom claims, so it mirrors the rules: watch
auth state, then `getStaffRole(uid)`, three states — checking / signed-out /
denied / open. Staff sign in via the ordinary `/login` OTP flow once; an
existing admin then grants `staff/{uid}` in the console (FIRESTORE.md step 5).
**Verified live** (not just code-reviewed): signed-out → "Sign in required";
signed in but no staff doc → "Access denied" — confirmed this **fails safe even
with rules undeployed** (an undeployed/denied `staff/{uid}` read is caught by
`getStaffRole` and treated as "not staff", not as an error that leaks access).

### Three real bugs found and fixed while wiring this up
1. **`upsertProduct()` in `db.js`** only defaulted `active: true` on the
   auto-id (`addDoc`) path, not when a caller supplies an explicit id. The new
   OFF importer always passes `id: barcode` (to dedupe re-imports the way the
   old server did) — every import would have been invisible forever, since
   every catalogue query filters `active == true`. Fixed: `active: true` is
   now the default on both paths, overridable by the caller.
2. **`LiveOrderFloatingTracker.jsx`** ran its `watchOrder`/`watchOrderTracking`
   `useEffect` unconditionally — `isHiddenPage` (which includes `/admin`) was
   computed AFTER that effect and only gated the render, not the hooks (hooks
   always run). A stale `dashit_active_order` in localStorage was found live
   opening two Firestore listeners on every page load, including `/admin`
   where the component is supposed to be fully inert. Fixed: `isHiddenPage` is
   now computed first and gates the effect too.
3. **`verifyOtp()` in `auth.js`** treated a failed Firestore profile write as a
   total login failure, even though `signInAnonymously()` had already
   succeeded and the user had a working uid. That's inconsistent with every
   other page's "degrade to localStorage, don't block" behavior — reproduced
   live against the undeployed rules above. Fixed: sign-in failure and
   profile-write failure are now handled separately; a profile-write failure
   logs a warning and still returns a usable local user.

## 4c. `src/lib/openFoodFacts.js` (new)

Client-side port of the old server's OFF search/classify logic
(`classifyCategory`, `extractBestFrontImage`, barcode + query search). Runs
regardless of Firebase config — it only talks to `world.openfoodfacts.net`, not
Firestore. **Caveat, not yet hit but worth knowing**: this relies on OFF's
public API allowing CORS from a browser origin; if a network/region ever blocks
it, searches fail with a plain network error and there is no server-side
fallback by design (Spark has no Cloud Functions to proxy through).

---

## 4d. Driver App Simplification (Picture-First & Admin-Only Dispatch) — Complete (Oct 1, 2026)

### 1. Overview & Low-Literacy Design
The delivery driver app (`src/pages/driver.js`, packaged as `Dashit-Driver.apk`) was completely overhauled for delivery riders who cannot read well.
- **Picture-first & high contrast**: Bold, color-coded status states, numbers, and clear iconography. Minimum touch targets >= 64×64 px, keypad numbers >= 32 px.
- **Languages & Voice**: Urdu (🇵🇰 default), Hindi (🇮🇳), and English (🇬🇧) with one-tap switcher. All instructions, order amounts, and addresses can be read aloud via Text-to-Speech (`speechSynthesis` with `ur-PK`, `hi-IN`, `en-IN` locales).
- **Sound Alerts**: Dual-tone repeating siren on new orders via Web Audio API synthesizer, cheerful chime on delivery completion, and error buzzers.
- **No Available Orders Pool or Claiming**: The open order pool, manual claiming, and slide-to-accept have been completely removed.
- **Admin-Only Dispatch**: Riders only receive and see orders assigned specifically to them by the admin in `/xcyop`.

### 2. Workflow & Screens
1. **Sign-In** (`/driver`):
   - Phone keypad: 10-digit mobile number entry.
   - PIN keypad: 6-digit PIN entry. Authenticates against Firebase Auth with `<phone>@riders.dashit.co.in`.
2. **Waiting / Duty Status**:
   - Giant On Duty / Off Duty toggle switch with resting bike illustration.
   - Counter of today's completed deliveries.
3. **Incoming Order Alert**:
   - Loud repeating dual-tone siren. Amber border.
   - Shows drop area name, bag count icon, payment card (₹ amount for Cash on Delivery or "Paid Online" shield).
   - Single giant green button: **▶ START (شروع کریں)**.
4. **En Route Navigation**:
   - High-contrast Leaflet road route map with live GPS tracking marker and customer pin.
   - Four large circular action buttons:
     1. 🧭 **Map** (Turn-by-turn driving in Google Maps).
     2. 📞 **Call** (Direct phone call to customer).
     3. 🔊 **Listen** (Speaks address and landmark aloud in rider's chosen language).
     4. ✅ **Reached** (Advances to door verification).
5. **Door Arrival & Delivery Verification**:
   - If COD: High-visibility amber card: **Take ₹___** with big confirm button.
   - Delivery Confirmation: On-screen keypad for 4-digit customer delivery code.
   - Security rule enforced: driver cannot mark `Delivered` unless `deliveryCode` matches `resource.data.otp`.
6. **Delivered Screen**:
   - Confetti burst (`canvas-confetti`), celebration chimes, thumbs-up, and updated daily count.

- **Automatic Rider Self-Registration**:
  - Riders do NOT need to be manually pre-created by the admin.
  - When a rider installs the Rider APK (or accesses `/driver`), enters their 10-digit mobile number and sets their 6-digit PIN:
    - If the account doesn't exist, it is automatically created in Firebase Auth (`<phone>@riders.dashit.co.in`) and registered in Firestore `staff/{uid}` with `role: "driver"`, `active: true`.
    - If the account already exists, entering the correct PIN signs them in directly.
    - If an incorrect PIN is entered for an existing account, it detects the conflict and signals "Wrong PIN".
  - The newly registered rider immediately appears in the admin's driver fleet roster and assignment drawer on `/xcyop`.

### 3. Backend, Admin & Security Rules
- **Firestore Security Rules (`firestore.rules`)**:
  - `staff/{uid}`: Riders can create their own staff record upon sign-up if `role == 'driver'` and `active == true`. Updates and deletions remain strictly admin-only.
  - `orders/{orderId}`: Drivers cannot claim unassigned orders or change `driverId`/`driverName`.
  - Drivers can only transition their own assigned orders to `Out for Delivery` or `Delivered`.
  - Transition to `Delivered` strictly validates `deliveryCode` or `enteredOtp` against `resource.data.otp`.
- **Admin Dispatch (`src/components/admin/OrderDetailDrawer.jsx`)**:
  - Real active riders list with real-time active load counts (e.g. `(0 active)`).
  - 1-tap assign, "Change rider", and "Take back".
  - Cleaned: removed mock `DEFAULT_DRIVERS` and localStorage roster.
- **Fleet Management (`src/components/admin/DriversView.jsx`)**:
  - Live roster table showing phone, status, and active load.
  - "Add Driver" modal (generates 6-digit PIN, writes to Auth + `staff/{uid}`).
  - "Turn off / Turn on" driver toggle and "Reset PIN" modal.
- **Server API (`public/api/staff/add-driver.php`)**:
  - Secure PHP endpoint powered by Firebase service account and Identity Toolkit REST.
  - Supports `self-register` action (caller UID auto-provisions driver staff doc) in addition to admin actions (`create`, `toggle-active`, `reset-pin`).
- **Performance & Blaze Cost Control**:
  - Exactly one Firestore listener per active driver: `where("driverId", "==", uid)`.
  - GPS telemetry throttled to at most once per 10 seconds, only active while out for delivery.

### 4. Setup Steps for Owner / Admin
1. Upload Firebase service account JSON to `dashit-secrets/firebase-service-account.json`.
2. Deploy the updated security rules: `npm run fb:rules`.
3. Riders can simply open the APK, enter their phone and 6-digit PIN to start working immediately. No admin pre-registration needed. (Admins can still view the fleet, toggle active/inactive, or reset PINs from `/xcyop` -> **Drivers** tab).

---

## 5. Next tasks, in order
- [x] **Remove socket.io from client** — Done. Swapped `LiveOrderFloatingTracker.jsx`, `MapTracking.jsx`, `orders.js`, and `driver.js` to Firestore `watchOrder` / `watchOrderTracking` / `pushDriverLocation`.
- [x] **Admin dashboard migration** — Done this session. See §4b.
- [x] **Driver console overhaul** (`src/pages/driver.js`) — Done. Picture-first, voice-guided, admin-only dispatch, real GPS telemetry, rules-enforced OTP verification. See §4d.
1. **Split the admin build** (user chose web-only) so admin UI stops shipping inside the customer APK.
2. Retire `server/` once 1 is done.
3. **Deploy Firestore rules** (`npm run fb:rules`) — see §0. Blocked on the user; every write will keep failing until this happens.

---

## 6. Environment traps that cost time this session

- **Never run `npm run build` while the dev server is running.** It rewrites
  `.next` under the running server and produces
  `Cannot find module './chunks/vendor-chunks/next.js'` 500s. Stop the preview,
  `rm -rf .next`, then build. This bit twice.
- The backend on `:5001` is not running here, so `socket.io` polls the Next dev
  server every ~250ms and floods the console with 404s. It also makes synthetic
  clicks in the browser tool time out. Not a bug in the app.
- OSM tiles are blocked in this sandbox — map geometry can be verified via the
  Leaflet pane transform, but tiles will not render.
- Physical device: Pixel 5 `08201FDD40016N`.
  `npm run build && npx cap sync android && cd android && ./gradlew installDebug`.
- **The Android app id is now `com.dashit.app`, NOT `com.dashit.anantnag`.** It was
  changed (matching the Truecaller deep-link scheme `com.dashit.app://`). The old
  `adb shell am start -n com.dashit.anantnag/.MainActivity` fails with
  `Error type 3 / Activity class does not exist`. Launch with:
  `adb -s 08201FDD40016N shell monkey -p com.dashit.app -c android.intent.category.LAUNCHER 1`

---

## 7. UI / UX session (login, sheets, nav)

- **Login redesigned** (`src/pages/login.js`): now defaults to **Sign Up**
  (`authTab` initial state) rather than Sign In. Removed the 12 scattered food
  emoji and the wavy SVG divider; uses the real app icon (`/dashit-app-icon.png`)
  instead of a text logo chip. Pill inputs → `rounded-2xl` on `white/[0.06]`
  surfaces, gradient-glow submit → flat `#FF5B00`, and the bare circular
  Google/Truecaller icons became labelled full-width buttons. Step 3 (delivery
  details) was re-skinned to the same surface language.
- **Sheet scrolling fixed** — see `docs/GOTCHAS.md` §6b. New shared hook
  `src/lib/useBodyScrollLock.js`, applied to all seven sheet surfaces including
  `ui/VaulDrawer.jsx`. **Verified**: with the address sheet open the background
  no longer scrolls (held at 0), and closing restores the exact prior offset
  (1200), not the top of the page.
- **Bottom nav no longer tappable while hidden** — see `docs/GOTCHAS.md` §6c.

### Still open from this session
- The catalogue currently served from Firestore has **no multi-variant products**,
  so the variant "more options" sheet could not be opened live to confirm its
  scroll fix end-to-end. Its lock + `max-h/overflow` classes are in place and the
  identical mechanism was verified on the address sheet, but a live check is
  worth doing once a multi-size product exists in Firestore.
- "UI enhancement all over the app" was scoped to login + sheet + nav this
  session. Other screens (cart, checkout, orders) have not had a consistency pass.
