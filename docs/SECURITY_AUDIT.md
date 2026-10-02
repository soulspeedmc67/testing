# Security and cost audit — 2026-10-01

Scope: the website and PHP endpoints (`public/`), `firestore.rules`, the Android
(`android-compose/`) and iPhone (`ios-swift/`) apps, the driver app, and the
Firebase project `dashit-1ecba` as far as the CLI could read it. Goal: nothing a
stranger can do should take the shop down or run up a bill.

Status words: **fixed** (in this change), **you** (needs you in a console, I can't
or shouldn't do it), **open** (known gap, decision or work needed).

## What was fixed

| # | Problem | Fix |
|---|---------|-----|
| 1 | `razorpay/create-order.php` answered anyone on the internet, limited only by network address. | Needs a signed-in shopper's Firebase ID token (anonymous sessions refused). Both apps send it. The Razorpay order is stamped with who asked (`notes.dashit_uid`), the payment record keeps it, and `firestore.rules` only let that shopper attach the payment to an order. |
| 2 | An anonymous Firebase session (anyone can open one from a script) could create `users/{uid}` profiles and addresses. | The rules require a real shopper account (Google, Apple, or an older number account) to write profiles and addresses. |
| 3 | The owner's e-mail address counted as admin in the rules and in `staff/add-driver.php` even if it was unverified. | Counts only when `email_verified` is true. The owner's account id still works on its own. |
| 4 | `staff/add-driver.php` echoed back any `Origin` as allowed. | Only dashit.co.in, www.dashit.co.in and localhost:3000. Anonymous sessions can no longer register as a rider. |
| 5 | Request bodies were read without a size limit. | 16 KB cap in PHP (`DASHIT_MAX_BODY_BYTES`) and `LimitRequestBody 65536` in `public/api/.htaccess`. |
| 6 | SMS (2Factor) is paid per message. | Existing layers kept and documented: per network address, per account, per number (hour and day), 30 s between codes, 5 wrong guesses per code, and `otp_daily_cap` for the whole shop. Needs a signed-in Google/Apple account, so a script can't mass-order codes. |
| 7 | Old WhatsApp sign-in endpoints and docs. | `send-code.php` / `verify-code.php` answer 410, `_sign-in.php` is empty; `docs/whatsapp-otp-setup.md` deleted. The old WhatsApp token in `dashit-secrets/sign-in.php` should be removed (see below). |

Checked and fine: no private keys, live Razorpay keys or service accounts are in git
(`.env.production` holds only the Firebase web key, which is public by design); the
service account and Razorpay secret live outside `public_html`; payment signatures
are HMAC-checked and compared with `hash_equals`; a payment can back only one order
(`payment.receipt == orderId`); orders can't be created pre-assigned, pre-delivered
or backdated; riders can only touch orders assigned to them; the admin console is only
a sign-in form for anyone without a `staff/{uid}` record.

## You need to do these (in order of importance)

1. **Set a budget alert.** Google Cloud console → Billing → Budgets & alerts →
   Create budget, for example ₹1,000 a month, alerts at 50 %, 90 % and 100 %,
   e-mailed to you. This is the one thing that guarantees you hear about a surprise
   bill within hours. (It can't be set from the command line without billing admin.)
   Also set the Razorpay and 2Factor dashboards' low-balance alerts.
2. **Turn on Firebase App Check** (the App Check API is not even enabled yet).
   Firestore reads of the catalogue are open to everyone so people can browse before
   signing in, and every read is billed. App Check makes Firestore refuse requests
   that don't come from the real apps. Android: Play Integrity; iPhone: App Attest;
   the website: reCAPTCHA v3. Add it in each app, ship the builds, watch the App
   Check metrics for a few days, and only then press **Enforce** for Cloud
   Firestore. Enforcing before the builds are out locks every existing install out.
3. **Restrict the Google API keys.** The API Keys API is disabled on the project, so
   I couldn't read their restrictions. Google Cloud console → APIs & Services →
   Credentials: the browser key to HTTP referrers `https://dashit.co.in/*`; the
   Android key to package `com.dashit.app` plus its SHA-1s; the iOS key to the
   bundle id; the Maps key to the Maps SDK only. A leaked, unrestricted key is
   what runs up Maps and Identity bills.
4. **Put the site behind Cloudflare (free plan)** for real DDoS protection: move
   the dashit.co.in DNS to Cloudflare with the proxy (orange cloud) on, turn on Bot
   Fight Mode, and add one rate-limiting rule for `/api/*` (for example 60 requests
   a minute per address). The PHP rate limits only protect against one address
   hammering an endpoint; a network of addresses is a network-layer problem the
   host and Cloudflare handle.
5. **Disable Anonymous sign-in** (Firebase console → Authentication → Sign-in
   method). It is on, and nothing in the rules needs it any more. Some leftover web
   code (`src/lib/api.js`, `src/lib/auth.js`) and the driver console may still call
   it, so do it after checking a rider can sign in on the driver app.
6. **Hostinger secrets:** delete the old `whatsapp_*` and `review_*` entries from
   `dashit-secrets/sign-in.php` (and rotate that WhatsApp token in Meta if it was
   ever pasted anywhere). Put the 2Factor key there when you have it.
7. **Deploy `firestore.rules`** and upload the new website zip (`api/auth/*`,
   `api/razorpay/*`, `api/staff/*`, `api/_http.php`, `api/_firebase.php`,
   `api/.htaccess`). Install the new app builds first: an older build doesn't send
   the sign-in token, so once the zip is up it can't start an online payment.
8. **Razorpay live keys** go in `dashit-secrets/razorpay.php` when you're ready.

## Open gaps (your decision)

- **Order totals are trusted from the app.** The rules check that an order's totals
  agree with each other, not that they equal the items times the shop's prices. A
  modified app could place an order for ₹1, and for a prepaid order could pay ₹1 for
  it. The packer sees the total on the order, but the real fix is to price orders on
  the server: a PHP endpoint that reads product prices from Firestore and returns
  the amount, with the rules requiring that amount. Worth doing before live money.
- **Orders have no field-size limits** beyond Firestore's 1 MB document cap and the
  100-item cap. Anyone with a Google/Apple account could fill the database with fat
  orders. App Check (2) and the budget alert (1) are the practical answers.
- **No Content-Security-Policy** beyond `frame-ancestors`. The exported pages use
  inline scripts, so a strict policy needs hashes; low risk for a download page.
- **Staff e-mail sign-in has no second factor.** Use a long unique password for the
  admin account.
- **Google sign-in in production** needs the Play App Signing key's SHA-1 added to
  the Firebase Android app once the app is on Google Play (debug and local-build
  keys are already added).

## Update 2026-10-02: products moved off public Firestore reads

- The shop apps read products from `catalog/catalog.json` on the website and
  `api/catalog/changes.php`, not from Firestore. `firestore.rules` now allow
  reading `products` to staff only, so a script with the public Firebase
  settings can no longer read the catalogue over and over at your expense.
- `changes.php` is public but reads Firestore at most about twice a minute in
  total (it shares one cached look for 30 seconds), and is rate limited per
  network address. `build.php` runs only from the command line (cron); the web
  gets 404 and `.htaccess` blocks it.
- The catalogue file is public, as the products already were in the apps.
  Downloading it costs Hostinger bandwidth, not Firebase money.
- App Check is still worth turning on for the remaining public reads
  (categories, offers, store settings: a handful of small documents).
