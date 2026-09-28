<?php
/*
 * POST { "razorpay_order_id" }
 *   -> 200 { "paid": true, "razorpay_order_id", "razorpay_payment_id", "receipt", "amount", "amount_paid" }
 *   -> 200 { "paid": false, "status" } when Razorpay has no captured payment for it
 *   -> 400 when the id is missing or malformed
 *
 * Asked by the apps whenever the payment screen ends without a clear
 * success: the shopper backed out of the UPI app after paying, the phone
 * dropped the result, or the app was closed in between. Razorpay itself is
 * asked (with the key secret), so a "paid" answer is as good as a checked
 * signature, and a paid order is never left unplaced.
 */
require __DIR__ . '/_razorpay.php';

dashit_only_post();
$body = dashit_json_body();

$orderId = trim((string) ($body['razorpay_order_id'] ?? ''));
if (!preg_match('/^order_[A-Za-z0-9]{6,40}$/', $orderId)) {
    dashit_respond(400, ['paid' => false, 'error' => 'Payment details are missing.']);
}

$credentials = dashit_razorpay_credentials();
[$status, $order] = dashit_razorpay_request('GET', '/v1/orders/' . rawurlencode($orderId), null, $credentials);
if ($status !== 200) {
    dashit_respond($status === 404 ? 400 : 502, ['paid' => false, 'error' => 'Couldn\'t check the payment right now.']);
}

// The order says "paid" once a payment on it is captured; find which one.
$captured = null;
if (($order['status'] ?? '') === 'paid' || (int) ($order['amount_paid'] ?? 0) > 0) {
    [$paymentsStatus, $payments] = dashit_razorpay_request('GET', '/v1/orders/' . rawurlencode($orderId) . '/payments', null, $credentials);
    if ($paymentsStatus === 200) {
        foreach (($payments['items'] ?? []) as $payment) {
            if (($payment['status'] ?? '') === 'captured') {
                $captured = $payment;
                break;
            }
        }
    }
}

if ($captured === null) {
    dashit_respond(200, ['paid' => false, 'status' => $order['status'] ?? null]);
}

dashit_respond(200, [
    'paid' => true,
    'razorpay_order_id' => $orderId,
    'razorpay_payment_id' => $captured['id'] ?? null,
    'receipt' => $order['receipt'] ?? null,
    'amount' => $order['amount'] ?? null,
    'amount_paid' => $order['amount_paid'] ?? null,
]);
