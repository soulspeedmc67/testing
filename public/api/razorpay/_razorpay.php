<?php
/*
 * Shared helpers for DASHit's Razorpay endpoints (create-order.php,
 * verify-payment.php), which run on the Hostinger site next to the static
 * website. The apps never hold the key secret: they ask these endpoints to
 * create a Razorpay order and to check the payment signature afterwards.
 *
 * Keys come from environment variables (for local testing) or from a file
 * OUTSIDE the website folder on Hostinger, so they are never downloadable:
 *
 *   domains/dashit.co.in/dashit-secrets/razorpay.php   (next to public_html)
 *
 *   <?php return ['key_id' => 'rzp_test_...', 'key_secret' => '...'];
 */

require_once __DIR__ . '/../_firebase.php';

function dashit_razorpay_credentials(): array
{
    $keyId = getenv('RAZORPAY_KEY_ID') ?: '';
    $secret = getenv('RAZORPAY_KEY_SECRET') ?: '';
    if ($keyId === '' || $secret === '') {
        $root = rtrim($_SERVER['DOCUMENT_ROOT'] ?? __DIR__, '/');
        $file = dirname($root) . '/dashit-secrets/razorpay.php';
        if (is_file($file)) {
            $config = include $file;
            $keyId = is_array($config) ? (string) ($config['key_id'] ?? '') : '';
            $secret = is_array($config) ? (string) ($config['key_secret'] ?? '') : '';
        }
    }
    if ($keyId === '' || $secret === '') {
        dashit_respond(500, ['error' => 'Online payments are not set up on the server yet.']);
    }
    return ['key_id' => $keyId, 'key_secret' => $secret];
}

/** Calls the Razorpay API; returns [HTTP status, decoded body]. Status 0 = no answer. */
function dashit_razorpay_request(string $method, string $path, ?array $body, array $credentials): array
{
    $curl = curl_init('https://api.razorpay.com' . $path);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_USERPWD => $credentials['key_id'] . ':' . $credentials['key_secret'],
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20,
    ]);
    if ($body !== null) {
        curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($body));
    }
    $raw = curl_exec($curl);
    $status = $raw === false ? 0 : (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    $decoded = $raw === false ? null : json_decode($raw, true);
    return [$status, is_array($decoded) ? $decoded : []];
}

/**
 * Records a payment Razorpay has confirmed at payments/{razorpay order id} in
 * Firestore, with the service account. firestore.rules only accept an order
 * marked "Paid online" when this record exists for that order and covers its
 * total, and no app can write here, so the word "online" on an order can't be
 * typed in by hand. $order is Razorpay's order; its receipt is the DASHit
 * order code the app sent to create-order.php.
 */
function dashit_record_payment(array $order, string $paymentId): bool
{
    $orderId = (string) ($order['id'] ?? '');
    if (!preg_match('/^order_[A-Za-z0-9]{6,40}$/', $orderId)) {
        return false;
    }
    $account = dashit_firebase_service_account();
    if ($account === null) {
        // Not set up yet (docs/whatsapp-otp-setup.md). Don't hold up a payment
        // that went through: until firestore.rules ask for this record the
        // order goes in as before, and once they do it is refused either way.
        error_log("DASHit payments: no service account, so $orderId wasn't recorded in Firestore.");
        return true;
    }
    return dashit_firestore_set($account, "payments/$orderId", [
        'razorpayOrderId' => $orderId,
        'razorpayPaymentId' => $paymentId,
        'receipt' => (string) ($order['receipt'] ?? ''),
        'amount' => (int) ($order['amount'] ?? 0),
        'amountPaid' => (int) ($order['amount_paid'] ?? 0),
        'status' => (string) ($order['status'] ?? ''),
        'verifiedAt' => new DateTimeImmutable(),
    ]);
}
