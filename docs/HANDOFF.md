# Session Handoff & Implementation Status

> Read this first, then `docs/FIRESTORE.md` if you are touching the backend and
> `docs/GOTCHAS.md` before debugging anything. Everything below is VERIFIED
> unless explicitly marked otherwise.

---

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
| Auth | OTP generated in code + Firebase **anonymous** sign-in |
| Roles | `staff/{uid}` collection checked in security rules |
| Admin app | Separate **web-only** build (not yet done) |
| Plan | **Spark (free)** — no Cloud Functions, no paid SMS |

The user was explicit: **no paid services.** Do not propose Blaze, paid SMS, or
Cloud Functions as the default path.

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

## 2. How auth works now (and what it does NOT do)

`AUTH_MODE` defaults to `"otp"`:
1. `issueCode()` in `src/lib/auth.js` generates a random 4-digit code on device.
2. The code is held in memory with a 5-min TTL and a 5-attempt cap.
3. On success, `signInAnonymously()` gives a real `request.auth.uid`.
4. `users/{uid}` is created via `ensureUserProfile()`.

**The anonymous uid is the load-bearing part.** `firestore.rules` key all
ownership off `request.auth.uid`, so anonymous auth is what makes the rules work
at zero cost. Do not remove it thinking it is decorative.

**The OTP proves nothing about phone ownership** — the code is generated on the
same device that displays it. It is a number-entry confirmation and a stand-in,
not a security control. Data isolation comes from the rules, not the OTP.

To make it real later: change **only** `issueCode()` to call a backend that sends
SMS, and stop returning `devCode`/`devOtp` to the client. The login screen hides
the on-screen code automatically when `devOtp` stops coming back.

`AUTH_MODE=phone` still exists for real Firebase Phone Auth if billing is ever
enabled. Untested — the user declined paid SMS.

VERIFIED end-to-end in the browser: random code (not `1234`), wrong code rejects
with "Incorrect code", correct code advances to profile setup.

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
