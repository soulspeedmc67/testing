# Session Handoff & Implementation Status

> Read this first, then `docs/FIRESTORE.md` if you are touching the backend and
> `docs/GOTCHAS.md` before debugging anything. Everything below is VERIFIED
> unless explicitly marked otherwise.

---

## 0. Where the work stopped (read this first)

The **Firestore backend foundation is built and building clean**, but only the
foundation. The driver console and admin dashboard have **not** been migrated —
they still read the old Express endpoints and localStorage.

`npm run build` passes: 17/17 static pages, zero export errors. Nothing is left
in a broken state.

**The immediate next task** is §5 below: wire `src/pages/driver.js` and
`src/pages/admin.js` to the new `src/lib/db.js` helpers, then split admin into
its own web-only build.

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

`socket.io-client` is still imported by `LiveOrderFloatingTracker.jsx` and
`MapTracking.jsx`. **Removing those imports is part of the next task** — they
currently connect to a server that will not exist.

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

## 5. Next tasks, in order

1. **Driver console** (`src/pages/driver.js`) → `watchDriverOrders(uid, cb)`,
   `updateOrderStatus()`, and a GPS loop calling `pushDriverLocation()`.
   Gate entry on `getStaffRole(uid) === 'driver'`.
2. **Admin dashboard** (`src/pages/admin.js`) → `watchAllOrders()`,
   `assignDriver()`, `upsertProduct()`/`deleteProduct()`, `saveOffer()`,
   `setStoreConfig()`, `fetchOrderStats()`. Gate on `role === 'admin'`.
3. **Remove socket.io** from `LiveOrderFloatingTracker.jsx` and
   `MapTracking.jsx`; swap to `watchOrder` / `watchOrderTracking`.
4. **Split the admin build** (user chose web-only) so admin UI stops shipping
   inside the customer APK.
5. Retire `server/` once 1–3 are done.

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
