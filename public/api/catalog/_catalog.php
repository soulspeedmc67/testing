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

const DASHIT_FULL_EVERY = 7 * 24 * 3600 * 1000;

/**
 * Brings catalog.json up to date (see build.php). True when the file is
 * current, false when it couldn't be, null when another build holds the lock.
 * Writes to a temporary file and renames it, so the website never serves a
 * half-written file, and refuses a result that lost more than 10% of the
 * products (a broken read), keeping the previous file.
 */
function dashit_catalog_build(bool $forceFull, callable $out): ?bool
{
    @set_time_limit(120);

    $dir = dashit_catalog_dir();
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
        $out("Can't create $dir");
        return false;
    }
    // One run at a time: a slow full read must not overlap the next cron run.
    $lock = fopen("$dir/.build.lock", 'c');
    if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
        $out('Another build is running.');
        return null;
    }

    $account = dashit_firebase_service_account();
    if ($account === null) {
        $out('No Firebase service account in dashit-secrets.');
        return false;
    }

    $current = dashit_catalog_read();
    $nowMs = (int) round(microtime(true) * 1000);
    $full = $forceFull || $current === null || $nowMs - (int) ($current['fullAt'] ?? 0) > DASHIT_FULL_EVERY;

    if (!$full) {
        $newest = dashit_catalog_newest($account);
        if ($newest === null) {
            $out('Firestore did not answer; keeping the file.');
            return false;
        }
        if ($newest <= (int) $current['version']) {
            $out('Up to date (version ' . $current['version'] . ').');
            $statusPath = "$dir/catalog-status.json";
            $status = @json_decode((string) @file_get_contents($statusPath), true) ?: [];
            $status['checkedAt'] = $nowMs;
            @file_put_contents($statusPath, json_encode($status));
            return true;
        }
        $changed = dashit_catalog_changed_since($account, (int) $current['version']);
        if ($changed === null) {
            $out('Firestore did not answer; keeping the file.');
            return false;
        }
        $byId = [];
        foreach ($current['products'] as $entry) $byId[$entry['id']] = $entry;
        foreach ($changed as $entry) $byId[$entry['id']] = $entry;
        $products = array_values($byId);
        $fullAt = (int) ($current['fullAt'] ?? 0);
        $out(count($changed) . ' changed products merged.');
    } else {
        $products = dashit_catalog_everything($account);
        if ($products === null) {
            $out('Firestore did not answer the full read; keeping the file.');
            return false;
        }
        $fullAt = $nowMs;
        $out('Full read: ' . count($products) . ' products.');
    }

    $active = count(array_filter($products, fn ($p) => ($p['active'] ?? true) !== false));
    $before = $current === null ? 0 : count(array_filter($current['products'], fn ($p) => ($p['active'] ?? true) !== false));
    if ($active < 50 || ($before > 0 && $active < $before * 0.9 && !$forceFull)) {
        $out("Refusing: $active products shown, was $before. Keeping the previous file (run --full to accept).");
        return false;
    }

    $version = 0;
    foreach ($products as $p) $version = max($version, (int) ($p['updatedAt'] ?? 0));
    usort($products, fn ($a, $b) => strcmp((string) $a['id'], (string) $b['id']));
    $json = json_encode([
        'version' => $version,
        'builtAt' => $nowMs,
        'fullAt' => $fullAt,
        'count' => $active,
        'products' => $products,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || json_decode($json, true) === null) {
        $out('Could not encode the file; keeping the previous one.');
        return false;
    }

    $tmp = dashit_catalog_path() . '.tmp';
    if (file_put_contents($tmp, $json) === false || !rename($tmp, dashit_catalog_path())) {
        $out("Could not write the file in $dir.");
        return false;
    }
    @chmod(dashit_catalog_path(), 0644);
    file_put_contents("$dir/catalog-status.json", json_encode([
        'version' => $version, 'builtAt' => $nowMs, 'checkedAt' => $nowMs, 'fullAt' => $fullAt, 'count' => $active,
        'bytes' => strlen($json),
    ]));
    $out("Wrote catalog.json: $active products, version $version, " . round(strlen($json) / 1024) . ' KB.');
    return true;
}

/**
 * The cron job's backstop, run by changes.php: when the file is missing or
 * hasn't been checked for 10 minutes, build it, at most once every 5 minutes
 * for everyone (once a minute while there is no file at all). Same Firestore
 * cost as the cron job, and only while people are using the shop.
 */
function dashit_catalog_refresh_if_stale(): void
{
    $file = dashit_catalog_read();
    $nowMs = (int) round(microtime(true) * 1000);
    $status = @json_decode((string) @file_get_contents(dashit_catalog_dir() . '/catalog-status.json'), true);
    $checkedAt = (int) ($status['checkedAt'] ?? $status['builtAt'] ?? ($file['builtAt'] ?? 0));
    if ($file !== null && $nowMs - $checkedAt < 10 * 60 * 1000) return;

    $marker = dashit_private_dir('dashit-data') . '/catalog-web-build.txt';
    $last = (int) @file_get_contents($marker);
    if (time() - $last < ($file === null ? 900 : 300)) return;
    @mkdir(dirname($marker), 0700, true);
    @file_put_contents($marker, (string) time());

    $ok = dashit_catalog_build(false, function (string $line): void {
        error_log("DASHit catalogue (web): $line");
    });
    if ($ok === true) {
        $path = dashit_catalog_dir() . '/catalog-status.json';
        $status = @json_decode((string) @file_get_contents($path), true) ?: [];
        $status['checkedAt'] = (int) round(microtime(true) * 1000);
        @file_put_contents($path, json_encode($status));
    }
}
