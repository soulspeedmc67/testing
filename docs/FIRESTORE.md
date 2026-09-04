# DASHit — Firestore Backend

Replaces the Express + Socket.io server in `server/` and the JSON files in
`server/data/`. Firestore's realtime listeners replace Socket.io entirely: there
is no socket channel to maintain, clients subscribe to documents directly.

**Plan: Spark (free).** Roles live in a `staff` collection checked from security
rules, so no Cloud Functions are required. See "Known constraints" for what this
rules out.

---

## 1. One-time setup (you must do these — I cannot access your console)

1. Create a project at <https://console.firebase.google.com> (e.g. `dashit-anantnag`).
2. **Build → Firestore Database → Create database**. Start in **production mode**,
   region `asia-south1` (Mumbai — lowest latency for Kashmir).
3. **Build → Authentication → Sign-in method → enable Phone.**
   Add your own number under *Phone numbers for testing* with a fixed code — that
   lets you test the real flow without sending SMS.
4. **Project settings → General → Your apps → Add app → Web.** Copy the config
   values into `.env.local` (see `.env.local.example`).
5. Deploy rules and indexes:
   ```bash
   npx firebase-tools deploy --only firestore:rules,firestore:indexes
   ```
6. Seed the catalogue from the existing JSON:
   ```bash
   node scripts/seed-firestore.mjs
   ```
7. Make yourself an admin — in the console, create `staff/{your-auth-uid}`:
   ```
   role: "admin"   name: "Aleem"   active: true
   ```
   Get your uid from **Authentication → Users** after signing in once.

---

## 2. Data model

```
products/{productId}
  name, cat, price, originalPrice, unit, img, barcode,
  rating, badge, variants[], stock, active, createdAt, updatedAt

orders/{orderId}                       # orderId is the human code, e.g. DSH-4821
  userId, mobile, items[], subtotal, deliveryFee, discount, total,
  status, paymentMode, promoCode, address{nickname,address,lat,lng},
  driverId, driverName, createdAt, updatedAt, statusHistory[]

orders/{orderId}/tracking/live         # single doc, high write frequency
  lat, lng, etaMinutes, progressPct, status, driverName, updatedAt

users/{uid}
  mobile, name, email, createdAt
users/{uid}/addresses/{addressId}
  nickname, address, lat, lng, isDefault

staff/{uid}                            # written from the console ONLY
  role: "admin" | "driver", name, mobile, active

offers/{offerId}
  title, badge, subtitle, priceTag, category, promoCode, discountPercent,
  expiresIn, img, gradient, accent, active, createdAt

config/store                           # single doc
  isOpen, highDemand, updatedAt
```

### Why live tracking is a subcollection, not fields on the order

The rider's position updates every few seconds. If those writes landed on the
order document, every customer and admin listening to that order would be woken
on each GPS tick, and the order doc would become a write-contention hotspot.
Isolating them in `tracking/live` means the order doc changes only on real state
changes, and the map screen subscribes to just the small tracking doc.

---

## 3. Security model

`staff/{uid}` is the single source of truth for privilege and is **not writable
from any client** — you add staff in the console. Rules check it via `get()`.

| Collection | Read | Write |
|---|---|---|
| `products`, `offers`, `config` | anyone | admin |
| `users/{uid}` (+addresses) | owner, admin | owner |
| `orders` | owner, admin, assigned driver | owner creates; admin any; driver only status on assigned orders |
| `orders/*/tracking/live` | owner, admin, assigned driver | assigned driver, admin |
| `staff` | own doc only | nobody (console only) |

Each `get()` in a rule costs a document read, so `isStaff()` is only called on
paths that actually need it — customer reads of their own orders never hit it.

---

## 4. Realtime, without Socket.io

| Old socket event | Replacement |
|---|---|
| `join_order_room` | `onSnapshot(doc(db,'orders',orderId))` |
| `order_status_changed` | same listener — status is a field |
| `update_driver_location` | driver writes `orders/{id}/tracking/live` |
| `driver_location_changed` | `onSnapshot` on that tracking doc |

`src/lib/db.js` wraps all of this; components call `watchOrder()` /
`watchOrderTracking()` and never touch Firestore directly.

---

## 5. Known constraints on Spark

- **Phone Auth SMS is billed and generally needs Blaze.** The auth layer therefore
  has a provider switch: `NEXT_PUBLIC_AUTH_MODE=mock` uses the dev OTP (`1234`),
  `=phone` uses real Firebase Phone Auth. Switch it when billing is on; no call
  site changes.
- **No Cloud Functions**, so: no server-side FCM push (the app uses
  `@capacitor/local-notifications`, which is local and unaffected), no scheduled
  jobs, and no Admin SDK. Custom claims are therefore unavailable — hence the
  `staff` collection.
- The Open Food Facts product import runs **client-side** from the admin browser.
- Order codes are generated client-side in a transaction. This is safe against
  double-booking but not against a malicious client; move it to a Function if you
  later go Blaze.

---

## 6. Native (Capacitor) note for Phone Auth

Web Phone Auth uses reCAPTCHA, which is unreliable inside a WebView. For the
Android/iOS builds you will need `@capacitor-firebase/authentication` plus
SHA-1/SHA-256 fingerprints registered in Firebase, and `GoogleService-Info.plist`
/ `google-services.json` added to the native projects. The web build works as-is.
