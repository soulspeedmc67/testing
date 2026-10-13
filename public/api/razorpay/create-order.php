<?php
/*
 * POST { "amount": <paise>, "receipt": "<DASHit order code>", "id_token": "<Firebase ID token>" }
 *   -> 200 { "order_id", "amount", "currency", "key_id" }
 *   -> 401 when the caller isn't a signed-in shopper
 *   -> 426 when the iPhone app is older than the shop accepts (see below)
 *
 * The apps also send "platform" ("ios", "android", "web") and the iPhone app
 * its "app_version_code" (1.0.3 is 10003).
 *
 * Creates the Razorpay order the app then opens checkout for. The key id is
 * handed back so the apps hold no Razorpay key at all (test and live keys
 * switch here, on the server). Only a signed-in shopper can start a payment,
 * and the order is stamped with who asked (notes.dashit_uid), which the
 * payment record and firestore.rules then check.
 */
require __DIR__ . '/_razorpay.php';

/**
 * The oldest iPhone app version the shop accepts, as a number (0 = any).
 * Read from config/store at most once a minute and kept in dashit-data; if
 * Firestore can't be reached, the last figure read stands.
 */
function dashit_min_ios_version_code(): int
{
    $cache = dashit_private_dir('dashit-data') . '/min-ios-version.json';
    $saved = is_file($cache) ? json_decode((string) file_get_contents($cache), true) : null;
    $last = is_array($saved) ? max(0, (int) ($saved['code'] ?? 0)) : 0;
    if (is_array($saved) && (int) ($saved['at'] ?? 0) > time() - 60) {
        return $last;
    }
    $account = dashit_firebase_service_account();
    $store = $account === null ? null : dashit_firestore_get($account, 'config/store');
    if ($store === null) {
        return $last;
    }
    $code = max(0, (int) ($store['minIosVersionCode'] ?? 0));
    @file_put_contents($cache, json_encode(['code' => $code, 'at' => time()]), LOCK_EX);
    return $code;
}

dashit_only_post();
dashit_rate_limit('razorpay-create-order', 30);
$body = dashit_json_body();
[, $claims] = dashit_require_shopper($body);

$amount = $body['amount'] ?? null;
if (!(is_int($amount) || (is_string($amount) && ctype_digit($amount)))) {
    dashit_respond(400, ['error' => 'The amount must be a whole number of paise.']);
}
$amount = (int) $amount;
if ($amount < 100) {
    dashit_respond(400, ['error' => 'The smallest online payment is ₹1.']);
}
if ($amount > 5000000) {
    dashit_respond(400, ['error' => 'That amount is too large to pay online.']);
}

/*
 * The shop can stop taking orders from old iPhone apps (config/store
 * minIosVersionCode, set in the console's Shop settings): an installed app
 * keeps the fees it was built with, so an old one leaves out a charge added
 * since. firestore.rules refuse such an order, so no payment may be taken for
 * it. iPhone apps from before 1.0.3 send no "platform"; they are known by the
 * iOS networking library's name in the User-Agent, and count as version 0.
 */
$platform = strtolower(trim((string) ($body['platform'] ?? '')));
$fromIphoneApp = $platform === 'ios'
    || ($platform === '' && stripos((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 'CFNetwork') !== false);
if ($fromIphoneApp) {
    $oldestAllowed = dashit_min_ios_version_code();
    $version = $body['app_version_code'] ?? 0;
    $version = is_int($version) || (is_string($version) && ctype_digit($version)) ? (int) $version : 0;
    if ($oldestAllowed > 0 && $version < $oldestAllowed) {
        dashit_respond(426, ['error' => 'This version of DASHit is too old to order. Update it from the App Store, then try again. No money was taken.']);
    }
}

$receipt = trim((string) ($body['receipt'] ?? ''));
if ($receipt === '' || strlen($receipt) > 40 || !preg_match('/^[A-Za-z0-9_-]+$/', $receipt)) {
    dashit_respond(400, ['error' => 'The order code is missing or not valid.']);
}

$credentials = dashit_razorpay_credentials();
[$status, $order] = dashit_razorpay_request('POST', '/v1/orders', [
    'amount' => $amount,
    'currency' => 'INR',
    'receipt' => $receipt,
    'notes' => ['dashit_order' => $receipt, 'dashit_uid' => (string) $claims['sub']],
], $credentials);

if ($status === 401) {
    dashit_respond(401, ['error' => 'Razorpay did not accept the server keys.']);
}
if ($status < 200 || $status >= 300 || empty($order['id'])) {
    dashit_respond(500, ['error' => $order['error']['description'] ?? 'Razorpay could not start the payment. Try again.']);
}

dashit_respond(200, [
    'order_id' => $order['id'],
    'amount' => $order['amount'],
    'currency' => $order['currency'],
    'key_id' => $credentials['key_id'],
]);
