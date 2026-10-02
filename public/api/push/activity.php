<?php
/*
 * POST { "id_token": "...", "orderId": "ABC123", "activity_token": "<hex>", "fcm_token": "..." }
 *   -> 200 { "saved": true }
 *
 * The shopper's iPhone hands over the push address of its lock-screen order
 * card. It is saved on the order itself, which notify.php reads anyway, so
 * keeping the card current costs no extra reads.
 */
require __DIR__ . '/_push.php';

dashit_push_preflight();
dashit_rate_limit('push-activity', 60);
$body = dashit_json_body();
[$account, $claims] = dashit_push_caller($body);

$orderId = is_string($body['orderId'] ?? null) ? trim($body['orderId']) : '';
$activity = is_string($body['activity_token'] ?? null) ? strtolower(trim($body['activity_token'])) : '';
$fcm = is_string($body['fcm_token'] ?? null) ? trim($body['fcm_token']) : '';
if (!preg_match('/^[A-Za-z0-9_-]{3,60}$/', $orderId) || !preg_match('/^[0-9a-f]{32,400}$/', $activity)
    || $fcm === '' || strlen($fcm) > 4096 || !preg_match('/^[A-Za-z0-9:_\-\.]+$/', $fcm)) {
    dashit_respond(400, ['error' => 'Missing details.']);
}
$order = dashit_firestore_get($account, "orders/$orderId");
if ($order === null || (string) ($order['userId'] ?? '') !== (string) $claims['sub']) {
    dashit_respond(403, ['error' => 'Not your order.']);
}
if (($order['liveActivityToken'] ?? '') === $activity) {
    dashit_respond(200, ['saved' => true]);
}
$saved = dashit_firestore_merge($account, "orders/$orderId", [
    'liveActivityToken' => $activity,
    'liveActivityFcm' => $fcm,
]);
// From now on the card is kept moving by push/tick.php, starting with the
// order's current stage.
$stage = dashit_push_stage((string) ($order['status'] ?? ''));
if ($saved && $stage !== 'delivered' && $stage !== 'cancelled') {
    dashit_push_live_activity($account, $fcm, $activity, $orderId, $order, $stage);
}
dashit_respond($saved ? 200 : 502, ['saved' => $saved]);
