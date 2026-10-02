<?php
/*
 * GET /api/catalog/changes.php?since=<version>
 *   -> 200 { "version": <newest version>, "products": [ ...changed entries... ] }
 *
 * What changed since the version a phone has: entries in the catalogue file
 * newer than it, plus edits made in Firestore after the file was built. The
 * Firestore part is fetched at most once every 30 seconds for everyone (kept
 * in dashit-data), and the answer may be cached by the CDN for 30 seconds, so
 * however many phones ask, Firestore is read about twice a minute.
 */

require __DIR__ . '/_catalog.php';

header('Access-Control-Allow-Origin: *');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    dashit_respond(405, ['error' => 'Use GET.']);
}
dashit_rate_limit('catalog-changes', 600);

$since = filter_var($_GET['since'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
if ($since === false || $since === null) {
    dashit_respond(400, ['error' => 'Which version?']);
}
$file = dashit_catalog_read();
if ($file === null) {
    // No file yet (the cron hasn't run): the phone keeps what it has.
    dashit_respond(503, ['error' => 'The catalogue is being prepared.']);
}
$fileVersion = (int) $file['version'];

$byId = [];
if ($since < $fileVersion) {
    foreach ($file['products'] as $entry) {
        if ((int) ($entry['updatedAt'] ?? 0) > $since) $byId[$entry['id']] = $entry;
    }
}

// Edits newer than the file, shared by everyone for 30 seconds.
$cache = dashit_private_dir('dashit-data') . '/catalog-live.json';
$live = is_file($cache) ? json_decode((string) file_get_contents($cache), true) : null;
$fresh = is_array($live) && ($live['fileVersion'] ?? -1) === $fileVersion && time() - (int) ($live['at'] ?? 0) < 30;
if (!$fresh) {
    $lock = @fopen("$cache.lock", 'c');
    if ($lock !== false && flock($lock, LOCK_EX)) {
        $live = is_file($cache) ? json_decode((string) file_get_contents($cache), true) : null;
        $fresh = is_array($live) && ($live['fileVersion'] ?? -1) === $fileVersion && time() - (int) ($live['at'] ?? 0) < 30;
        if (!$fresh) {
            $account = dashit_firebase_service_account();
            $changed = $account === null ? null : dashit_catalog_changed_since($account, $fileVersion, 500);
            $live = ['fileVersion' => $fileVersion, 'at' => time(), 'products' => $changed ?? ($live['products'] ?? [])];
            @mkdir(dirname($cache), 0700, true);
            file_put_contents("$cache.tmp", json_encode($live, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            rename("$cache.tmp", $cache);
        }
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}
foreach (($live['products'] ?? []) as $entry) {
    if ((int) ($entry['updatedAt'] ?? 0) > $since) $byId[$entry['id']] = $entry;
}

$version = max($since, $fileVersion);
foreach ($byId as $entry) $version = max($version, (int) ($entry['updatedAt'] ?? 0));

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=30, s-maxage=30');
echo json_encode(['version' => $version, 'products' => array_values($byId)], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
