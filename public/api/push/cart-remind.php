<?php
/*
 * POST { "id_token": "...", "action": "preview" } -> 200 { "waiting": 12, "history": [...], "perDay": 2 }
 * POST { "id_token": "...", "action": "send" }    -> 200 { "sent": 11, "waiting": 0, "history": [...] }
 *
 * "Cart reminders" in the admin app: "Your cart is waiting" to every shopper
 * whose phone has items in the cart (cart.php keeps the count). Admins only.
 * The shopper's phone also reminds them by itself (CartReminders), so this
 * one is careful not to pile on:
 *
 *  - only carts left alone for at least DASHIT_CART_MIN_IDLE (not someone
 *    shopping right now) and changed within DASHIT_CART_MAX_AGE (not stale)
 *  - not to a phone that had one from here in the last DASHIT_CART_GAP
 *  - not at night (DASHIT_CART_QUIET_FROM to DASHIT_CART_QUIET_UNTIL, India time)
 *  - at most DASHIT_CART_SENDS_PER_DAY sends in any 24 hours
 *
 * The wording is fixed here (with the item count), never written by the caller.
 * The last few sends are kept in dashit-data/cart-reminders.json.
 */
require __DIR__ . '/_push.php';

const DASHIT_CART_MIN_IDLE = 30 * 60;
const DASHIT_CART_MAX_AGE = 7 * 86400;
const DASHIT_CART_GAP = 20 * 3600;
const DASHIT_CART_QUIET_FROM = 21;
const DASHIT_CART_QUIET_UNTIL = 9;
const DASHIT_CART_SENDS_PER_DAY = 2;

dashit_push_preflight();
dashit_rate_limit('push-cart-remind', 60);
$body = dashit_json_body();
[$account, $claims] = dashit_push_caller($body);
[$isStaff, $role] = dashit_staff_role($account, $claims);
if (!$isStaff || $role !== 'admin') {
    dashit_respond(403, ['error' => 'Only the shop owner can send these.']);
}

$historyFile = dashit_private_dir('dashit-data') . '/cart-reminders.json';
$history = is_file($historyFile) ? json_decode((string) file_get_contents($historyFile), true) : [];
if (!is_array($history)) $history = [];
$now = time();

/** Phones with a cart waiting that may have a reminder now: [[docId, fields], ...]. */
$waiting = function () use ($account, $now): array {
    $out = [];
    foreach (dashit_firestore_where($account, 'pushTokens', 'hasCart', true, 1000) as [$id, $fields]) {
        if (($fields['app'] ?? 'customer') !== 'customer' || empty($fields['token'])) continue;
        if ((int) ($fields['cartCount'] ?? 0) <= 0) continue;
        $changed = strtotime((string) ($fields['cartAt'] ?? '')) ?: 0;
        if ($changed > $now - DASHIT_CART_MIN_IDLE || $changed < $now - DASHIT_CART_MAX_AGE) continue;
        $last = strtotime((string) ($fields['lastCartPush'] ?? '')) ?: 0;
        if ($last > $now - DASHIT_CART_GAP) continue;
        $out[] = [$id, $fields];
    }
    return $out;
};
$reply = fn (array $extra = []) => $extra + ['history' => $history, 'perDay' => DASHIT_CART_SENDS_PER_DAY];

$phones = $waiting();
if (($body['action'] ?? 'preview') !== 'send') {
    dashit_respond(200, $reply(['waiting' => count($phones)]));
}

$hour = (int) (new DateTimeImmutable('now', new DateTimeZone('Asia/Kolkata')))->format('G');
if ($hour >= DASHIT_CART_QUIET_FROM || $hour < DASHIT_CART_QUIET_UNTIL) {
    dashit_respond(409, $reply(['error' => 'Cart reminders go out between 9 AM and 9 PM, so nobody is woken up. Please send it in the morning.', 'waiting' => count($phones)]));
}
$lastDay = array_filter($history, fn ($h) => ($h['at'] ?? 0) > $now - 86400 && ($h['sent'] ?? 0) > 0);
if (count($lastDay) >= DASHIT_CART_SENDS_PER_DAY) {
    dashit_respond(429, $reply(['error' => 'That\'s ' . DASHIT_CART_SENDS_PER_DAY . ' cart reminders in the last 24 hours. Please wait before sending another.', 'waiting' => count($phones)]));
}
if (!$phones) {
    dashit_respond(200, $reply(['sent' => 0, 'waiting' => 0]));
}

$sent = 0;
$stamp = new DateTimeImmutable();
foreach ($phones as [$id, $fields]) {
    $count = (int) $fields['cartCount'];
    $text = 'You left ' . $count . ' item' . ($count === 1 ? '' : 's') . ' in your cart. Order now and get ' . ($count === 1 ? 'it' : 'them') . ' delivered in minutes.';
    $result = dashit_push_send($account, (string) $fields['token'], 'Your cart is waiting', $text, ['kind' => 'cart'], 'customer', 'cart_reminders');
    if ($result === 'ok') {
        $sent++;
        dashit_firestore_merge($account, "pushTokens/$id", ['lastCartPush' => $stamp]);
    } elseif ($result === 'gone') {
        dashit_firestore_delete($account, "pushTokens/$id");
    }
}

array_unshift($history, ['at' => $now, 'sent' => $sent, 'waiting' => count($phones)]);
$history = array_slice($history, 0, 20);
if (!is_dir(dirname($historyFile))) @mkdir(dirname($historyFile), 0700, true);
@file_put_contents($historyFile, json_encode($history), LOCK_EX);

if ($sent === 0) {
    dashit_respond(502, $reply(['error' => "Couldn't send them just now. Please try again.", 'waiting' => count($phones)]));
}
dashit_respond(200, $reply(['sent' => $sent, 'waiting' => 0]));
