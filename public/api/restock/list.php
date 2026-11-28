<?php
/*
 * "Restock requests" in the admin apps (staff only).
 *
 * POST { "id_token": "...", "action": "list" }
 *   -> 200 { "items": [ { "productId", "name", "img", "unit", "count",
 *                         "firstAt", "lastAt", "inStock", "stock" }, ... ], "total": 14 }
 *      Items shoppers asked for with "Notify me" (request.php), most asked first.
 *
 * POST { "id_token": "...", "action": "notify", "productId": "abc" }
 *   -> 200 { "sent": 3, "people": 4 }
 *      "Back in stock" to everyone who asked, then closes their requests.
 *      Only once the item really is in stock again, and not at night.
 *
 * POST { "id_token": "...", "action": "restock", "productId": "abc", "quantity": 12 }
 *   -> 200 { "stock": 12, "inStock": true }
 *      Adds that many to the stock and puts the item back on sale (no push).
 *
 * POST { "id_token": "...", "action": "dismiss", "productId": "abc" }
 *   -> 200 { "closed": 4 }
 *      Closes the requests without telling anyone (an item the shop won't stock).
 *
 * The wording of the push is fixed here, never written by the caller.
 */
require __DIR__ . '/../push/_push.php';

const DASHIT_RESTOCK_QUIET_FROM = 21;
const DASHIT_RESTOCK_QUIET_UNTIL = 9;

dashit_push_preflight();
dashit_rate_limit('restock-list', 240);
$body = dashit_json_body();
[$account, $claims] = dashit_push_caller($body);
[$isStaff] = dashit_staff_role($account, $claims);
if (!$isStaff) {
    dashit_respond(403, ['error' => 'Only the shop team can see these.']);
}

$action = (string) ($body['action'] ?? 'list');
$stamp = fn ($row) => strtotime((string) ($row['askedAgainAt'] ?? $row['createdAt'] ?? '')) ?: 0;

/** Whether products/{id} can be ordered: [inStock, stock or null, fields or null]. */
$stockOf = function (string $productId) use ($account): array {
    $product = dashit_firestore_get($account, 'products/' . $productId);
    if (!is_array($product)) return [false, null, null];
    $stock = array_key_exists('stock', $product) && $product['stock'] !== null ? (int) $product['stock'] : null;
    $inStock = ($product['inStock'] ?? true) !== false && ($stock === null || $stock > 0) && ($product['active'] ?? true) !== false;
    return [$inStock, $stock, $product];
};

if ($action === 'list') {
    $groups = [];
    foreach (dashit_firestore_where($account, 'restockRequests', 'open', true, 2000) as [, $row]) {
        $id = (string) ($row['productId'] ?? '');
        if ($id === '') continue;
        $at = $stamp($row);
        $g = $groups[$id] ?? ['productId' => $id, 'name' => '', 'img' => '', 'unit' => '', 'count' => 0, 'firstAt' => $at, 'lastAt' => $at];
        $g['count']++;
        $g['name'] = $g['name'] ?: (string) ($row['name'] ?? 'Item');
        $g['img'] = $g['img'] ?: (string) ($row['img'] ?? '');
        $g['unit'] = $g['unit'] ?: (string) ($row['unit'] ?? '');
        $g['firstAt'] = min($g['firstAt'], $at);
        $g['lastAt'] = max($g['lastAt'], $at);
        $groups[$id] = $g;
    }
    usort($groups, fn ($a, $b) => [$b['count'], $b['lastAt']] <=> [$a['count'], $a['lastAt']]);
    // Whether each is back already (one read per item, at most 100 items).
    foreach ($groups as $i => $g) {
        if ($i >= 100) break;
        [$inStock, $stock] = $stockOf($g['productId']);
        $groups[$i]['inStock'] = $inStock;
        $groups[$i]['stock'] = $stock;
    }
    $total = array_sum(array_column($groups, 'count'));
    dashit_respond(200, ['items' => array_values($groups), 'total' => $total]);
}

$productId = is_string($body['productId'] ?? null) ? trim($body['productId']) : '';
if ($productId === '' || strlen($productId) > 200 || !preg_match('/^[A-Za-z0-9_\-\.]+$/', $productId)) {
    dashit_respond(400, ['error' => 'That item is not valid.']);
}
$requests = array_values(array_filter(
    dashit_firestore_where($account, 'restockRequests', 'productId', $productId, 1000),
    fn ($r) => ($r[1]['open'] ?? false) === true
));
$closeAll = function (array $extra) use ($account, $requests): void {
    foreach ($requests as [$docId]) {
        dashit_firestore_merge($account, "restockRequests/$docId", ['open' => false, 'closedAt' => new DateTimeImmutable()] + $extra);
    }
};

if ($action === 'restock') {
    // Adds stock right from the list: stock goes up by `quantity` and the item is
    // switched back on for shoppers. Nobody is told yet; that's "notify".
    $quantity = (int) ($body['quantity'] ?? 0);
    if ($quantity < 1 || $quantity > 10000) {
        dashit_respond(400, ['error' => 'Enter how many you got, from 1 to 10000.']);
    }
    $product = dashit_firestore_get($account, 'products/' . $productId);
    if (!is_array($product)) {
        dashit_respond(404, ['error' => "That item isn't in the shop any more."]);
    }
    $current = max(0, (int) ($product['stock'] ?? 0));
    $stock = $current + $quantity;
    $saved = dashit_firestore_merge($account, 'products/' . $productId, [
        'stock' => $stock,
        'inStock' => true,
        // The shop apps only download items whose updatedAt changed.
        'updatedAt' => new DateTimeImmutable(),
    ]);
    if (!$saved) {
        dashit_respond(502, ['error' => "Couldn't save the stock. Please try again."]);
    }
    dashit_respond(200, ['stock' => $stock, 'inStock' => true]);
}

if ($action === 'dismiss') {
    $closeAll(['outcome' => 'dismissed']);
    dashit_respond(200, ['closed' => count($requests)]);
}

if ($action !== 'notify') {
    dashit_respond(400, ['error' => 'Unknown action.']);
}

[$inStock, , $product] = $stockOf($productId);
if (!$inStock) {
    dashit_respond(409, ['error' => 'This item is still out of stock. Add stock first, then tell them.']);
}
$hour = (int) (new DateTimeImmutable('now', new DateTimeZone('Asia/Kolkata')))->format('G');
if ($hour >= DASHIT_RESTOCK_QUIET_FROM || $hour < DASHIT_RESTOCK_QUIET_UNTIL) {
    dashit_respond(409, ['error' => 'These go out between 9 AM and 9 PM, so nobody is woken up. Please send it in the morning.']);
}
if (!$requests) {
    dashit_respond(200, ['sent' => 0, 'people' => 0]);
}

$name = trim((string) ($product['name'] ?? $product['title'] ?? $requests[0][1]['name'] ?? 'Your item'));
$title = 'Back in stock';
$text = mb_substr($name, 0, 80) . ' is back at DASHit. Order now before it runs out again.';
$data = ['kind' => 'restock', 'productId' => $productId];

$sent = 0;
$people = [];
foreach ($requests as [, $row]) {
    $uid = (string) ($row['uid'] ?? '');
    if ($uid === '' || isset($people[$uid])) continue;
    $people[$uid] = true;
    $sent += dashit_push_to($account, dashit_firestore_where($account, 'pushTokens', 'uid', $uid, 10), 'customer', $title, $text, $data);
}
$closeAll(['outcome' => 'notified']);
dashit_respond(200, ['sent' => $sent, 'people' => count($people)]);
