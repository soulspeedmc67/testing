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
    'twofactor_template' => '',     // optional: the name of your approved SMS template
    'otp_daily_cap' => 400,         // the most codes the shop sends in one day, in all
];
```

3. Check it from your computer (use your own number):

```bash
curl -s -X POST https://dashit.co.in/api/auth/send-otp.php -H 'Content-Type: application/json' -d '{"mobile":"9XXXXXXXXX"}'
```

   `{"configured":true}` with a 401 about signing in means the key is read and
   the endpoint is waiting for a signed-in shopper (normal for a bare curl).
   `{"configured":false}` means the key file isn't being read.

Cost is bounded in code (`public/api/auth/_otp.php`): 20 requests an hour per
network address, 5 codes an hour per account, 5 an hour and 8 a day per number,
a 30-second wait between codes, 5 wrong guesses per code, and `otp_daily_cap`
for the whole shop. If the cap is hit the apps say "busy, try tomorrow" and
the error log records it.

India routes SMS through DLT-registered templates. 2Factor's default OTP
route works without your own template; if you register one, put its name in
`twofactor_template`.

## 4. Firestore rules

```bash
npx firebase-tools@14 deploy --only firestore:rules --project dashit-1ecba
```

## Testing on a computer

PHP 8 with curl and openssl. Environment variables stand in for the secrets:
`FIREBASE_SERVICE_ACCOUNT` (path to the key), `RAZORPAY_KEY_ID`,
`RAZORPAY_KEY_SECRET`, `TWOFACTOR_API_KEY`, `TWOFACTOR_TEMPLATE`,
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
