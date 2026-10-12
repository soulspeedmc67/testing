# Server setup (Hostinger PHP endpoints)

The small PHP server in `public/api/` deploys with the website. It does four
jobs: starts and checks Razorpay payments (`razorpay/`), texts and checks the
code that confirms a shopper's mobile number (`auth/`), and lets the owner
approve and manage riders (`staff/`). Secrets live **outside** the website
folder, so they can never be downloaded:

```
domains/dashit.co.in/
├── public_html/                 the website (deploys here)
├── dashit-secrets/              you create these by hand, once
│   ├── firebase-service-account.json
│   ├── razorpay.php
│   └── sign-in.php
└── dashit-data/                 the server creates this (rate-limit and OTP counters)
```

Never put these files in `public_html/`, and never commit them to git.

## 1. Firebase service account

Firebase console → Project settings → Service accounts → **Generate new
private key**. Rename the download to `firebase-service-account.json` and put
it in `dashit-secrets/`. The server uses it to confirm who is asking (checking
Firebase ID tokens), to record confirmed payments and verified numbers in
Firestore, and to manage rider accounts.

## 2. Razorpay

`dashit-secrets/razorpay.php`:

```php
<?php return ['key_id' => 'rzp_live_...', 'key_secret' => '...'];
```

It is in **test** mode (`rzp_test_…`) until you put live keys here. The apps
hold no Razorpay key: they ask `create-order.php`, which hands back the key id,
so switching test to live is a change on the server alone. Only a signed-in
shopper can start a payment (`create-order.php` checks their Firebase ID token).

## 3. Confirming a shopper's number with 2Factor

Shoppers sign in with Google (Android) or Apple (iPhone), then give the number
the rider can call. When 2Factor is set up, a 6-digit code is texted to that
number first. **Until a key is in `sign-in.php`, the apps simply save the number
without a code.** Nothing needs an app update to switch it on.

1. Sign up at **2factor.in**, add credit, and copy the **API key** from the
   dashboard.
2. Add `dashit-secrets/sign-in.php`:

```php
<?php return [
    'twofactor_api_key' => 'PASTE-THE-KEY',
    'twofactor_template' => 'NAME', // the name of your approved SMS OTP template (required)
    'otp_daily_cap' => 400,         // the most codes the shop sends in one day, in all
    'send_codes' => true,           // codes are sent only with this line
];
```

3. Check it from your computer (use your own number):

```bash
curl -s -X POST https://dashit.co.in/api/auth/send-otp.php -H 'Content-Type: application/json' -d '{"mobile":"9XXXXXXXXX"}'
```

   `{"error":"Please sign in with Google or Apple first."}` (a 401) means the
   key is read and the endpoint is waiting for a signed-in shopper (normal for
   a bare curl; no text is sent). `{"configured":false}` means the key file
   isn't being read.

Cost is bounded in code (`public/api/auth/_otp.php`): 20 requests an hour per
network address, 5 codes an hour per account, 5 an hour and 8 a day per number,
a 30-second wait between codes, 5 wrong guesses per code, and `otp_daily_cap`
for the whole shop. If the cap is hit the apps say "busy, try tomorrow" and
the error log records it.

**Signing in with the number alone.** With the key in place, shoppers can
also sign in with just their mobile number (no Google or Apple account):
`number-code.php` texts the code and `number-sign-in.php` checks it and hands
the app a sign-in token for the number's account (`ph-91XXXXXXXXXX`, one
account per number on every phone). Nobody is signed in when the code is asked
for, so these are limited harder per network address (6 codes an hour, 15 a
day) on top of the limits per number and `otp_daily_cap`. Without a key,
`number-code.php` answers `{"configured":false}` and the apps say number
sign-in isn't available.

**Codes are off unless `'send_codes' => true` is in `sign-in.php`.** On 12 Oct
2026 every code arrived as a phone call, with no template, with the shop's own
"Dashit" template and with `OTP1`. Until 2Factor confirms it will text, leave
that line out: the server answers `{"configured":false}`, nothing is sent, and
the apps save the number without a code. "Continue with mobile number" is
hidden in the website and both apps by one switch each (`NUMBER_SIGN_IN` in
`shopperAuth.js`, `AuthRepository.NUMBER_SIGN_IN`, `AuthService.numberSignIn`).

**A template name is required.** With no SMS template on the account, 2Factor
delivers the code as a phone call, not a text (seen on 12 Oct 2026). The shop
wants texts only, so while `twofactor_template` is empty the server answers
`{"configured":false}`: nothing is sent, nobody is called, and the apps save the
number without a code. Put the name of an approved SMS OTP template from the
2Factor dashboard in `twofactor_template` to switch texts on.

## 4. Firestore rules

```bash
npx firebase-tools@14 deploy --only firestore:rules --project dashit-1ecba
```

## Testing on a computer

PHP 8 with curl and openssl. Environment variables stand in for the secrets:
`FIREBASE_SERVICE_ACCOUNT` (path to the key), `RAZORPAY_KEY_ID`,
`RAZORPAY_KEY_SECRET`, `TWOFACTOR_API_KEY`, `TWOFACTOR_TEMPLATE`, `TWOFACTOR_API`
(a stand-in for 2Factor's address),
`OTP_DATA_DIR`, `RATE_LIMIT_DIR`, and `FIREBASE_AUTH_EMULATOR_HOST` (accepts the
Auth emulator's unsigned tokens; never set this on the server).

```bash
docker run --rm -p 8099:8099 -v "$PWD/public:/app/public:ro" \
  -e FIREBASE_SERVICE_ACCOUNT=/app/key.json -v "$PWD/key.json:/app/key.json:ro" \
  -e OTP_DATA_DIR=/tmp/otp -e RATE_LIMIT_DIR=/tmp/rate \
  php:8.3-cli php -S 0.0.0.0:8099 -t /app/public
```

## 5. Push notifications (orders)

`public/api/push/` sends order notifications through Firebase Cloud Messaging
(free). The apps hand their push token to `register.php`; after an order
changes, whoever changed it calls `notify.php`, which reads the order and sends
the matching message once per status. Tokens live in `pushTokens/`, sent marks
in `pushSent/`; `firestore.rules` give apps no access to either.

Android needs nothing more. iPhone needs Apple's push key, once:

1. developer.apple.com → Certificates, Identifiers & Profiles → **Keys** → `+`,
   tick **Apple Push Notifications service (APNs)**, download the `.p8` file
   (only downloadable once) and note its **Key ID**. Your Team ID is
   `8V873ZU49N`.
2. Firebase console → Project settings → **Cloud Messaging** → under each iOS
   app (`com.dashit.app` and `com.dashit.admin`) → APNs Authentication Key →
   Upload: the `.p8`, the Key ID and the Team ID.
3. developer.apple.com → **Identifiers** → `com.dashit.app` → tick **Push
   Notifications** → Save. Then **Profiles** → the App Store profile for
   `com.dashit.app` → Edit → Save (regenerates it) → Download. Put it in the
   GitHub secret `IOS_PROVISION_PROFILE_BASE64` on soulspeedmc67/testing
   (`base64 -i profile.mobileprovision | pbcopy`). The admin app's profile
   already includes push.

**Notify customers.** `push/broadcast.php` sends one message to every shop
app (Android and iPhone) through the FCM topic `customers`, which the apps join
themselves and `register.php` also signs each phone up to. One FCM call however
many customers, no Firestore reads. Admins only, at most 10 in any 24 hours;
the last 20 are kept in `dashit-data/broadcasts.json`. Android shows them in an
"Offers & news" channel, separate from order updates.

**Lock-screen order card (iPhone), cron every minute.** The card's scooter
moves from the shop to the door with the clock, and a card only redraws when it
gets an update, so `push/tick.php` sends each open card a quiet update once a
minute. It reads `dashit-data/live-activities.json` (kept by `notify.php` and
`activity.php`), so it makes no Firestore reads; FCM is free. Set it up like
the catalogue cron below: hPanel → Cron Jobs → Type **PHP** → command
`domains/dashit.co.in/public_html/api/push/tick.php` → schedule **Every
minute** (`* * * * *`) → Save. Without it the card still works, but the scooter
only moves when the order changes stage. The web gets 404 for `tick.php`.

## 6. Product list file (catalogue) and its cron job

The shop apps no longer read products from Firestore. They download one file,
`https://dashit.co.in/catalog/catalog.json` (about 1.1 MB, ~200 KB compressed),
and ask `https://dashit.co.in/api/catalog/changes.php?since=…` every 30 seconds
for anything edited since. `public/api/catalog/build.php` keeps the file up to
date; Hostinger runs it every 5 minutes. Each run costs one Firestore read when
nothing changed, reads only the changed products when something did, and reads
everything once a day.

**Set up the cron job (once):**

1. Upload the website zip as usual (it has `api/catalog/` and `catalog/.htaccess`).
2. hPanel → **Websites** → dashit.co.in → **Advanced** → **Cron Jobs**.
3. Type: **PHP**.
4. Command to run: `domains/dashit.co.in/public_html/api/catalog/build.php`
   (if hPanel asks for a full path, it is `/home/<your user>/domains/dashit.co.in/public_html/api/catalog/build.php`;
   the user name is shown at the top of the File Manager).
5. Schedule: **Every 5 minutes** (common settings), i.e. `*/5 * * * *`.
6. **Save**. Then, on the same page, open the job's **View output** after five
   minutes: the first run says `Full read: … products` and `Wrote catalog.json`;
   later runs say `Up to date` or `N changed products merged`.
7. Check `https://dashit.co.in/catalog/catalog-status.json` in a browser: it
   shows when the file was last built (`builtAt`, milliseconds) and how many
   products it has.

**Install the new apps before deploying the new `firestore.rules`.** The rules
now keep products to staff; older shop apps still read products from Firestore
and would only show the copy already on the phone.

**If the cron stops**, the apps keep working (they still get every change from
`changes.php`), but each request reads every product edited since the file was
built. Turn on hPanel's cron failure e-mail if it offers one, and glance at
`catalog-status.json` now and then.

**After a big CSV import** you can rebuild at once instead of waiting: in
**Cron Jobs**, add the same command with `--full` at the end and run it once
(then delete that job), or just wait up to 5 minutes.
