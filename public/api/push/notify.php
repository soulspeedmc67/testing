<?php
/*
 * POST { "id_token": "...", "orderId": "ABC123" }
 *   -> 200 { "stage": "on_the_way", "sent": 2 }   or { "stage": ..., "already": true }
 *
 * Called after an order changes, by whoever changed it: the shopper's app
 * (placed, cancelled) or the store and rider screens (packed, on the way,
 * delivered). The server reads the order itself and sends the push that
 * matches its status, once per order and status:
 *
 *   placed      shopper: "Order placed"         store (admin app): "New order"
 *   packing     shopper: "Packing your order"
 *   on_the_way  shopper: "On the way" with the delivery code
 *   delivered   shopper: "Delivered"
 *   cancelled   shopper: "Order cancelled"      store: "Order cancelled"
 */
require __DIR__ . '/_push.php';

dashit_push_preflight();
dashit_rate_limit('push-notify', 300);
$body = dashit_json_body();
[$account, $claims] = dashit_push_caller($body);

$orderId = is_string($body['orderId'] ?? null) ? trim($body['orderId']) : '';
if (!preg_match('/^[A-Za-z0-9_-]{3,60}$/', $orderId)) {
    dashit_respond(400, ['error' => 'Which order?']);
}
$order = dashit_firestore_get($account, "orders/$orderId");
if ($order === null) {
    dashit_respond(404, ['error' => 'No such order.']);
}
$uid = (string) $claims['sub'];
$owner = (string) ($order['userId'] ?? '');
if ($uid !== $owner) {
    [$isStaff] = dashit_staff_role($account, $claims);
    if (!$isStaff) {
        dashit_respond(403, ['error' => 'Not your order.']);
    }
}

$stage = dashit_push_stage((string) ($order['status'] ?? ''));
// Adding items replaces the order with a new one and cancels the old: the
// shopper gets no "placed" or "cancelled" for that, the store gets "updated".
$replaces = (string) ($order['replacesOrderId'] ?? '');
$reason = strtolower((string) ($order['cancelReason'] ?? ''));
if ($stage === 'cancelled' && (str_starts_with($reason, 'replaced') || str_starts_with($reason, 'withdrawn'))) {
    dashit_respond(200, ['stage' => $stage, 'sent' => 0]);
}
// Once per order and status: a second ask (or a retry) sends nothing more.
// Created only if new: one write, no read.
if (!dashit_firestore_create_once($account, "pushSent/{$orderId}_{$stage}", ['orderId' => $orderId, 'stage' => $stage, 'at' => new DateTimeImmutable()])) {
    dashit_respond(200, ['stage' => $stage, 'already' => true]);
}

$code = (string) ($order['otp'] ?? '');
$total = (int) round((float) ($order['total'] ?? $order['totalAmount'] ?? 0));
$items = 0;
foreach (($order['items'] ?? []) as $item) {
    $items += is_array($item) ? max(1, (int) ($item['qty'] ?? 1)) : 1;
}
$shortId = strtoupper(substr($orderId, -6));
$data = ['orderId' => $orderId, 'stage' => $stage];

$shopper = [
    'placed' => ['Order placed', "We've got your order and are getting it ready."],
    'packing' => ['Packing your order', 'Your items are being packed. A rider picks them up next.'],
    'on_the_way' => ['On the way', $code !== '' ? "Your order is on its way. Share code $code with the rider." : 'Your order is on its way.'],
    'delivered' => ['Delivered', 'Your order has been delivered. Thanks for ordering from DASHit!'],
    'cancelled' => ['Order cancelled', "Order #$shortId has been cancelled."],
][$stage];

$sent = 0;
if ($owner !== '' && !($stage === 'placed' && $replaces !== '')) {
    $sent += dashit_push_to($account, dashit_firestore_where($account, 'pushTokens', 'uid', $owner), 'customer', $shopper[0], $shopper[1], $data);
}
// The lock-screen order card on the shopper's iPhone, kept current while the
// app is closed. Its push address is saved on the order (push/activity.php),
// which was read above anyway: no extra reads.
$liveToken = (string) ($order['liveActivityToken'] ?? '');
$liveFcm = (string) ($order['liveActivityFcm'] ?? '');
if ($liveToken !== '' && $liveFcm !== '') {
    dashit_push_live_activity($account, $liveFcm, $liveToken, $order, $stage);
}

if ($stage === 'placed' || $stage === 'cancelled') {
    $title = $stage === 'cancelled' ? 'Order cancelled' : ($replaces !== '' ? 'Order updated' : 'New order');
    $text = $stage === 'placed'
        ? "#$shortId · ₹$total · $items item" . ($items === 1 ? '' : 's')
        : "#$shortId was cancelled.";
    $sent += dashit_push_to($account, dashit_firestore_where($account, 'pushTokens', 'app', 'admin'), 'admin', $title, $text, $data);
}
dashit_respond(200, ['stage' => $stage, 'sent' => $sent]);
