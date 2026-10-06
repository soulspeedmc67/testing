<?php
/*
 * POST /api/staff/upload-photo.php
 *   Authorization: Bearer <admin Firebase ID token>
 *   Body: the photo itself (JPEG, PNG or WebP), at most 2 MB.
 *
 * Saves a product photo the shop took itself to public_html/products/uploads/
 * and answers { "url": "https://dashit.co.in/products/uploads/<name>.jpg" },
 * which the admin app puts in the item's photo link. Product photos are
 * hosted on this website, never in Firebase Storage.
 *
 * Only an admin (the owner, or an active staff/{uid} with role "admin") may
 * call it, at most 120 photos an hour from one address. The file name is made
 * here and the extension comes from what the file really is, so nothing but
 * an image can be put on the site.
 */

require_once __DIR__ . '/../_firebase.php';

const DASHIT_MAX_PHOTO_BYTES = 2 * 1024 * 1024;

header('Access-Control-Allow-Origin: https://dashit.co.in');
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

dashit_rate_limit('upload-photo', 120);

$account = dashit_firebase_service_account();
if ($account === null) {
    dashit_respond(500, ['error' => 'Firebase service account is not configured on this server.']);
}

$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$authHeader && function_exists('getallheaders')) {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
}
if (!preg_match('/Bearer\s+(\S+)/i', $authHeader, $m)) {
    dashit_respond(401, ['error' => 'Please sign in again.']);
}
$claims = dashit_verify_id_token($account, $m[1]);
if ($claims === null || empty($claims['sub'])) {
    dashit_respond(401, ['error' => 'Please sign in again.']);
}
if (($claims['firebase']['sign_in_provider'] ?? '') === 'anonymous') {
    dashit_respond(403, ['error' => 'Please sign in with the owner account.']);
}
[$isStaff, $role] = dashit_staff_role($account, $claims);
if (!$isStaff || $role !== 'admin') {
    dashit_respond(403, ['error' => "This account isn't allowed to add photos."]);
}

// One byte past the limit, so a photo that is too big is refused, not cut short.
$photo = file_get_contents('php://input', false, null, 0, DASHIT_MAX_PHOTO_BYTES + 1) ?: '';
if ($photo === '') {
    dashit_respond(400, ['error' => 'No photo was sent.']);
}
if (strlen($photo) > DASHIT_MAX_PHOTO_BYTES) {
    dashit_respond(413, ['error' => 'That photo is too big. Send one under 2 MB.']);
}

$info = @getimagesizefromstring($photo);
$extensions = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'];
if ($info === false || !isset($extensions[$info[2]]) || $info[0] < 100 || $info[1] < 100 || $info[0] > 4000 || $info[1] > 4000) {
    dashit_respond(400, ['error' => "That file isn't a photo the shop can show. Use a JPEG or PNG."]);
}

$dir = dirname(__DIR__, 2) . '/products/uploads';
if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
    dashit_respond(500, ['error' => "The photo couldn't be saved on the website."]);
}
$name = 'dsh_' . bin2hex(random_bytes(8)) . '.' . $extensions[$info[2]];
if (@file_put_contents("$dir/$name", $photo, LOCK_EX) === false) {
    dashit_respond(500, ['error' => "The photo couldn't be saved on the website."]);
}
@chmod("$dir/$name", 0644);

dashit_respond(200, ['url' => "https://dashit.co.in/products/uploads/$name"]);
