# Session Handoff & Implementation Status

> Read this first, then `docs/FIRESTORE.md` if you are touching the backend and
> `docs/GOTCHAS.md` before debugging anything. Everything below is VERIFIED
> unless explicitly marked otherwise.

---

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
| Auth | Customers: number + WhatsApp code → Firebase custom token (§2). Staff: email |
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

**Customers (iOS `ios-swift/`, Android `android-compose/`) sign in with their
phone number only** (owner's decision, 2026-09-29): number → 6-digit code on
WhatsApp → signed in. No email, password, Apple or Google for customers.

1. The app POSTs the number to `public/api/auth/send-code.php` (PHP on the
   Hostinger site, beside the Razorpay endpoints). It sends the code with the
   `dashit_auth_otp` WhatsApp authentication template.
2. The app POSTs number + code to `verify-code.php`, which returns a Firebase
   **custom token** signed with the project's service-account key, for uid
   `ph-91XXXXXXXXXX` with the claim `mobile`. The app calls
   `signInWithCustomToken`. One number = one account on any phone.
3. `firestore.rules`: a `users/{uid}` profile can only carry its token's
   `mobile`, and only `mobile`-claim accounts (or staff) can create orders.
4. Sessions that aren't `ph-` accounts (old anonymous confirm-your-number,
   email, Apple) read as signed out in the customer apps. Android signs them
   out; iOS doesn't, because the admin app compiles the same `AuthService`.
5. Deleting an account asks for a fresh code first (Firebase only deletes
   recently signed-in accounts).

Secrets live outside the website folder on Hostinger
(`domains/dashit.co.in/dashit-secrets/sign-in.php` and
`firebase-service-account.json`). Setup, App Review demo number, and
local testing are in `docs/whatsapp-otp-setup.md`. Each WhatsApp code is a paid
Meta message; the server caps sends per number, per network address and per
day.

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

## 5. Next tasks, in order
- [x] **Remove socket.io from client** — Done. Swapped `LiveOrderFloatingTracker.jsx`, `MapTracking.jsx`, `orders.js`, and `driver.js` to Firestore `watchOrder` / `watchOrderTracking` / `pushDriverLocation`.
- [x] **Admin dashboard migration** — Done this session. See §4b.
1. **Driver console** (`src/pages/driver.js`) → Still the original demo screen: hardcoded `orderId = "DASH-98214"`, fake incrementing coordinates instead of real GPS, no sign-in, no staff gate. Wire to `watchDriverOrders(uid, cb)` for a real assigned-order list, `navigator.geolocation.watchPosition` for real coordinates, and gate entry the same way `AdminAccessGate` does (`getStaffRole(uid) === 'driver'` instead of `'admin'` — consider extracting a shared `<StaffGate role="..." />` component rather than duplicating the gate a third time).
2. **Split the admin build** (user chose web-only) so admin UI stops shipping inside the customer APK.
3. Retire `server/` once 1 is done.
4. **Deploy Firestore rules** (`npm run fb:rules`) — see §0. Blocked on the user; every write will keep failing until this happens.

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
