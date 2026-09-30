<?php
/*
 * The Firebase service account, shared by the sign-in endpoints (which sign
 * custom tokens with it) and the Razorpay endpoints (which record confirmed
 * payments in Firestore with it). The key lives OUTSIDE the website folder:
 *
 *   domains/dashit.co.in/dashit-secrets/firebase-service-account.json
 *     Firebase console > Project settings > Service accounts > Generate new private key.
 *
 * Writes made with it bypass firestore.rules, which is why the rules can trust
 * what is under payments/: no app can write there.
 */

require_once __DIR__ . '/_http.php';

/** The service account key, or null (logged) if it isn't there. */
function dashit_firebase_service_account(): ?array
{
    $path = getenv('FIREBASE_SERVICE_ACCOUNT') ?: dashit_private_dir('dashit-secrets') . '/firebase-service-account.json';
    $account = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;
    if (!is_array($account) || empty($account['client_email']) || empty($account['private_key'])) {
        error_log("DASHit: no usable Firebase service account at $path.");
        return null;
    }
    return $account;
}

function dashit_base64url(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/** A JWT signed (RS256) with the service account's key, or null if it can't sign. */
function dashit_signed_jwt(array $account, array $payload): ?string
{
    $unsigned = dashit_base64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT']))
        . '.' . dashit_base64url(json_encode($payload, JSON_UNESCAPED_SLASHES));
    $key = openssl_pkey_get_private($account['private_key']);
    if ($key === false || !openssl_sign($unsigned, $signature, $key, OPENSSL_ALGO_SHA256)) {
        error_log('DASHit: the Firebase service account key could not sign a token.');
        return null;
    }
    return $unsigned . '.' . dashit_base64url($signature);
}

/**
 * A Google access token for Firestore, kept for its hour in dashit-data so
 * each payment doesn't ask Google for a new one. Null if Google says no.
 */
function dashit_firestore_access_token(array $account): ?string
{
    $cache = dashit_private_dir('dashit-data') . '/firestore-token.json';
    $saved = is_file($cache) ? json_decode((string) file_get_contents($cache), true) : null;
    if (is_array($saved) && ($saved['for'] ?? '') === $account['client_email']
        && (int) ($saved['expires_at'] ?? 0) > time() + 300) {
        return (string) $saved['token'];
    }

    $now = time();
    $tokenUri = $account['token_uri'] ?? 'https://oauth2.googleapis.com/token';
    $assertion = dashit_signed_jwt($account, [
        'iss' => $account['client_email'],
        'scope' => 'https://www.googleapis.com/auth/datastore',
        'aud' => $tokenUri,
        'iat' => $now,
        'exp' => $now + 3600,
    ]);
    if ($assertion === null) {
        return null;
    }
    $curl = curl_init($tokenUri);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $assertion,
        ]),
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20,
    ]);
    $raw = curl_exec($curl);
    curl_close($curl);
    $reply = $raw === false ? null : json_decode($raw, true);
    if (empty($reply['access_token'])) {
        error_log('DASHit: Google did not give a Firestore access token: ' . ($reply['error_description'] ?? $reply['error'] ?? 'no answer'));
        return null;
    }

    $dir = dirname($cache);
    if (is_dir($dir) || @mkdir($dir, 0700, true)) {
        @file_put_contents("$cache.tmp", json_encode([
            'for' => $account['client_email'],
            'token' => $reply['access_token'],
            'expires_at' => $now + (int) ($reply['expires_in'] ?? 3600),
        ]));
        @chmod("$cache.tmp", 0600);
        @rename("$cache.tmp", $cache);
    }
    return (string) $reply['access_token'];
}

/** A PHP value as a Firestore REST value. DateTimeInterface becomes a timestamp. */
function dashit_firestore_value($value): array
{
    if ($value === null) {
        return ['nullValue' => null];
    }
    if (is_bool($value)) {
        return ['booleanValue' => $value];
    }
    if (is_int($value)) {
        return ['integerValue' => (string) $value];
    }
    if (is_float($value)) {
        return ['doubleValue' => $value];
    }
    if ($value instanceof DateTimeInterface) {
        return ['timestampValue' => gmdate('Y-m-d\TH:i:s\Z', $value->getTimestamp())];
    }
    return ['stringValue' => (string) $value];
}

/**
 * Writes (creates or replaces) the document at $path, such as
 * "payments/order_ABC123". Returns false, logged, if Firestore didn't take it.
 */
function dashit_firestore_set(array $account, string $path, array $fields): bool
{
    $project = (string) ($account['project_id'] ?? '');
    // Testing on a computer: the Firestore emulator takes "owner" as an admin.
    $emulator = getenv('FIRESTORE_EMULATOR_HOST');
    $token = $project === '' ? null : ($emulator ? 'owner' : dashit_firestore_access_token($account));
    if ($token === null) {
        error_log("DASHit: couldn't write $path to Firestore (no project id or access token).");
        return false;
    }
    $encoded = [];
    foreach ($fields as $name => $value) {
        $encoded[$name] = dashit_firestore_value($value);
    }
    $url = ($emulator ? "http://$emulator" : 'https://firestore.googleapis.com')
        . '/v1/projects/' . rawurlencode($project)
        . '/databases/(default)/documents/' . implode('/', array_map('rawurlencode', explode('/', $path)));
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => 'PATCH',
        CURLOPT_HTTPHEADER => ["Authorization: Bearer $token", 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['fields' => $encoded]),
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20,
    ]);
    $raw = curl_exec($curl);
    $status = $raw === false ? 0 : (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    if ($status < 200 || $status >= 300) {
        $reply = $raw === false ? null : json_decode($raw, true);
        error_log("DASHit: Firestore refused $path (HTTP $status): " . ($reply['error']['message'] ?? 'no answer'));
        return false;
    }
    return true;
}
