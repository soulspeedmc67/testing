<?php
/*
 * POST { "amount": <paise>, "receipt": "<DASHit order code>" }
 *   -> 200 { "order_id", "amount", "currency", "key_id" }
 *
 * Creates the Razorpay order the app then opens checkout for. The key id is
 * handed back so the apps hold no Razorpay key at all (test and live keys
 * switch here, on the server).
 */
require __DIR__ . '/_razorpay.php';

dashit_only_post();
$body = dashit_json_body();

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

$receipt = trim((string) ($body['receipt'] ?? ''));
if ($receipt === '' || strlen($receipt) > 40 || !preg_match('/^[A-Za-z0-9_-]+$/', $receipt)) {
    dashit_respond(400, ['error' => 'The order code is missing or not valid.']);
}

$credentials = dashit_razorpay_credentials();
[$status, $order] = dashit_razorpay_request('POST', '/v1/orders', [
    'amount' => $amount,
    'currency' => 'INR',
    'receipt' => $receipt,
    'notes' => ['dashit_order' => $receipt],
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
