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
dashit_rate_limit('razorpay-payment-status', 120);
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

// Check all payments made for this Razorpay order, even if the parent
// order status has not synced to "paid" yet (e.g. slow UPI callbacks).
$captured = null;
[$paymentsStatus, $payments] = dashit_razorpay_request('GET', '/v1/orders/' . rawurlencode($orderId) . '/payments', null, $credentials);
if ($paymentsStatus === 200) {
    foreach (($payments['items'] ?? []) as $payment) {
        $pStatus = (string) ($payment['status'] ?? '');
        if ($pStatus === 'captured' || $pStatus === 'authorized') {
            $captured = $payment;
            break;
        }
    }
}

if ($captured === null) {
    dashit_respond(200, ['paid' => false, 'status' => $order['status'] ?? null]);
}

if (($order['status'] ?? '') !== 'paid') {
    $order['status'] = 'paid';
}
if ((int) ($order['amount_paid'] ?? 0) === 0 && !empty($captured['amount'])) {
    $order['amount_paid'] = (int) $captured['amount'];
}

if (!dashit_record_payment($order, (string) ($captured['id'] ?? ''))) {
    dashit_respond(502, ['paid' => false, 'error' => 'Couldn\'t check the payment right now.']);
}

dashit_respond(200, [
    'paid' => true,
    'razorpay_order_id' => $orderId,
    'razorpay_payment_id' => $captured['id'] ?? null,
    'receipt' => $order['receipt'] ?? null,
    'amount' => $order['amount'] ?? null,
    'amount_paid' => $order['amount_paid'] ?? null,
]);
