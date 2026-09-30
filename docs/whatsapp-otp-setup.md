# Sign-in with a WhatsApp code — setup

Customers sign in to the DASHit iPhone and Android apps with their phone
number. The app sends the number to the sign-in server, the server sends a
6-digit code to that number on WhatsApp, and the right code signs the customer
in. The iPhone app also offers Sign in with Apple and the Android app Sign in
with Google (see "Apple and Google" below); both open the same number's
account. There is no email or password sign-in for customers.

## How it works

```
App ──POST /api/auth/send-code.php {mobile}──▶ Hostinger PHP ──▶ WhatsApp Cloud API ──▶ customer's WhatsApp
App ──POST /api/auth/verify-code.php {mobile, code}──▶ Hostinger PHP ──▶ Firebase custom token
App ──signInWithCustomToken(token)──▶ Firebase Auth (account "ph-91XXXXXXXXXX")
```

- The server is `public/api/auth/` on the Hostinger site, next to the Razorpay
  endpoints. It deploys with the website; no extra server is needed.
- One number is one account (`ph-91` + the number) on any phone. The token
  carries the number as the `mobile` claim, and `firestore.rules` only accepts
  that number on the customer's profile and only lets such accounts place
  orders.
- A code works once, for 10 minutes, and stops after 5 wrong tries. The same
  number can ask again after 30 seconds, up to 5 codes an hour and 10 a day.
  Each network address gets 20 codes an hour and 60 code checks an hour (a
  phone's IPv6 addresses count as one network), and the whole shop sends at
  most 500 a day (change `daily_limit` in the secrets file).
- Only a salted hash of each code is stored, in
  `domains/dashit.co.in/dashit-data/sign-in/` (outside the website folder).
- Old sessions from before sign-in codes (confirm-your-number, email, Apple)
  count as signed out, so those customers sign in once more with a code.
  Their old orders stay in Firestore under the old account.

## What you need to set up (once)

### 1. WhatsApp: phone number ID and a permanent token

1. **developers.facebook.com → My Apps → your WhatsApp app → WhatsApp → API
   Setup.** Copy the **Phone number ID** (a long number, not the phone number).
2. **business.facebook.com → Settings → Users → System users → Add**
   (name `dashit-backend`, role Admin). Then **Add assets → Apps →** your app,
   with full control.
3. On that system user, **Generate new token**: pick your app, tick
   `whatsapp_business_messaging` and `whatsapp_business_management`, set
   expiry to **Never**, and copy the token. It is shown once.

The token on the API Setup page expires after 24 hours. Don't use it.

### 2. WhatsApp: the message template

**WhatsApp → Message templates → Create template**:

| Setting  | Value |
|----------|-------|
| Category | **Authentication** |
| Name     | `dashit_auth_otp` |
| Language | English (US), code `en_US` |
| Code delivery | **Copy code** |

Meta writes the text of authentication templates itself ("*123456* is your
verification code"). You can switch on the "don't share this code" line and an
expiry note (set it to 10 minutes). You can't type your own wording, and
sign-in codes must not go out as Utility or Marketing templates.

Submit it. A template can't be sent until Meta approves it, which is usually
within minutes and at most 24 hours. While your app is in **Development** mode,
WhatsApp only delivers to numbers added under API Setup → "To". Switch the app
to **Live** to reach everyone.

### 3. Firebase: the service account key

**Firebase console → Project settings → Service accounts → Generate new private
key.** This downloads a `.json` file. It works on the free Spark plan. The
server uses it only to sign sign-in tokens. Treat it like a password.

### 4. Put the secrets on Hostinger

In **Hostinger → File Manager**, open `domains/dashit.co.in/`. The folder
`dashit-secrets/` sits next to `public_html/` (Razorpay's keys are already
there). Add two files to it:

`dashit-secrets/firebase-service-account.json` — the file from step 3,
renamed.

`dashit-secrets/sign-in.php`:

```php
<?php return [
    'whatsapp_token' => 'EAAG...',              // step 1.3
    'whatsapp_phone_number_id' => '1234...',    // step 1.1
    'whatsapp_template' => 'dashit_auth_otp',
    'whatsapp_language' => 'en_US',
    // App Review only (see step 6). Leave both empty when not in review.
    'review_mobile' => '',
    'review_code' => '',
];
```

Never put these files inside `public_html/`, and never commit them to git.

### 5. Check it works

After the website has deployed (it deploys `public/api/auth/`), send a code to
your own WhatsApp number:

```bash
curl -s -X POST https://dashit.co.in/api/auth/send-code.php -H 'Content-Type: application/json' -d '{"mobile":"9XXXXXXXXX"}'
```

- `{"sent":true,...}`: the code should arrive on WhatsApp within seconds.
- `Signing in isn't set up on the server yet`: a secrets file is missing or
  unreadable. Hostinger's PHP error log names which one.
- `We couldn't send the code on WhatsApp`: WhatsApp refused it. The error log
  has WhatsApp's reason, usually an unapproved template, an expired token or a
  number not in the test list.

Then sign in with the code in the app.

### 6. App Store review

Apple's reviewers can't receive your WhatsApp codes. While a build is in
review, set `review_mobile` to a number you give them (for example
`9000000001`) and `review_code` to a 6-digit code. That number is sent nothing
and signs in with that code. Put both in App Store Connect → App Review
Information → Sign-in information. Clear them after approval, because anyone
who knows them can use that account.

### 7. Tighten the Firestore rules (last)

`firestore.rules` now only lets number-signed-in customers place orders.
Deploy it **after** the new app builds are installed. Older builds sign in
without a code and can't place orders once these rules are live:

```bash
npx firebase-tools deploy --only firestore:rules --project dashit-1ecba
```

(Or paste `firestore.rules` into Firebase console → Firestore → Rules → Publish.)

Keep **Anonymous** sign-in switched on in Firebase Authentication: the driver
console still uses it.

### 8. Apple and Google

The first time someone uses Sign in with Apple (iPhone) or Google (Android),
the app asks for their number and a WhatsApp code once. `verify-code.php`
then moves that Apple ID or Google account onto the number's account
(`ph-91…`) with the Firebase Auth admin API and saves the number on it as a
lasting `mobile` claim, so the rules let it place orders. After that, Apple or
Google signs straight in with no code. A different Google account or Apple ID
confirmed with the same number replaces the old one.

To switch them on:

1. Firebase console → Authentication → Sign-in method: enable **Apple** and
   **Google**.
2. Android: Firebase console → Project settings → the `com.dashit.app` app →
   add the **SHA-1** of every key that signs the app: the Play Console app
   signing key (Play Console → Test and release → App integrity), the upload
   key, and any debug key you test with (`keytool -list -v -keystore
   ~/.android/debug.keystore -storepass android`). Download the new
   `google-services.json` into `android-compose/app/`.
3. iPhone, for deleting accounts (App Store 5.1.1(v)): Apple has to be told
   when an account goes. In the Apple provider's settings in Firebase, fill in
   the **Team ID**, a **Key ID** and its **private key** (Apple Developer →
   Keys → a key with Sign in with Apple enabled). Without them the account is
   still deleted, but its Apple sign-in isn't revoked.

The service account needs no new role: the Firebase Admin SDK account can
already manage users.

## Testing on a computer

The PHP runs anywhere with PHP 8, curl and openssl. Environment variables
replace the secrets files: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_TEMPLATE`, `WHATSAPP_LANGUAGE`, `WHATSAPP_API` (to point at a fake
WhatsApp), `SIGN_IN_REVIEW_MOBILE`, `SIGN_IN_REVIEW_CODE`,
`FIREBASE_SERVICE_ACCOUNT` (path to the key) and `SIGN_IN_DATA_DIR`.

```bash
docker run --rm -p 8099:8099 -v "$PWD/public:/app/public:ro" \
  -e SIGN_IN_REVIEW_MOBILE=9000000001 -e SIGN_IN_REVIEW_CODE=123456 \
  -e FIREBASE_SERVICE_ACCOUNT=/app/key.json -v "$PWD/key.json:/app/key.json:ro" \
  -e SIGN_IN_DATA_DIR=/tmp/sign-in php:8.3-cli php -S 0.0.0.0:8099 -t /app/public
```

An Android test build can use it through `adb reverse tcp:8099 tcp:8099` and:

```bash
./gradlew installDebug -PsignInServer=http://127.0.0.1:8099/api/auth/
```
