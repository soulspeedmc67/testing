<?php
/*
 * POST { "id_token": "...", "productId": "abc" }                    -> 200 { "requested": true }
 * POST { "id_token": "...", "productId": "abc", "action": "remove" } -> 200 { "requested": false }
 *
 * "Notify me" on an item that is out of stock (website and both shop apps).
 * One document per shopper and item, restockRequests/{productId}__{uid}, so
 * asking twice counts once. The owner sees them grouped by item in the admin
 * apps ("Restock requests", list.php) and can tell everyone who asked once it
 * is back. The item's name and photo are read from products/{id} here, never
 * taken from the caller.
 */
require __DIR__ . '/../push/_push.php';

dashit_push_preflight();
dashit_rate_limit('restock-request', 60);
$body = dashit_json_body();
[$account, $claims] = dashit_push_caller($body);

$productId = is_string($body['productId'] ?? null) ? trim($body['productId']) : '';
if ($productId === '' || strlen($productId) > 200 || !preg_match('/^[A-Za-z0-9_\-\.]+$/', $productId)) {
    dashit_respond(400, ['error' => 'That item is not valid.']);
}
$uid = (string) $claims['sub'];
$path = 'restockRequests/' . $productId . '__' . $uid;

if (($body['action'] ?? 'add') === 'remove') {
    dashit_firestore_delete($account, $path);
    dashit_respond(200, ['requested' => false]);
}

$product = dashit_firestore_get($account, 'products/' . $productId);
if (!is_array($product)) {
    dashit_respond(404, ['error' => "We couldn't find that item."]);
}
$name = trim((string) ($product['name'] ?? $product['title'] ?? ''));
$img = (string) ($product['img'] ?? $product['image'] ?? $product['imageUrl'] ?? '');
$unit = (string) ($product['unit'] ?? $product['weight'] ?? '');

$fields = [
    'productId' => $productId,
    'uid' => $uid,
    'name' => mb_substr($name !== '' ? $name : 'Item', 0, 200),
    'img' => strlen($img) <= 2000 ? $img : '',
    'unit' => mb_substr($unit, 0, 60),
    'open' => true,
];
// The first ask keeps its date; asking again (say, after the last "back in stock") reopens it.
$saved = dashit_firestore_create_once($account, $path, $fields + ['createdAt' => new DateTimeImmutable()])
    || dashit_firestore_merge($account, $path, $fields + ['askedAgainAt' => new DateTimeImmutable()]);
if (!$saved) {
    dashit_respond(502, ['error' => "Couldn't save that right now. Please try again."]);
}
dashit_respond(200, ['requested' => true]);
