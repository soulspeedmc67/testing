<?php
/*
 * JSON-over-POST helpers shared by the small PHP endpoints under /api/
 * (razorpay/ and auth/), which run on the Hostinger site next to the static
 * website. Files whose names start with "_" are included by the endpoints and
 * never served on their own (see api/.htaccess).
 */

function dashit_respond(int $status, array $data): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** POST only. The apps call these natively; the site origin is allowed too. */
function dashit_only_post(): void
{
    header('Access-Control-Allow-Origin: https://dashit.co.in');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
    if ($method !== 'POST') {
        dashit_respond(405, ['error' => 'Use POST.']);
    }
}

function dashit_json_body(): array
{
    $data = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($data)) {
        dashit_respond(400, ['error' => 'Send a JSON body.']);
    }
    return $data;
}

/** A folder beside public_html (never inside it), such as dashit-secrets. */
function dashit_private_dir(string $name): string
{
    $root = rtrim($_SERVER['DOCUMENT_ROOT'] ?? __DIR__, '/');
    return dirname($root) . '/' . $name;
}

/**
 * The caller's network address. An IPv6 address is counted by its /64, the
 * block one home or phone connection is given, so stepping through the
 * addresses in it doesn't get round a limit.
 *
 * Behind Hostinger CDN, REMOTE_ADDR is already the visitor's address: the
 * hosting server trusts the CDN and applies its forwarded address before PHP
 * runs. Don't read X-Forwarded-For or X-Real-IP here instead; a caller can
 * write those on a request that doesn't come through the CDN.
 */
function dashit_client_ip(): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $packed = @inet_pton($ip);
    if ($packed !== false && strlen($packed) === 16) {
        return inet_ntop(substr($packed, 0, 8) . str_repeat("\0", 8)) . '/64';
    }
    return $ip;
}

/**
 * Answers 429 once this network address has made $limit requests to $bucket
 * in the last $window seconds. Counts are kept in dashit-data/rate/, one small
 * file per bucket and address. If that folder can't be used, requests go
 * through (and the problem is logged): a disk hiccup must not stop payments.
 */
function dashit_rate_limit(string $bucket, int $limit, int $window = 3600): void
{
    $dir = getenv('RATE_LIMIT_DIR') ?: dashit_private_dir('dashit-data') . '/rate';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        error_log("DASHit: can't create $dir, so requests aren't being rate limited.");
        return;
    }
    $file = @fopen("$dir/" . hash('sha256', $bucket . '|' . dashit_client_ip()) . '.json', 'c+');
    if ($file === false || !flock($file, LOCK_EX)) {
        error_log("DASHit: can't open a rate-limit record in $dir.");
        return;
    }
    $now = time();
    $saved = json_decode(stream_get_contents($file) ?: '', true);
    $times = array_values(array_filter(
        is_array($saved) ? $saved : [],
        fn ($time) => is_int($time) && $time > $now - $window
    ));
    $allowed = count($times) < $limit;
    if ($allowed) {
        $times[] = $now;
    }
    ftruncate($file, 0);
    rewind($file);
    fwrite($file, json_encode($times));
    fflush($file);
    flock($file, LOCK_UN);
    fclose($file);

    if (random_int(1, 200) === 1) {
        foreach (glob("$dir/*.json") ?: [] as $old) {
            if (filemtime($old) < $now - 2 * 86400) {
                @unlink($old);
            }
        }
    }
    if (!$allowed) {
        $retry = max(1, min($times) + $window - $now);
        header("Retry-After: $retry");
        dashit_respond(429, [
            'error' => 'Too many requests from this network. Please try again in a little while.',
            'retry_after' => $retry,
        ]);
    }
}
