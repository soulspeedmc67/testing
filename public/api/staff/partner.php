<?php
/*
 * Partner shops: the logins other shop owners use to run their own stock on
 * DASHit. Only a verified admin (the owner, or staff/{uid}.role == 'admin')
 * may call this.
 *
 * POST {
 *   "action": "create" | "set-active" | "reset-password",
 *
 *   create:         "name", "ownerName"?, "phone", "email"?, "city"?, "address"?,
 *                   "lat", "lng", "maxDeliveryKm", "commissionPercent"?
 *                   -> { partnerId, uid, email, password }   (the password is shown ONCE)
 *   set-active:     "partnerId", "active": true|false        (also switches the login on/off)
 *   reset-password: "partnerId"                              -> { email, password }
 * }
 *
 * What it creates for a new partner (see firestore.rules, "Partners"):
 *   Firebase Auth user            email + a random password (never stored anywhere else)
 *   partners/{partnerId}          owner-controlled: active, maxDeliveryKm, location, commission
 *   partnerUsers/{uid}            maps the login to his partnerId
 *   partners/{partnerId}/settings/shop   his own shop details
 * A partner is NOT written to staff/, so he is not staff and reaches none of
 * the shop's data. An e-mail that already has an account is refused, never taken over.
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

dashit_rate_limit('partner', 40);

$body = dashit_json_body();

$account = dashit_firebase_service_account();
if ($account === null) {
    dashit_respond(500, ['error' => 'Firebase service account is not configured on this server.']);
}

// Who is calling: a verified Firebase ID token, from the Authorization header or the body.
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
// Anonymous sessions can be opened by anyone from a script; they never act as an admin.
if (($claims['firebase']['sign_in_provider'] ?? '') === 'anonymous') {
    dashit_respond(403, ['error' => 'Please sign in with your own account.']);
}
[$isStaff, $role] = dashit_staff_role($account, $claims);
if (!$isStaff || $role !== 'admin') {
    dashit_respond(403, ['error' => 'Admin privileges required.']);
}

/** A random password the owner can read out: no 0/O/1/l/I lookalikes. */
function dashit_partner_password(int $length = 12): string
{
    $alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    $out = '';
    for ($i = 0; $i < $length; $i++) {
        $out .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    return $out;
}

/** A number from the body, or null if it isn't one. */
function dashit_partner_number($value): ?float
{
    if (is_string($value)) {
        $value = trim($value);
    }
    if ($value === '' || $value === null || !is_numeric($value)) {
        return null;
    }
    return (float) $value;
}

/** Text from the body: no tags, single spaces, cut to $max characters. */
function dashit_partner_text($value, int $max): string
{
    return mb_substr(trim(preg_replace('/\s+/', ' ', strip_tags((string) $value))), 0, $max);
}

/** The partner's doc, or a 404/400 response. */
function dashit_partner_load(array $account, array $body): array
{
    $partnerId = trim((string) ($body['partnerId'] ?? ''));
    if (!preg_match('/^p[0-9a-f]{10}$/', $partnerId)) {
        dashit_respond(400, ['error' => 'A valid partnerId is required.']);
    }
    $partner = dashit_firestore_get($account, "partners/$partnerId");
    if (!is_array($partner)) {
        dashit_respond(404, ['error' => 'No such partner.']);
    }
    return [$partnerId, $partner];
}

$action = (string) ($body['action'] ?? '');

if ($action === 'create') {
    $name = dashit_partner_text($body['name'] ?? '', 80);
    if (mb_strlen($name) < 2) {
        dashit_respond(400, ['error' => 'Please give the shop a name (at least 2 letters).']);
    }
    $ownerName = dashit_partner_text($body['ownerName'] ?? '', 80);

    $phone = preg_replace('/\D/', '', (string) ($body['phone'] ?? ''));
    if (strlen($phone) === 12 && str_starts_with($phone, '91')) {
        $phone = substr($phone, 2);
    }
    if (!preg_match('/^[6-9]\d{9}$/', $phone)) {
        dashit_respond(400, ['error' => 'Please give a valid 10-digit Indian mobile number.']);
    }

    $lat = dashit_partner_number($body['lat'] ?? null);
    $lng = dashit_partner_number($body['lng'] ?? null);
    if ($lat === null || $lng === null || $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
        dashit_respond(400, ['error' => "Please give the shop's location (latitude and longitude)."]);
    }
    $maxKm = dashit_partner_number($body['maxDeliveryKm'] ?? null);
    if ($maxKm === null || $maxKm < 0.5 || $maxKm > 100) {
        dashit_respond(400, ['error' => 'The delivery distance must be between 0.5 and 100 km.']);
    }
    $commission = dashit_partner_number($body['commissionPercent'] ?? 0);
    if ($commission === null || $commission < 0 || $commission > 50) {
        dashit_respond(400, ['error' => 'The commission must be between 0 and 50 percent.']);
    }
    $city = dashit_partner_text($body['city'] ?? '', 60);
    $address = dashit_partner_text($body['address'] ?? '', 200);

    // A login e-mail: the one given, or a made-up one at our own domain.
    $given = strtolower(trim((string) ($body['email'] ?? '')));
    if ($given !== '' && (!filter_var($given, FILTER_VALIDATE_EMAIL) || strlen($given) > 100)) {
        dashit_respond(400, ['error' => 'That e-mail address does not look right.']);
    }

    // The partner id, made so it cannot already exist (the create is refused if it does).
    $partnerId = null;
    $now = new DateTimeImmutable();
    $partnerDoc = [
        'name' => $name,
        'ownerName' => $ownerName,
        'phone' => $phone,
        'city' => $city,
        'address' => $address,
        'lat' => $lat,
        'lng' => $lng,
        'maxDeliveryKm' => $maxKm,
        'commissionPercent' => $commission,
        'active' => true,
        'createdAt' => $now,
        'updatedAt' => $now,
    ];
    for ($try = 0; $try < 4 && $partnerId === null; $try++) {
        $candidate = 'p' . bin2hex(random_bytes(5));
        if (dashit_firestore_create_once($account, "partners/$candidate", $partnerDoc)) {
            $partnerId = $candidate;
        }
    }
    if ($partnerId === null) {
        dashit_respond(500, ['error' => 'Could not create the partner record. Try again.']);
    }

    $email = $given !== '' ? $given : "$partnerId@partners.dashit.co.in";
    $password = dashit_partner_password();

    // An address that already has an account is never taken over: it may be a customer's, or staff.
    [$status, $authReply] = dashit_auth_admin($account, 'accounts', [
        'email' => $email,
        'password' => $password,
        'displayName' => $name,
        'emailVerified' => true,
    ]);
    $uid = ($status === 200 && !empty($authReply['localId'])) ? (string) $authReply['localId'] : null;
    if ($uid === null) {
        dashit_firestore_delete($account, "partners/$partnerId");
        if (($authReply['error']['message'] ?? '') === 'EMAIL_EXISTS') {
            dashit_respond(409, ['error' => 'That e-mail already has an account. Use a different e-mail for the partner.']);
        }
        dashit_respond(400, ['error' => 'Could not create the login: ' . ($authReply['error']['message'] ?? 'unknown error')]);
    }

    $saved = dashit_firestore_set($account, "partnerUsers/$uid", [
        'partnerId' => $partnerId,
        'active' => true,
        'email' => $email,
        'createdAt' => $now,
    ]) && dashit_firestore_merge($account, "partners/$partnerId", ['uid' => $uid, 'loginEmail' => $email])
      && dashit_firestore_set($account, "partners/$partnerId/settings/shop", [
        'displayName' => $name,
        'tagline' => '',
        'phone' => $phone,
        'address' => $address,
        'isOpen' => true,
        'updatedAt' => $now,
    ]);
    if (!$saved) {
        // Leave nothing half-made: the login would reach no data, but it must not linger.
        dashit_auth_admin($account, 'accounts:delete', ['localId' => $uid]);
        dashit_firestore_delete($account, "partnerUsers/$uid");
        dashit_firestore_delete($account, "partners/$partnerId/settings/shop");
        dashit_firestore_delete($account, "partners/$partnerId");
        dashit_respond(500, ['error' => 'Could not save the partner. Nothing was created; try again.']);
    }

    // The password is returned here and nowhere else; it is not stored.
    dashit_respond(200, ['success' => true, 'partnerId' => $partnerId, 'uid' => $uid, 'email' => $email, 'password' => $password]);
}

if ($action === 'set-active') {
    [$partnerId, $partner] = dashit_partner_load($account, $body);
    $active = ($body['active'] ?? null) === true;
    $uid = (string) ($partner['uid'] ?? '');

    // Data first: the rules read partners/{id}.active on every request, so this locks him out at once.
    if (!dashit_firestore_merge($account, "partners/$partnerId", ['active' => $active, 'updatedAt' => new DateTimeImmutable()])) {
        dashit_respond(500, ['error' => 'Could not update the partner.']);
    }
    if ($uid !== '') {
        dashit_firestore_merge($account, "partnerUsers/$uid", ['active' => $active]);
        // And the login itself, so a switched-off partner cannot even sign in.
        dashit_auth_admin($account, 'accounts:update', ['localId' => $uid, 'disableUser' => !$active]);
    }
    dashit_respond(200, ['success' => true, 'partnerId' => $partnerId, 'active' => $active]);
}

if ($action === 'reset-password') {
    [$partnerId, $partner] = dashit_partner_load($account, $body);
    $uid = (string) ($partner['uid'] ?? '');
    if ($uid === '') {
        dashit_respond(409, ['error' => 'This partner has no login yet.']);
    }
    $password = dashit_partner_password();
    [$status] = dashit_auth_admin($account, 'accounts:update', ['localId' => $uid, 'password' => $password]);
    if ($status !== 200) {
        dashit_respond(500, ['error' => 'Could not reset the password.']);
    }
    dashit_respond(200, ['success' => true, 'partnerId' => $partnerId, 'email' => (string) ($partner['loginEmail'] ?? ''), 'password' => $password]);
}

dashit_respond(400, ['error' => 'Unknown action.']);
