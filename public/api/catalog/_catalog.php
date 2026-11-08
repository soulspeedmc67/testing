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
    // Read by the staff console's "Check photos" (its product list is this file).
    'photoSuggestionsSkipped', 'photoRejected', 'rejectedPhoto',
];

/** The made-up example distributors (src/lib/db.js); stock tagged with one is the owner's own. */
const DASHIT_DEMO_DISTRIBUTORS = [
    'Kashmir Wholesale FMCG', 'Amul Valley Dairy Logistics', 'Local Kandur Bakeries',
    'Anantnag Fresh Farm Orchards', 'Hindustan Unilever Direct', 'ITC & Nestlé Supply Hub',
];

/** True when the stock came from a distributor rather than the owner ("Myself" or untagged). */
function dashit_catalog_supplied(array $fields): bool
{
    $name = trim((string) ($fields['distributor']['stringValue'] ?? ''));
    return $name !== '' && $name !== 'Myself' && !in_array($name, DASHIT_DEMO_DISTRIBUTORS, true);
}

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
    // The shops list the owner's own stock first. Only this flag is public,
    // never who the distributor is.
    if (dashit_catalog_supplied($fields)) $entry['supplied'] = true;
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

/** How many product documents Firestore holds (about one read per 1,000), or null if it didn't answer. */
function dashit_catalog_count(array $account): ?int
{
    $endpoint = dashit_firestore_endpoint($account);
    if ($endpoint === null) return null;
    [$status, $reply] = dashit_firestore_request('POST', $endpoint[0] . ':runAggregationQuery', $endpoint[1], [
        'structuredAggregationQuery' => [
            'structuredQuery' => ['from' => [['collectionId' => 'products']]],
            'aggregations' => [['alias' => 'n', 'count' => new stdClass()]],
        ],
    ]);
    if ($status !== 200) return null;
    foreach ($reply as $row) {
        $n = $row['result']['aggregateFields']['n']['integerValue'] ?? null;
        if ($n !== null) return (int) $n;
    }
    return null;
}

/** Entries in the file that still stand for a Firestore document (not ones we marked erased). */
function dashit_catalog_listed(array $file): int
{
    return count(array_filter($file['products'], fn ($p) => empty($p['removed'])));
}

/** How long an erased product's { active: false } stays in the file, so phones that were away still drop it. */
const DASHIT_REMOVED_KEEP = 60 * 24 * 3600 * 1000;

/** Every product, page by page (a full read: once a night). Null if Firestore didn't answer. */
function dashit_catalog_everything(array $account): ?array
{
    $out = [];
    $pageToken = '';
    do {
        $endpoint = dashit_firestore_endpoint($account, 'products');
        if ($endpoint === null) return null;
        $url = $endpoint[0] . '?pageSize=300' . ($pageToken !== '' ? '&pageToken=' . rawurlencode($pageToken) : '');
        foreach (array_merge(['updatedAt', 'active', 'distributor'], DASHIT_CATALOG_FIELDS) as $field) {
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

/**
 * Photo memory: the last photo each product name (and barcode) had, kept in
 * dashit-data beside public_html, so it outlives a cleared stock list and a
 * replaced website folder. A product uploaded again under a new id gets its
 * photo back from here (api/catalog/photos.php, src/lib/sitePhotos.js).
 */
function dashit_photo_memory_path(): string
{
    return dashit_private_dir('dashit-data') . '/photo-memory.json';
}

function dashit_photo_memory_read(): array
{
    $data = @json_decode((string) @file_get_contents(dashit_photo_memory_path()), true);
    return [
        'names' => is_array($data['names'] ?? null) ? $data['names'] : [],
        'barcodes' => is_array($data['barcodes'] ?? null) ? $data['barcodes'] : [],
    ];
}

/** A product's photo link worth remembering, or ''. */
function dashit_photo_of(array $product): string
{
    foreach (['img', 'image', 'imageUrl'] as $field) {
        $value = trim((string) (is_string($product[$field] ?? null) ? $product[$field] : ''));
        if ($value !== '' && (str_starts_with($value, 'https://') || str_starts_with($value, '/products/'))) return $value;
    }
    return '';
}

/** Notes the photo of every named product in $products. Writes only when something is new. */
function dashit_photo_memory_note(array $products): void
{
    $memory = dashit_photo_memory_read();
    $changed = false;
    foreach ($products as $product) {
        if (!is_array($product) || ($product['active'] ?? true) === false) continue;
        $img = dashit_photo_of($product);
        $name = trim((string) ($product['name'] ?? ''));
        if ($img === '' || $name === '') continue;
        if (($memory['names'][$name] ?? '') !== $img) {
            $memory['names'][$name] = $img;
            $changed = true;
        }
        $id = (string) ($product['id'] ?? '');
        if (preg_match('/^(\d{8}|\d{12,14})$/', $id) && ($memory['barcodes'][$id] ?? '') !== $img) {
            $memory['barcodes'][$id] = $img;
            $changed = true;
        }
    }
    if (!$changed) return;
    $path = dashit_photo_memory_path();
    @mkdir(dirname($path), 0700, true);
    $json = json_encode($memory, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json !== false && @file_put_contents("$path.tmp", $json) !== false) @rename("$path.tmp", $path);
}

/** The current file, decoded, or null. */
function dashit_catalog_read(): ?array
{
    $path = dashit_catalog_path();
    if (!is_file($path)) return null;
    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) && isset($data['version'], $data['products']) && is_array($data['products']) ? $data : null;
}

/*
 * A product erased from Firestore (rather than marked active: false) never
 * shows up as a change, so only a full read drops it. Nightly keeps such a
 * product on the shop for a day at most, for about one read per product a
 * day (well inside the free daily reads).
 */
const DASHIT_FULL_EVERY = 24 * 3600 * 1000;

/*
 * Files written before this format may still list products erased from
 * Firestore; the first build on seeing one reads everything and accepts the
 * result even though it is shorter.
 */
const DASHIT_CATALOG_FORMAT = 2;

/**
 * Brings catalog.json up to date (see build.php). True when the file is
 * current, false when it couldn't be, null when another build holds the lock.
 * Writes to a temporary file and renames it, so the website never serves a
 * half-written file. A full read that came back with more than 10% fewer
 * products (removed ones included) than the file is taken for a broken read
 * and the previous file is kept. Merged changes are always accepted: each one
 * is a product Firestore itself reported, so a big clean-up (many products
 * marked removed at once) goes through.
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
    if ($current !== null && (int) ($current['format'] ?? 1) < DASHIT_CATALOG_FORMAT) $forceFull = true;
    $full = $forceFull || $current === null || $nowMs - (int) ($current['fullAt'] ?? 0) > DASHIT_FULL_EVERY;

    // A product erased from Firestore (the console's "delete all products")
    // leaves no newer `updatedAt` behind, so only a count shows it: fewer
    // documents than the file lists means read everything and drop the rest.
    $stored = null;
    if (!$full) {
        $stored = dashit_catalog_count($account);
        if ($stored !== null && $stored < dashit_catalog_listed($current)) {
            $out("Firestore holds $stored products, the file lists " . dashit_catalog_listed($current) . ': reading everything.');
            $full = true;
        }
    }

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
        $read = count($products);
        $out("Full read: $read products.");

        // Every product in the old file that Firestore no longer has goes out
        // as { active: false }, newer than any version a phone holds, so the
        // apps already installed drop it through changes.php.
        $seen = [];
        $newest = 0;
        foreach ($products as $p) {
            $seen[$p['id']] = true;
            $newest = max($newest, (int) ($p['updatedAt'] ?? 0));
        }
        $removedAt = max($newest, (int) ($current['version'] ?? 0)) + 1;
        $erased = 0;
        foreach ($current['products'] ?? [] as $old) {
            if (isset($seen[$old['id']])) continue;
            if (!empty($old['removed'])) {
                if ($nowMs - (int) ($old['removedAt'] ?? 0) < DASHIT_REMOVED_KEEP) $products[] = $old;
                continue;
            }
            $products[] = ['id' => $old['id'], 'active' => false, 'removed' => true, 'removedAt' => $nowMs, 'updatedAt' => $removedAt];
            $erased += 1;
        }
        if ($erased > 0) $out("$erased products erased from Firestore, marked off.");
    }

    $active = count(array_filter($products, fn ($p) => ($p['active'] ?? true) !== false));
    if ($full && !$forceFull) {
        $before = $current === null ? 0 : count($current['products']);
        if (count($products) < 50 || ($before > 0 && count($products) < $before * 0.9)) {
            $out('Refusing: the full read found ' . count($products) . " products, the file has $before. Keeping the previous file (run --full to accept).");
            return false;
        }
    }

    // Before anything is dropped: the photos products had, for when they come back.
    dashit_photo_memory_note(array_merge($current['products'] ?? [], $products));

    $version = 0;
    foreach ($products as $p) $version = max($version, (int) ($p['updatedAt'] ?? 0));
    // Products gone from Firestore change no `updatedAt`, so the version moves
    // on by a millisecond: the apps and the website see a new file and take it.
    if ($current !== null && count($products) < count($current['products'])) {
        $version = max($version, (int) $current['version'] + 1);
    }
    usort($products, fn ($a, $b) => strcmp((string) $a['id'], (string) $b['id']));
    $json = json_encode([
        'version' => $version,
        'format' => DASHIT_CATALOG_FORMAT,
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
