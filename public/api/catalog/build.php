<?php
/*
 * Keeps public_html/catalog/catalog.json up to date. Runs from Hostinger's
 * cron only (command line); the web gets a 404 (and .htaccess blocks it too).
 *
 *   php build.php          every 5 minutes: one Firestore read to see whether
 *                          anything changed; if so, reads only the products
 *                          changed since the file and merges them in. Once a
 *                          day (or with no file yet) it reads everything.
 *   php build.php --full   read everything now.
 *
 * Writes to a temporary file and renames it, so the website never serves a
 * half-written file, and refuses a result that lost more than 10% of the
 * products (a broken read), keeping the previous file.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/_catalog.php';

const DASHIT_FULL_EVERY = 24 * 3600 * 1000;

function out(string $line): void
{
    fwrite(STDOUT, gmdate('c') . " $line\n");
}

$dir = dashit_catalog_dir();
if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
    out("Can't create $dir");
    exit(1);
}
// One run at a time: a slow full read must not overlap the next cron run.
$lock = fopen("$dir/.build.lock", 'c');
if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
    out('Another build is running.');
    exit(0);
}

$account = dashit_firebase_service_account();
if ($account === null) {
    out('No Firebase service account in dashit-secrets.');
    exit(1);
}

$current = dashit_catalog_read();
$nowMs = (int) round(microtime(true) * 1000);
$forceFull = in_array('--full', $argv, true);
$full = $forceFull || $current === null || $nowMs - (int) ($current['fullAt'] ?? 0) > DASHIT_FULL_EVERY;

if (!$full) {
    $newest = dashit_catalog_newest($account);
    if ($newest === null) {
        out('Firestore did not answer; keeping the file.');
        exit(1);
    }
    if ($newest <= (int) $current['version']) {
        out('Up to date (version ' . $current['version'] . ').');
        exit(0);
    }
    $changed = dashit_catalog_changed_since($account, (int) $current['version']);
    if ($changed === null) {
        out('Firestore did not answer; keeping the file.');
        exit(1);
    }
    $byId = [];
    foreach ($current['products'] as $entry) $byId[$entry['id']] = $entry;
    foreach ($changed as $entry) $byId[$entry['id']] = $entry;
    $products = array_values($byId);
    $fullAt = (int) ($current['fullAt'] ?? 0);
    out(count($changed) . ' changed products merged.');
} else {
    $products = dashit_catalog_everything($account);
    if ($products === null) {
        out('Firestore did not answer the full read; keeping the file.');
        exit(1);
    }
    $fullAt = $nowMs;
    out('Full read: ' . count($products) . ' products.');
}

$active = count(array_filter($products, fn ($p) => ($p['active'] ?? true) !== false));
$before = $current === null ? 0 : count(array_filter($current['products'], fn ($p) => ($p['active'] ?? true) !== false));
if ($active < 50 || ($before > 0 && $active < $before * 0.9 && !$forceFull)) {
    out("Refusing: $active products shown, was $before. Keeping the previous file (run --full to accept).");
    exit(1);
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
    out('Could not encode the file; keeping the previous one.');
    exit(1);
}

$tmp = dashit_catalog_path() . '.tmp';
if (file_put_contents($tmp, $json) === false || !rename($tmp, dashit_catalog_path())) {
    out("Could not write the file in $dir.");
    exit(1);
}
@chmod(dashit_catalog_path(), 0644);
file_put_contents("$dir/catalog-status.json", json_encode([
    'version' => $version, 'builtAt' => $nowMs, 'fullAt' => $fullAt, 'count' => $active,
    'bytes' => strlen($json),
]));
out("Wrote catalog.json: $active products, version $version, " . round(strlen($json) / 1024) . ' KB.');
