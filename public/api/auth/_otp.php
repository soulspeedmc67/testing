<?php
/*
 * Shared helpers for the mobile-number check (send-otp.php, verify-otp.php).
 *
 * A shopper signs in with Google or Apple, then gives the mobile number the
 * delivery person can call. When 2Factor (2factor.in) is set up, that number is
 * checked with an SMS code first; until then the apps simply save the number.
 *
 *   send-otp.php    asks 2Factor to text a code to the number.
 *   verify-otp.php  checks the code with 2Factor and, if right, marks the
 *                   number as verified on the shopper's profile.
 *
 * Both need the shopper's Firebase ID token, so only a signed-in shopper can
 * ask, and the number is checked for THAT account. Secrets live OUTSIDE the
 * website folder, next to Razorpay's, so they are never downloadable:
 *
 *   domains/dashit.co.in/dashit-secrets/sign-in.php
 *
 *     <?php return [
 *         'twofactor_api_key' => '...',     // 2factor.in dashboard > API key
 *         'twofactor_template' => '',       // optional: the approved SMS template name
 *         'otp_daily_cap' => 400,           // most codes sent per day, in all
 *     ];
 *
 *   domains/dashit.co.in/dashit-secrets/firebase-service-account.json
 *
 * Costs are bounded: each code is an SMS the shop pays for, so every layer
 * below limits it (per network address, per account, per number, per day in
 * all). Counts are kept in domains/dashit.co.in/dashit-data/otp/.
 */

require_once __DIR__ . '/../_firebase.php';

const DASHIT_OTP_LIFETIME = 600;        // a code works for 10 minutes
const DASHIT_OTP_RESEND_AFTER = 30;     // seconds before the same account can ask again
const DASHIT_OTP_SENDS_PER_ACCOUNT = 5; // codes per account per hour
const DASHIT_OTP_SENDS_PER_NUMBER = 5;  // codes per number per hour
const DASHIT_OTP_SENDS_PER_NUMBER_DAY = 8;
const DASHIT_OTP_WRONG_TRIES = 5;       // wrong guesses before a code stops working
const DASHIT_NOT_SET_UP = "Verifying numbers isn't set up on the server yet. Please try again later.";

function dashit_otp_config(): array
{
    $file = dashit_private_dir('dashit-secrets') . '/sign-in.php';
    $saved = is_file($file) ? include $file : [];
    $saved = is_array($saved) ? $saved : [];
    $pick = function (string $env, string $key, string $default = '') use ($saved): string {
        $value = getenv($env);
        if ($value !== false && $value !== '') {
            return trim($value);
        }
        return isset($saved[$key]) && is_string($saved[$key]) ? trim($saved[$key]) : $default;
    };
    $cap = $saved['otp_daily_cap'] ?? 400;
    return [
        'api_key' => $pick('TWOFACTOR_API_KEY', 'twofactor_api_key'),
        'template' => $pick('TWOFACTOR_TEMPLATE', 'twofactor_template'),
        'daily_cap' => is_int($cap) && $cap > 0 ? $cap : 400,
    ];
}

/** Ten digits starting 6-9, or null. */
function dashit_normalized_mobile($input): ?string
{
    if (!is_string($input) && !is_int($input)) {
        return null;
    }
    $digits = substr(preg_replace('/\D/', '', (string) $input), -10);
    return preg_match('/^[6-9]\d{9}$/', $digits) ? $digits : null;
}

/** The signed-in shopper's ID token checked: [service account, claims]. Answers and stops if not valid. */
function dashit_otp_caller(array $body): array
{
    $account = dashit_firebase_service_account();
    if ($account === null) {
        dashit_respond(503, ['error' => DASHIT_NOT_SET_UP]);
    }
    $token = is_string($body['id_token'] ?? null) ? $body['id_token'] : '';
    $claims = $token === '' ? null : dashit_verify_id_token($account, $token);
    $provider = is_array($claims) ? ($claims['firebase']['sign_in_provider'] ?? '') : '';
    if ($claims === null || !in_array($provider, ['google.com', 'apple.com'], true)) {
        dashit_respond(401, ['error' => 'Please sign in with Google or Apple first.']);
    }
    return [$account, $claims];
}

/** What a ticket is signed with: derived from the service account, so there is nothing more to keep secret. */
function dashit_otp_secret(array $account): string
{
    return hash('sha256', 'dashit-otp|' . (string) ($account['private_key'] ?? ''));
}

/** Ties a sent code to the account and number it was sent for. */
function dashit_otp_ticket(array $account, string $uid, string $mobile, string $session): string
{
    $payload = dashit_base64url(json_encode(['u' => $uid, 'm' => $mobile, 's' => $session, 'e' => time() + DASHIT_OTP_LIFETIME]));
    return $payload . '.' . dashit_base64url(hash_hmac('sha256', $payload, dashit_otp_secret($account), true));
}

/** The ticket's contents if it is genuine and not expired, else null. */
function dashit_otp_open_ticket(array $account, string $ticket): ?array
{
    $parts = explode('.', $ticket);
    if (count($parts) !== 2) {
        return null;
    }
    $expected = dashit_base64url(hash_hmac('sha256', $parts[0], dashit_otp_secret($account), true));
    if (!hash_equals($expected, $parts[1])) {
        return null;
    }
    $data = json_decode(dashit_base64url_decode($parts[0]), true);
    if (!is_array($data) || (int) ($data['e'] ?? 0) < time()) {
        return null;
    }
    return $data;
}

/** Calls 2Factor; returns the decoded reply, or null if it didn't answer. */
function dashit_twofactor(string $path): ?array
{
    $curl = curl_init('https://2factor.in/API/V1/' . $path);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 15,
    ]);
    $raw = curl_exec($curl);
    curl_close($curl);
    $reply = $raw === false ? null : json_decode($raw, true);
    return is_array($reply) ? $reply : null;
}

/**
 * Runs $work($dir) with the store locked, so two requests at once can't both
 * slip under a limit. $work returns a value rather than responding: exiting
 * inside it would skip the unlock.
 */
function dashit_otp_store(callable $work)
{
    $dir = getenv('OTP_DATA_DIR') ?: dashit_private_dir('dashit-data') . '/otp';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        error_log("DASHit otp: can't create $dir.");
        dashit_respond(503, ['error' => DASHIT_NOT_SET_UP]);
    }
    $lock = fopen("$dir/.lock", 'c');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        dashit_respond(503, ['error' => 'This is busy. Please try again in a moment.']);
    }
    try {
        if (random_int(1, 50) === 1) {
            foreach (glob("$dir/*.json") ?: [] as $old) {
                if (filemtime($old) < time() - 2 * 86400) {
                    @unlink($old);
                }
            }
        }
        return $work($dir);
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function dashit_otp_record(string $dir, string $kind, string $key): string
{
    return "$dir/$kind-" . hash('sha256', $key) . '.json';
}

function dashit_otp_read(string $path): array
{
    $data = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;
    return is_array($data) ? $data : [];
}

function dashit_otp_write(string $path, array $data): void
{
    file_put_contents("$path.tmp", json_encode($data));
    rename("$path.tmp", $path);
}

/** The timestamps from the last $seconds. */
function dashit_otp_recent(array $times, int $now, int $seconds): array
{
    return array_values(array_filter($times, fn ($time) => is_int($time) && $time > $now - $seconds));
}
