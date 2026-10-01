# Task: make the DASHit driver app simple enough for riders who can't read well

You are working in the DASHit repo (Next.js 14 static export + Capacitor 8; Firebase Firestore/Auth on the Blaze plan). Read `CLAUDE.md`, `docs/GOTCHAS.md` and `docs/HANDOFF.md` first.

## Goal

Our delivery riders are mostly not comfortable reading. The driver app must work by **pictures, colours, big buttons, numbers and voice**, not by reading. Riders must **not see or pick orders** any more: **the admin assigns each order to a rider**, and the rider only sees the order(s) given to them.

## What exists today (verified in the code)

- Driver app: `src/pages/driver.js` (~1,700 lines), served at `/driver` and packaged as the Capacitor driver build (`Dashit-Driver.apk/.ipa`).
- Sign-in there: mobile code, email/password, and a "fleet PIN" step (`isFleetAuthorized`, `fleetPin`).
- Riders see an "available" pool (`watchAvailableOrders` in `src/lib/db.js`) and claim from it with slide-to-accept (`claimOrder`). Their own orders come from `watchDriverOrders(driverId)`, where `driverId = user.uid`.
- GPS: `trackingMode` defaults to `"simulate"`. Positions go to `drivers/{uid}/telemetry` (`pushDriverTelemetryToQueue`).
- Delivery: the rider types the customer's delivery code (`enteredOtp`) and the order goes to `DELIVERED`.
- Admin assigns from `src/components/admin/OrderDetailDrawer.jsx` (`onAssignDriver(orderId, drv.id, drv.name)`). The rider list comes from `src/lib/drivers.js` and **mixes real Firebase riders with a localStorage roster and fake `DEFAULT_DRIVERS` (`driver_tariq`, `driver_bilal`…)**.
- `firestore.rules`: riders are `staff/{uid}` with `role == 'driver'`. The orders rule currently lets a rider take an **unassigned** order (`driverId == null` → `driverId == request.auth.uid`).

## Known traps — fix these, don't build on them

1. **Assigning to a fake rider goes nowhere.** An order assigned to `driver_tariq` (a localStorage ID) is never seen by any phone, because the app watches `driverId == <Firebase uid>`. The admin may only assign to **real riders**: `staff` docs with `role: 'driver'` and `active: true`, where the ID is the Firebase uid. Remove `DEFAULT_DRIVERS` and the localStorage roster from the assignment list.
2. **Riders can still claim orders.** Once the UI stops showing the pool, the rule still allows a self-claim, so a modified app could grab orders. Change `firestore.rules` so **only an admin sets or changes `driverId`/`driverName`**. A rider may only update orders where `resource.data.driverId == request.auth.uid`, and only the status fields (out for delivery → delivered) plus their delivery-code check. Keep every other existing guard.
3. **"Simulate" GPS must not reach real customers.** Real riders always use the device location. Keep simulate only behind a dev flag on localhost.

## What to build

### A. Admin: assign a rider (admin console `/xcyop`, admin only)

- In the order drawer, a clear **"Give to rider"** choice. It shows only real active riders: name, photo or initial, and how many orders each has right now. One tap assigns. Allow "Change rider" and "Take back".
- Assigning writes `driverId` (uid), `driverName` and `assignedAt` (server time). Keep the order's status flow as it is.
- **Add rider** (admin, Drivers page): name, phone number, optional photo, and a **6-digit PIN** the admin picks or generates. This creates the Firebase Auth user and the `staff/{uid}` doc (`role: 'driver'`, `active: true`) through a small PHP endpoint, `public/api/staff/add-driver.php`, using the existing service account helpers in `public/api/_firebase.php`. The client can't create Auth users or write `staff`. The endpoint must verify the caller's Firebase ID token **and** that `staff/{caller}.role == 'admin'`, and be rate limited with `dashit_rate_limit` like the other endpoints. Also add **Turn off rider** (`active: false`) and **Reset PIN**. Never store the PIN in Firestore; Firebase Auth holds it.
- Rider sign-in identity: email `<10-digit phone>@riders.dashit.co.in`, password = the 6-digit PIN. The rider never sees the email.

### B. Rider app (`/driver`): picture-first, one job at a time

Remove the available-orders pool, slide-to-accept, the email form, the mobile-code form and the separate fleet-PIN step. Keep the GPS/telemetry, route and delivery-code logic, but strip it out of the UI.

1. **Sign in once, then stay signed in.**
   - The screen shows the rider's phone number (digits), then a **big number pad** for the 6-digit PIN. There's no text to read: a phone icon, a lock icon, then a big green ✓.
   - A wrong PIN shakes and buzzes the dots red.
   - After sign-in they stay signed in until the admin turns them off.
2. **Waiting screen (no order).** A big calm illustration (a rider resting) with a pulsing green dot meaning "you're on duty", and an **On duty / Off duty** toggle shown as a big green/grey switch with a scooter icon.
3. **New order arrives** (admin assigned it):
   - The phone plays a loud repeating sound, vibrates, and keeps the screen awake. The existing `requestScreenWakeLock` is fine.
   - It shows a full-screen card: the customer's **area name and house photo/landmark if present**, the **number of bags** (as bag icons ×N), and the **cash to collect** as a big ₹ amount with a cash icon. Show **"Paid ✓"** in green if paid online.
   - **One giant button: ▶ START** (green). The rider can't decline; only the admin re-assigns.
4. **Going to the customer:**
   - The top half is the map with the route. The bottom shows four big round buttons, each with an icon and a 1–2 word label:
     - 🧭 **Map**: opens Google Maps / Apple Maps navigation to the drop pin via an intent/URL.
     - 📞 **Call**: calls the customer's number from the order.
     - 🔊 **Listen**: reads the address and landmark aloud using `speechSynthesis` in the chosen language.
     - ✅ **Reached**: marks the rider as arrived.
   - Location sharing turns on automatically on START and off after delivery. No toggle and no "simulate".
5. **At the door:**
   - A big number pad: "Ask the customer for their 4-digit code", spoken aloud and shown as a picture of a phone with 4 dots.
   - The right code gives a big green tick, a happy sound and confetti, then marks the order DELIVERED.
   - A wrong code shakes the dots red and speaks "try again".
   - If the order is cash-on-delivery, first show a full-screen **"Take ₹___"** with a cash picture and a big ✓ button.
6. **Done screen:** a big tick and today's delivered count shown as big digits with a box icon. It goes back to the waiting screen after 3 seconds.
7. **More than one order assigned:** show them as numbered big cards (1, 2, 3) in the admin's order, one active at a time.

### C. Design rules

- **Words:**
  - Every action is an **icon + colour + at most 2 words**, and every screen has a 🔊 button that speaks the instruction.
  - Languages: **Urdu, Hindi, English**, picked once with flag/script buttons at first launch (default Urdu). Put the strings in one small table so Kashmiri can be added later.
  - No paragraphs, no jargon, no small print. Use plain everyday words (DASHit rule).
- **Size and colour:**
  - Touch targets at least 64×64 px, numbers at least 32 px, one primary action per screen.
  - Colours carry meaning everywhere: **green = go/done, orange = attention, red = problem, grey = off**. Never use colour alone; always pair it with an icon.
- **Behaviour:**
  - Works in bright sunlight: high contrast, light or dark following the system.
  - Respect `env(safe-area-inset-*)` and stay usable with the keyboard closed. The number pads are on-screen and never use the system keyboard.
  - Any popup is an **iOS-style bottom sheet** sliding up from the bottom, never a centred modal.
  - Haptics: crisp on iOS only via `isIOS()` in `src/lib/haptics.js`; keep Android vibration off **except** the new-order alert, which may vibrate on both.
- **Restraint:** no gradients, no decorative badges, no tinted notice slabs. It should look like a calm, professional tool.

### D. Cost and safety (Blaze plan: no surprise bills)

- The rider app keeps exactly **one** order listener: `where('driverId','==',uid)` plus status in [assigned/packed/out for delivery]. Delete the available-pool listener.
- Telemetry: at most one write every 10 s while an order is active, and none while idle or off duty.
- The new PHP endpoint is rate limited and admin-only. Nothing secret goes in client code; the old note in `driver.js` about hardcoded PINs still applies.

## Don't

- Don't touch the customer apps (`src/pages/index.js`, `android-compose/`, `ios-swift/`) or the customer storefront.
- Don't restyle the admin beyond the assign/add-rider pieces above.
- Don't move or hide `/driver` or `/xcyop`; they stay public and are protected by Firebase auth.
- Don't build or upload any APK/IPA, and don't deploy rules or the website. I'll do that after checking.

## Done means

1. `npm run build` passes, and `firestore.rules` compiles.
2. In the emulator or with test data, all of these work:
   - The admin adds a rider, which creates the Auth user and the staff doc.
   - The rider signs in with phone + PIN.
   - The admin assigns an order, and the rider's phone rings within a few seconds.
   - START, Map, Call, Listen, Reached, code entry and DELIVERED all work.
   - The admin re-assigning takes the order off the first rider's screen.
3. A rider **cannot** claim an unassigned order or change `driverId` (show the rules test).
4. Screenshots of every rider screen in Urdu and in English at 375 px width.
5. A short note in `docs/HANDOFF.md`: what changed, and the one-time setup (upload the service account file if missing, then add the first rider).
