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

function dashit_respond(int $status, array $data): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** POST only. The apps call these natively; the site origin is allowed too. */
function dashit_only_post(): void
{
    header('Access-Control-Allow-Origin: https://dashit.co.in');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
    if ($method !== 'POST') {
        dashit_respond(405, ['error' => 'Use POST.']);
    }
}

function dashit_json_body(): array
{
    $data = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($data)) {
        dashit_respond(400, ['error' => 'Send a JSON body.']);
    }
    return $data;
}

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
