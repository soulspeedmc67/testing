<?php
/*
 * The shop's product list as one file on the website, so the apps don't read
 * ~4,600 products from Firestore (each read is billed).
 *
 *   build.php    (Hostinger cron, every 5 minutes) keeps
 *                public_html/catalog/catalog.json up to date.
 *   changes.php  (the apps, about every 30 s while open) answers "what changed
 *                since version X?" from that file plus a short-lived look at
 *                Firestore for edits newer than the file.
 *
 * The file carries only the fields the shop apps show; a product switched off
 * stays in it as a small { id, active: false } so phones drop it too.
 * Versions are milliseconds: the newest `updatedAt` among the products.
 */

require_once __DIR__ . '/../_firebase.php';

/** Fields the shop apps read (Android FirestoreRepository.parseProduct, iOS Product). */
const DASHIT_CATALOG_FIELDS = [
    'name', 'title', 'unit', 'weight', 'price', 'originalPrice', 'mrp', 'rating', 'ratingCount',
    'time', 'options', 'badge', 'img', 'image', 'imageUrl', 'cat', 'category', 'variants',
    'ageRestricted', 'minAge', 'inStock', 'stock', 'nutrition',
];

/** public_html/catalog, from the web or from the command line (cron). */
function dashit_catalog_dir(): string
{
    return dirname(__DIR__, 2) . '/catalog';
}

function dashit_catalog_path(): string
{
    return dashit_catalog_dir() . '/catalog.json';
}

/** Firestore timestamp text ("2026-10-02T03:03:43.123456Z") as milliseconds, or 0. */
function dashit_ms(?string $timestamp): int
{
    if (!is_string($timestamp) || $timestamp === '') return 0;
    if (!preg_match('/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d+))?Z$/', $timestamp, $m)) return 0;
    $seconds = strtotime($m[1] . 'Z');
    $fraction = isset($m[2]) ? (int) str_pad(substr($m[2], 0, 3), 3, '0') : 0;
    return $seconds === false ? 0 : $seconds * 1000 + $fraction;
}

/** Milliseconds as a Firestore timestamp value. */
function dashit_ms_value(int $ms): array
{
    $micro = ($ms % 1000) * 1000;
    return ['timestampValue' => gmdate('Y-m-d\TH:i:s', intdiv($ms, 1000)) . sprintf('.%06dZ', $micro)];
}

/** A Firestore document (REST) as the slim catalogue entry the apps read. */
function dashit_catalog_entry(array $document): array
{
    $id = basename((string) $document['name']);
    $fields = $document['fields'] ?? [];
    $updated = dashit_ms($fields['updatedAt']['timestampValue'] ?? null);
    if (($fields['active']['booleanValue'] ?? true) === false) {
        return ['id' => $id, 'active' => false, 'updatedAt' => $updated];
    }
    $entry = ['id' => $id];
    foreach (DASHIT_CATALOG_FIELDS as $name) {
        if (array_key_exists($name, $fields)) {
            $entry[$name] = dashit_firestore_plain($fields[$name]);
        }
    }
    $entry['updatedAt'] = $updated;
    return $entry;
}

/** Products changed at or after $since (ms), oldest first, at most $limit. Null if Firestore didn't answer. */
function dashit_catalog_changed_since(array $account, int $since, int $limit = 2000): ?array
{
    $endpoint = dashit_firestore_endpoint($account);
    if ($endpoint === null) return null;
    [$status, $reply] = dashit_firestore_request('POST', $endpoint[0] . ':runQuery', $endpoint[1], [
        'structuredQuery' => [
            'from' => [['collectionId' => 'products']],
            'where' => ['fieldFilter' => [
                'field' => ['fieldPath' => 'updatedAt'],
                'op' => 'GREATER_THAN_OR_EQUAL',
                'value' => dashit_ms_value($since),
            ]],
            'orderBy' => [['field' => ['fieldPath' => 'updatedAt'], 'direction' => 'ASCENDING']],
            'limit' => $limit,
        ],
    ]);
    if ($status !== 200) return null;
    $out = [];
    foreach ($reply as $row) {
        if (isset($row['document'])) $out[] = dashit_catalog_entry($row['document']);
    }
    return $out;
}

/** The newest `updatedAt` among all products (one read), or null if Firestore didn't answer. */
function dashit_catalog_newest(array $account): ?int
{
    $endpoint = dashit_firestore_endpoint($account);
    if ($endpoint === null) return null;
    [$status, $reply] = dashit_firestore_request('POST', $endpoint[0] . ':runQuery', $endpoint[1], [
        'structuredQuery' => [
            'from' => [['collectionId' => 'products']],
            'select' => ['fields' => [['fieldPath' => 'updatedAt']]],
            'orderBy' => [['field' => ['fieldPath' => 'updatedAt'], 'direction' => 'DESCENDING']],
            'limit' => 1,
        ],
    ]);
    if ($status !== 200) return null;
    foreach ($reply as $row) {
        if (isset($row['document'])) return dashit_ms($row['document']['fields']['updatedAt']['timestampValue'] ?? null);
    }
    return 0;
}

/** Every product, page by page (a full read: once a night). Null if Firestore didn't answer. */
function dashit_catalog_everything(array $account): ?array
{
    $out = [];
    $pageToken = '';
    do {
        $endpoint = dashit_firestore_endpoint($account, 'products');
        if ($endpoint === null) return null;
        $url = $endpoint[0] . '?pageSize=300' . ($pageToken !== '' ? '&pageToken=' . rawurlencode($pageToken) : '');
        foreach (array_merge(['updatedAt', 'active'], DASHIT_CATALOG_FIELDS) as $field) {
            $url .= '&mask.fieldPaths=' . rawurlencode($field);
        }
        [$status, $reply] = dashit_firestore_request('GET', $url, $endpoint[1]);
        if ($status !== 200) return null;
        foreach ($reply['documents'] ?? [] as $document) {
            $out[] = dashit_catalog_entry($document);
        }
        $pageToken = (string) ($reply['nextPageToken'] ?? '');
    } while ($pageToken !== '');
    return $out;
}

/** The current file, decoded, or null. */
function dashit_catalog_read(): ?array
{
    $path = dashit_catalog_path();
    if (!is_file($path)) return null;
    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) && isset($data['version'], $data['products']) && is_array($data['products']) ? $data : null;
}
