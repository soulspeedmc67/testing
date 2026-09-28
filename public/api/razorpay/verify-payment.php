<?php
/*
 * POST { "razorpay_order_id", "razorpay_payment_id", "razorpay_signature" }
 *   -> 200 { "verified": true, "amount", "amount_paid", "receipt", "status" }
 *   -> 400 when a field is missing or the signature doesn't match (not paid)
 *
 * The signature is HMAC-SHA256(order_id + "|" + payment_id, key secret);
 * only a match means Razorpay really took this payment for this order. The
 * order's own figures are then read back from Razorpay, so the app records
 * what was actually paid rather than what it expected.
 */
require __DIR__ . '/_razorpay.php';

dashit_only_post();
$body = dashit_json_body();

$orderId = trim((string) ($body['razorpay_order_id'] ?? ''));
$paymentId = trim((string) ($body['razorpay_payment_id'] ?? ''));
$signature = trim((string) ($body['razorpay_signature'] ?? ''));
if ($orderId === '' || $paymentId === '' || $signature === '') {
    dashit_respond(400, ['verified' => false, 'error' => 'Payment details are missing.']);
}

$credentials = dashit_razorpay_credentials();
$expected = hash_hmac('sha256', $orderId . '|' . $paymentId, $credentials['key_secret']);
if (!hash_equals($expected, $signature)) {
    dashit_respond(400, ['verified' => false, 'error' => 'This payment could not be confirmed.']);
}

[$status, $order] = dashit_razorpay_request('GET', '/v1/orders/' . rawurlencode($orderId), null, $credentials);

dashit_respond(200, [
    'verified' => true,
    'razorpay_order_id' => $orderId,
    'razorpay_payment_id' => $paymentId,
    'receipt' => $order['receipt'] ?? null,
    'amount' => $order['amount'] ?? null,
    'amount_paid' => $order['amount_paid'] ?? null,
    'status' => $order['status'] ?? null,
]);
