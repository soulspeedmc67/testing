<?php
/*
 * POST { "id_token": "...", "token": "<FCM token>", "platform": "android"|"ios", "count": 3 }
 *   -> 200 { "saved": true }
 *
 * The shop apps say how many items are in this phone's cart (only the
 * number, never what they are), a few seconds after it changes, and 0 once
 * it's ordered or emptied or the shopper has turned cart reminders off. It's
 * kept on the phone's pushTokens document, so "Cart reminders" in the admin
 * app (cart-remind.php) can tell which phones have a cart waiting.
 */
require __DIR__ . '/_push.php';

dashit_push_preflight();
dashit_rate_limit('push-cart', 240);
$body = dashit_json_body();
[$account, $claims] = dashit_push_caller($body);

$token = is_string($body['token'] ?? null) ? trim($body['token']) : '';
if ($token === '' || strlen($token) > 4096 || !preg_match('/^[A-Za-z0-9:_\-\.]+$/', $token)) {
    dashit_respond(400, ['error' => 'That push token is not valid.']);
}
$count = max(0, min(999, (int) ($body['count'] ?? 0)));
$now = new DateTimeImmutable();

// Merged, so the phone's last cart reminder (lastCartPush) is kept.
$saved = dashit_firestore_merge($account, 'pushTokens/' . hash('sha256', $token), [
    'uid' => (string) $claims['sub'],
    'token' => $token,
    'platform' => ($body['platform'] ?? '') === 'ios' ? 'ios' : 'android',
    'app' => 'customer',
    'hasCart' => $count > 0,
    'cartCount' => $count,
    'cartAt' => $now,
    'updatedAt' => $now,
]);
if (!$saved) {
    dashit_respond(502, ['error' => "Couldn't save that right now."]);
}
dashit_respond(200, ['saved' => true]);
