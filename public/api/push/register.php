<?php
/*
 * POST { "id_token": "...", "token": "<FCM token>", "platform": "android"|"ios", "app": "customer"|"admin" }
 *   -> 200 { "saved": true }
 *
 * Keeps this phone's push token against the signed-in account, so order
 * notifications reach it. The admin app's tokens get "new order" alerts, so
 * only an admin may register one as "admin".
 */
require __DIR__ . '/_push.php';

dashit_push_preflight();
dashit_rate_limit('push-register', 60);
$body = dashit_json_body();
[$account, $claims] = dashit_push_caller($body);

$token = is_string($body['token'] ?? null) ? trim($body['token']) : '';
if ($token === '' || strlen($token) > 4096 || !preg_match('/^[A-Za-z0-9:_\-\.]+$/', $token)) {
    dashit_respond(400, ['error' => 'That push token is not valid.']);
}
$platform = ($body['platform'] ?? '') === 'ios' ? 'ios' : 'android';
$app = ($body['app'] ?? 'customer') === 'admin' ? 'admin' : 'customer';
if ($app === 'admin') {
    [$isStaff, $role] = dashit_staff_role($account, $claims);
    if (!$isStaff || $role !== 'admin') {
        dashit_respond(403, ['error' => 'Only the store can register for new-order alerts.']);
    }
}

// One document per phone (its token), so a phone moving to another account follows it.
$saved = dashit_firestore_set($account, 'pushTokens/' . hash('sha256', $token), [
    'uid' => (string) $claims['sub'],
    'token' => $token,
    'platform' => $platform,
    'app' => $app,
    'updatedAt' => new DateTimeImmutable(),
]);
if (!$saved) {
    dashit_respond(502, ['error' => "Couldn't save the push token right now."]);
}
dashit_respond(200, ['saved' => true]);
