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
 * A Google access token for Firestore and the Firebase Auth admin API, kept
 * for its hour in dashit-data so each request doesn't ask Google for a new
 * one. Null if Google says no.
 */
function dashit_google_access_token(array $account): ?string
{
    $scope = 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit';
    $cache = dashit_private_dir('dashit-data') . '/google-token.json';
    $saved = is_file($cache) ? json_decode((string) file_get_contents($cache), true) : null;
    if (is_array($saved) && ($saved['for'] ?? '') === $account['client_email'] && ($saved['scope'] ?? '') === $scope
        && (int) ($saved['expires_at'] ?? 0) > time() + 300) {
        return (string) $saved['token'];
    }

    $now = time();
    $tokenUri = $account['token_uri'] ?? 'https://oauth2.googleapis.com/token';
    $assertion = dashit_signed_jwt($account, [
        'iss' => $account['client_email'],
        'scope' => $scope,
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
        error_log('DASHit: Google did not give an access token: ' . ($reply['error_description'] ?? $reply['error'] ?? 'no answer'));
        return null;
    }

    $dir = dirname($cache);
    if (is_dir($dir) || @mkdir($dir, 0700, true)) {
        @file_put_contents("$cache.tmp", json_encode([
            'for' => $account['client_email'],
            'scope' => $scope,
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
    $token = $project === '' ? null : ($emulator ? 'owner' : dashit_google_access_token($account));
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

/**
 * Changes only the named fields of the document at $path (creating it if
 * missing), leaving the rest alone. Returns false, logged, if Firestore didn't take it.
 */
function dashit_firestore_merge(array $account, string $path, array $fields): bool
{
    $project = (string) ($account['project_id'] ?? '');
    $emulator = getenv('FIRESTORE_EMULATOR_HOST');
    $token = $project === '' ? null : ($emulator ? 'owner' : dashit_google_access_token($account));
    if ($token === null) {
        error_log("DASHit: couldn't write $path to Firestore (no project id or access token).");
        return false;
    }
    $encoded = [];
    $mask = [];
    foreach ($fields as $name => $value) {
        $encoded[$name] = dashit_firestore_value($value);
        $mask[] = 'updateMask.fieldPaths=' . rawurlencode($name);
    }
    $url = ($emulator ? "http://$emulator" : 'https://firestore.googleapis.com')
        . '/v1/projects/' . rawurlencode($project)
        . '/databases/(default)/documents/' . implode('/', array_map('rawurlencode', explode('/', $path)))
        . '?' . implode('&', $mask);
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

/**
 * Calls the Firebase Auth admin API (Identity Toolkit) for this project, as
 * the Admin SDK would: $method is "accounts:lookup", "accounts:update",
 * "accounts:delete" or "accounts" (create). Returns [HTTP status, reply];
 * status 0 means no answer or no access token.
 */
function dashit_auth_admin(array $account, string $method, array $body): array
{
    $project = (string) ($account['project_id'] ?? '');
    // Testing on a computer: the Auth emulator takes "owner" as an admin.
    $emulator = getenv('FIREBASE_AUTH_EMULATOR_HOST');
    $token = $project === '' ? null : ($emulator ? 'owner' : dashit_google_access_token($account));
    if ($token === null) {
        return [0, []];
    }
    $base = $emulator ? "http://$emulator/identitytoolkit.googleapis.com" : 'https://identitytoolkit.googleapis.com';
    $curl = curl_init("$base/v1/projects/" . rawurlencode($project) . "/$method");
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ["Authorization: Bearer $token", 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($body ?: new stdClass()),
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20,
    ]);
    $raw = curl_exec($curl);
    $status = $raw === false ? 0 : (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    $reply = $raw === false ? null : json_decode($raw, true);
    if ($status < 200 || $status >= 300) {
        error_log("DASHit: Firebase Auth refused $method (HTTP $status): " . ($reply['error']['message'] ?? 'no answer'));
    }
    return [$status, is_array($reply) ? $reply : []];
}

function dashit_base64url_decode(string $data): string
{
    return (string) base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
}

/**
 * Google's current certificates for Firebase ID tokens, by key id, kept as
 * long as Google says they may be. $refresh fetches them again.
 */
function dashit_securetoken_certs(bool $refresh = false): array
{
    $cache = dashit_private_dir('dashit-data') . '/securetoken-certs.json';
    $saved = is_file($cache) ? json_decode((string) file_get_contents($cache), true) : null;
    if (!$refresh && is_array($saved) && (int) ($saved['expires_at'] ?? 0) > time() && is_array($saved['certs'] ?? null)) {
        return $saved['certs'];
    }
    $curl = curl_init('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
    $maxAge = 3600;
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HEADERFUNCTION => function ($curl, $line) use (&$maxAge) {
            if (preg_match('/^cache-control:.*max-age=(\d+)/i', $line, $match)) {
                $maxAge = (int) $match[1];
            }
            return strlen($line);
        },
    ]);
    $raw = curl_exec($curl);
    $status = $raw === false ? 0 : (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    $certs = $status === 200 ? json_decode((string) $raw, true) : null;
    if (!is_array($certs) || !$certs) {
        error_log('DASHit: could not fetch the Firebase ID token certificates.');
        return is_array($saved['certs'] ?? null) ? $saved['certs'] : [];
    }
    $dir = dirname($cache);
    if (is_dir($dir) || @mkdir($dir, 0700, true)) {
        @file_put_contents("$cache.tmp", json_encode(['certs' => $certs, 'expires_at' => time() + $maxAge]));
        @rename("$cache.tmp", $cache);
    }
    return $certs;
}

/**
 * The signed-in shopper asking: [service account, verified token claims]. A
 * request with no token, a bad one, or one from an anonymous session (anyone
 * can open one from a script) is answered 401 and stops here. Endpoints that
 * cost money when abused (starting a payment, sending an SMS) call this first,
 * so abusing them needs a real Google or Apple account, not just a network
 * address.
 */
function dashit_require_shopper(array $body): array
{
    $account = dashit_firebase_service_account();
    if ($account === null) {
        dashit_respond(503, ['error' => 'The server is not set up for this yet. Please try again later.']);
    }
    $token = is_string($body['id_token'] ?? null) ? $body['id_token'] : '';
    $claims = $token === '' ? null : dashit_verify_id_token($account, $token);
    $provider = is_array($claims) ? (string) ($claims['firebase']['sign_in_provider'] ?? '') : '';
    if ($claims === null || $provider === '' || $provider === 'anonymous') {
        dashit_respond(401, ['error' => 'Please sign in to pay online.']);
    }
    return [$account, $claims];
}

/**
 * The claims of a Firebase ID token from this project, if it is genuine and
 * current; null otherwise. The same checks the Admin SDK's verifyIdToken
 * makes: signed by Google (RS256, a current key), for this project, issued
 * by it, not expired, with a user id.
 */
function dashit_verify_id_token(array $account, string $jwt): ?array
{
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) {
        return null;
    }
    [$encodedHeader, $encodedClaims, $encodedSignature] = $parts;
    $header = json_decode(dashit_base64url_decode($encodedHeader), true);
    $claims = json_decode(dashit_base64url_decode($encodedClaims), true);
    $project = (string) ($account['project_id'] ?? '');
    $now = time();
    if (!is_array($header) || !is_array($claims) || $project === ''
        || ($claims['aud'] ?? null) !== $project
        || ($claims['iss'] ?? null) !== "https://securetoken.google.com/$project"
        || (int) ($claims['exp'] ?? 0) <= $now
        || (int) ($claims['iat'] ?? PHP_INT_MAX) > $now + 300
        || !is_string($claims['sub'] ?? null) || $claims['sub'] === '' || strlen($claims['sub']) > 128) {
        return null;
    }
    // The Auth emulator's tokens aren't signed; only ever set on a computer.
    if (getenv('FIREBASE_AUTH_EMULATOR_HOST')) {
        return $claims;
    }
    $kid = (string) ($header['kid'] ?? '');
    if (($header['alg'] ?? '') !== 'RS256' || $kid === '') {
        return null;
    }
    $certs = dashit_securetoken_certs();
    if (!isset($certs[$kid])) {
        $certs = dashit_securetoken_certs(true);
    }
    $key = isset($certs[$kid]) ? openssl_pkey_get_public($certs[$kid]) : false;
    if ($key === false) {
        return null;
    }
    $valid = openssl_verify(
        "$encodedHeader.$encodedClaims",
        dashit_base64url_decode($encodedSignature),
        $key,
        OPENSSL_ALGO_SHA256
    );
    return $valid === 1 ? $claims : null;
}
