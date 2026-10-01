<?php
/*
 * POST {
 *   "action"?: "create" | "toggle-active" | "reset-pin",
 *   "name": "Tariq Ahmad",
 *   "phone": "9876543210",
 *   "pin": "1234",
 *   "photoUrl"?: "https://...",
 *   "uid"?: "<firebase uid>",
 *   "active"?: true|false,
 *   "id_token"?: "<admin Firebase ID token>"
 * }
 *
 * Adds or manages delivery drivers using the project's service account.
 * Only verified admins (staff/{uid}.role == 'admin') may invoke this endpoint.
 *
 * Rider sign-in identity created:
 *   email: <10-digit phone>@riders.dashit.co.in
 *   password: 'DASHit-' + <4-digit PIN> (Firebase needs 6+ characters)
 *
 * The PIN is never saved in Firestore; only Firebase Auth holds it.
 */

require_once __DIR__ . '/../_firebase.php';

// Only the website (and the local dev server) may call this from a browser page.
// The apps are not browsers and don't send an Origin. Never echo the caller's
// Origin back: that would let any site's script use an admin's signed-in session.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = ['https://dashit.co.in', 'https://www.dashit.co.in', 'http://localhost:3000'];
header('Vary: Origin');
header('Access-Control-Allow-Origin: ' . (in_array($origin, $allowedOrigins, true) ? $origin : 'https://dashit.co.in'));
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($method !== 'POST') {
    dashit_respond(405, ['error' => 'Use POST.']);
}

// Rate limiting: 60 admin calls per hour per IP
dashit_rate_limit('add-driver', 60);

$body = dashit_json_body();

// 1. Service account check
$account = dashit_firebase_service_account();
if ($account === null) {
    dashit_respond(500, ['error' => 'Firebase service account is not configured on this server.']);
}

// 2. Extract and verify caller's Firebase ID token
$idToken = null;
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$authHeader && function_exists('getallheaders')) {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
}
if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $m)) {
    $idToken = $m[1];
} elseif (isset($body['id_token']) && is_string($body['id_token'])) {
    $idToken = trim($body['id_token']);
}

if (!$idToken) {
    dashit_respond(401, ['error' => 'Authentication token required.']);
}

$claims = dashit_verify_id_token($account, $idToken);
if ($claims === null || empty($claims['sub'])) {
    dashit_respond(401, ['error' => 'Invalid or expired authentication token.']);
}

$callerUid = (string) $claims['sub'];
$callerEmail = (string) ($claims['email'] ?? '');
// Anonymous sessions can be opened by anyone from a script; they never get a staff record.
if (($claims['firebase']['sign_in_provider'] ?? '') === 'anonymous') {
    dashit_respond(403, ['error' => 'Please sign in with your own account.']);
}

// 3. Verify caller is admin
function dashit_fetch_firestore_doc(array $account, string $path): ?array
{
    $project = (string) ($account['project_id'] ?? '');
    $emulator = getenv('FIRESTORE_EMULATOR_HOST');
    $token = $project === '' ? null : ($emulator ? 'owner' : dashit_google_access_token($account));
    if ($token === null) {
        return null;
    }
    $url = ($emulator ? "http://$emulator" : 'https://firestore.googleapis.com')
        . '/v1/projects/' . rawurlencode($project)
        . '/databases/(default)/documents/' . implode('/', array_map('rawurlencode', explode('/', $path)));
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ["Authorization: Bearer $token"],
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20,
    ]);
    $raw = curl_exec($curl);
    $status = $raw === false ? 0 : (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    if ($status < 200 || $status >= 300) {
        return null;
    }
    return json_decode((string) $raw, true);
}

// Updates only the listed fields (Firestore updateMask), leaving the rest of the document intact.
function dashit_staff_patch(array $account, string $path, array $fields): bool
{
    $project = (string) ($account['project_id'] ?? '');
    $emulator = getenv('FIRESTORE_EMULATOR_HOST');
    $token = $project === '' ? null : ($emulator ? 'owner' : dashit_google_access_token($account));
    if ($token === null) {
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
    return $status >= 200 && $status < 300;
}

// The owner's e-mail only counts once it is verified (same rule as firestore.rules).
$isRootAdmin = (
    $callerUid === 'DOf5enic8SXBZTupGJbxDrNdrOt2' ||
    ($callerEmail === 'm4k3ditz@gmail.com' && ($claims['email_verified'] ?? false) === true)
);

// 4. Handle Actions
$action = (string) ($body['action'] ?? 'create');

// Self-registration for riders signing up via driver app / APK
if ($action === 'self-register') {
    $phone = preg_replace('/\D/', '', (string) ($body['phone'] ?? ''));
    if (strlen($phone) === 12 && str_starts_with($phone, '91')) {
        $phone = substr($phone, 2);
    }
    if (strlen($phone) !== 10) {
        $phone = preg_replace('/\D/', '', $callerEmail);
    }

    $givenName = trim(preg_replace('/\s+/', ' ', strip_tags((string) ($body['name'] ?? ''))));
    $givenName = mb_substr($givenName, 0, 40);
    $hasRealName = mb_strlen($givenName) >= 2 && !preg_match('/^Rider \d{4}$/', $givenName);

    $existingStaff = dashit_fetch_firestore_doc($account, "staff/$callerUid");
    if ($existingStaff !== null) {
        $fields = $existingStaff['fields'] ?? [];
        $isActive = $fields['active']['booleanValue'] ?? true;
        $existingRole = $fields['role']['stringValue'] ?? '';
        if ($existingRole !== '' && $existingRole !== 'driver') {
            // Never touch admin/other staff profiles through self-registration.
            dashit_respond(200, ['success' => true, 'uid' => $callerUid, 'role' => $existingRole, 'active' => $isActive]);
        }

        // Repair a driver doc that has no role, and let the rider set their name once.
        $patch = [];
        if ($existingRole === '') {
            // A rider waits for the owner's approval; never approve here.
            $patch['role'] = 'driver';
            $patch['active'] = false;
            $patch['status'] = 'pending';
            $isActive = false;
        }
        $nameAlreadySet = ($fields['nameSetByRider']['booleanValue'] ?? false) === true;
        if ($hasRealName && !$nameAlreadySet) {
            $patch['name'] = $givenName;
            $patch['displayName'] = $givenName;
            $patch['nameSetByRider'] = true;
        }
        if ($patch !== []) {
            $patch['updatedAt'] = new DateTimeImmutable();
            if (!dashit_staff_patch($account, "staff/$callerUid", $patch)) {
                dashit_respond(500, ['error' => 'Failed to update driver staff document.']);
            }
        }
        dashit_respond(200, [
            'success' => true,
            'uid' => $callerUid,
            'role' => 'driver',
            'active' => $isActive,
            'message' => $patch === [] ? 'Staff profile already exists.' : 'Staff profile updated.'
        ]);
    }

    $riderName = $hasRealName ? $givenName : 'Rider ' . ($phone !== '' ? substr($phone, -4) : substr($callerUid, -4));
    $staffDocData = [
        'role' => 'driver',
        // Waiting for the owner's approval (toggle-active turns them on).
        'active' => false,
        'status' => 'pending',
        'name' => $riderName,
        'displayName' => $riderName,
        'phone' => $phone,
        'email' => $callerEmail ?: "{$phone}@riders.dashit.co.in",
        'vehicle' => 'Scooter',
        'nameSetByRider' => $hasRealName,
        'createdAt' => new DateTimeImmutable(),
        'updatedAt' => new DateTimeImmutable(),
    ];

    $saved = dashit_firestore_set($account, "staff/$callerUid", $staffDocData);
    if (!$saved) {
        dashit_respond(500, ['error' => 'Failed to write driver staff document.']);
    }

    dashit_respond(200, [
        'success' => true,
        'uid' => $callerUid,
        'role' => 'driver',
        'name' => $riderName,
        'phone' => $phone,
        'active' => false,
        'status' => 'pending',
        'message' => 'Driver registered, waiting for approval.'
    ]);
}

if (!$isRootAdmin) {
    $staffDoc = dashit_fetch_firestore_doc($account, "staff/$callerUid");
    $role = $staffDoc['fields']['role']['stringValue'] ?? null;
    $active = $staffDoc['fields']['active']['booleanValue'] ?? true;
    if ($role !== 'admin' || $active === false) {
        dashit_respond(403, ['error' => 'Admin privileges required.']);
    }
}

if ($action === 'create') {
    $name = trim((string) ($body['name'] ?? ''));
    if ($name === '' || strlen($name) > 100) {
        dashit_respond(400, ['error' => 'Please provide a valid driver name.']);
    }

    $rawPhone = preg_replace('/\D/', '', (string) ($body['phone'] ?? ''));
    if (strlen($rawPhone) === 12 && str_starts_with($rawPhone, '91')) {
        $rawPhone = substr($rawPhone, 2);
    }
    if (strlen($rawPhone) !== 10 || !preg_match('/^[6-9]\d{9}$/', $rawPhone)) {
        dashit_respond(400, ['error' => 'Please provide a valid 10-digit Indian mobile number.']);
    }
    $phone = $rawPhone;

    $pin = trim((string) ($body['pin'] ?? ''));
    if (!preg_match('/^\d{4}$/', $pin)) {
        dashit_respond(400, ['error' => 'PIN must be exactly 4 digits.']);
    }

    $photoUrl = trim((string) ($body['photoUrl'] ?? ($body['photo'] ?? '')));

    $email = "{$phone}@riders.dashit.co.in";

    // Create Firebase Auth user
    [$status, $authReply] = dashit_auth_admin($account, 'accounts', [
        'email' => $email,
        'password' => 'DASHit-' . $pin, // keep in sync with RIDER_PASSWORD_PREFIX in src/lib/auth.js
        'displayName' => $name,
        'emailVerified' => true,
    ]);

    $driverUid = null;
    if ($status === 200 && !empty($authReply['localId'])) {
        $driverUid = $authReply['localId'];
    } elseif (($authReply['error']['message'] ?? '') === 'EMAIL_EXISTS') {
        // User exists: lookup UID and update password to the specified PIN
        [$lookupStatus, $lookupReply] = dashit_auth_admin($account, 'accounts:lookup', [
            'email' => [$email],
        ]);
        if ($lookupStatus === 200 && !empty($lookupReply['users'][0]['localId'])) {
            $driverUid = $lookupReply['users'][0]['localId'];
            dashit_auth_admin($account, 'accounts:update', [
                'localId' => $driverUid,
                'password' => 'DASHit-' . $pin, // keep in sync with RIDER_PASSWORD_PREFIX in src/lib/auth.js
                'displayName' => $name,
                'disableUser' => false,
            ]);
        } else {
            dashit_respond(400, ['error' => 'A user with this mobile already exists and could not be updated.']);
        }
    } else {
        $msg = $authReply['error']['message'] ?? 'Could not create Firebase Auth account.';
        dashit_respond(400, ['error' => "Auth creation failed: $msg"]);
    }

    // Write to Firestore staff collection
    $staffDocData = [
        'role' => 'driver',
        'active' => true,
        'name' => $name,
        'displayName' => $name,
        'phone' => $phone,
        'email' => $email,
        'vehicle' => 'Scooter',
        'updatedAt' => new DateTimeImmutable(),
        'createdAt' => new DateTimeImmutable(),
    ];
    if ($photoUrl !== '') {
        $staffDocData['photo'] = $photoUrl;
        $staffDocData['photoUrl'] = $photoUrl;
    }

    $saved = dashit_firestore_set($account, "staff/$driverUid", $staffDocData);
    if (!$saved) {
        dashit_respond(500, ['error' => 'Account created but failed writing staff document in Firestore.']);
    }

    dashit_respond(200, [
        'success' => true,
        'uid' => $driverUid,
        'name' => $name,
        'phone' => $phone,
        'email' => $email,
    ]);
}

if ($action === 'toggle-active') {
    $driverUid = trim((string) ($body['uid'] ?? ''));
    if ($driverUid === '') {
        dashit_respond(400, ['error' => 'Driver UID is required.']);
    }
    $active = isset($body['active']) ? (bool) $body['active'] : false;

    // Update Firestore staff document
    $saved = dashit_staff_patch($account, "staff/$driverUid", [
        'active' => $active,
        'status' => $active ? 'approved' : 'off',
        'updatedAt' => new DateTimeImmutable(),
    ]);
    if (!$saved) {
        dashit_respond(500, ['error' => 'Failed updating driver status in Firestore.']);
    }

    // Update Firebase Auth disable status
    dashit_auth_admin($account, 'accounts:update', [
        'localId' => $driverUid,
        'disableUser' => !$active,
    ]);

    dashit_respond(200, [
        'success' => true,
        'uid' => $driverUid,
        'active' => $active,
    ]);
}

if ($action === 'reset-pin') {
    $driverUid = trim((string) ($body['uid'] ?? ''));
    if ($driverUid === '') {
        dashit_respond(400, ['error' => 'Driver UID is required.']);
    }
    $pin = trim((string) ($body['pin'] ?? ''));
    if (!preg_match('/^\d{4}$/', $pin)) {
        dashit_respond(400, ['error' => 'New PIN must be exactly 4 digits.']);
    }

    [$status, $reply] = dashit_auth_admin($account, 'accounts:update', [
        'localId' => $driverUid,
        'password' => 'DASHit-' . $pin, // keep in sync with RIDER_PASSWORD_PREFIX in src/lib/auth.js
    ]);

    if ($status < 200 || $status >= 300) {
        $msg = $reply['error']['message'] ?? 'Could not update PIN in Firebase Auth.';
        dashit_respond(400, ['error' => $msg]);
    }

    dashit_respond(200, [
        'success' => true,
        'uid' => $driverUid,
    ]);
}

dashit_respond(400, ['error' => "Unknown action: '$action'."]);
