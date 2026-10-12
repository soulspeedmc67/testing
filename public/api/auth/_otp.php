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
 * ask, and the number is checked for THAT account.
 *
 * A shopper can also sign in with the number alone, with no Google or Apple
 * account:
 *
 *   number-code.php     texts a code to the number (nobody is signed in yet).
 *   number-sign-in.php  given the right code, returns a Firebase custom token
 *                       for the number's account ("ph-91XXXXXXXXXX").
 *
 * Secrets live OUTSIDE the
 * website folder, next to Razorpay's, so they are never downloadable:
 *
 *   domains/dashit.co.in/dashit-secrets/sign-in.php
 *
 *     <?php return [
 *         'twofactor_api_key' => '...',     // 2factor.in dashboard > API key
 *         'twofactor_template' => '...',    // the approved SMS template's name; without it nothing is sent
 *         'otp_daily_cap' => 400,           // most codes sent per day, in all
 *         'send_codes' => true,             // codes are sent only with this line
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
/** Who a ticket is for when the code signs the number itself in: no account exists yet. */
const DASHIT_OTP_NUMBER_SIGN_IN = 'number-sign-in';
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
    $template = $pick('TWOFACTOR_TEMPLATE', 'twofactor_template');
    // Codes are OFF unless sign-in.php says 'send_codes' => true (or
    // TWOFACTOR_SEND_CODES=1 when testing). On 12 Oct 2026 2Factor delivered
    // every code as a phone call, not a text, whatever template was named;
    // the shop wants texts only, so nothing is sent until that is sorted out
    // with 2Factor. A template name is needed as well: with none, 2Factor calls.
    $on = ($saved['send_codes'] ?? false) === true || getenv('TWOFACTOR_SEND_CODES') === '1';
    return [
        'api_key' => !$on || $template === '' ? '' : $pick('TWOFACTOR_API_KEY', 'twofactor_api_key'),
        'template' => $template,
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
    // TWOFACTOR_API stands in for 2Factor when testing on a computer; never set on the server.
    $curl = curl_init((getenv('TWOFACTOR_API') ?: 'https://2factor.in/API/V1') . '/' . $path);
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

/**
 * Counts one more code for $mobile against every limit. Null if it may be
 * sent; otherwise ['wait', seconds] or ['429', message]. $uid is the signed-in
 * account asking, or null when the number itself is signing in (then the wait
 * between codes is kept per number).
 */
function dashit_otp_count_send(array $config, string $mobile, ?string $uid): ?array
{
    $now = time();
    return dashit_otp_store(function (string $dir) use ($config, $mobile, $uid, $now) {
        $byAccount = $uid === null ? null : dashit_otp_record($dir, 'uid', $uid);
        $byNumber = dashit_otp_record($dir, 'num', $mobile);
        $today = dashit_otp_record($dir, 'day', gmdate('Y-m-d'));

        $numberTimes = dashit_otp_read($byNumber);
        $accountTimes = $byAccount === null ? [] : dashit_otp_recent(dashit_otp_read($byAccount), $now, 3600);
        $lastTimes = $byAccount === null ? dashit_otp_recent($numberTimes, $now, 3600) : $accountTimes;
        if ($lastTimes && max($lastTimes) > $now - DASHIT_OTP_RESEND_AFTER) {
            return ['wait', DASHIT_OTP_RESEND_AFTER - ($now - max($lastTimes))];
        }
        if (count($accountTimes) >= DASHIT_OTP_SENDS_PER_ACCOUNT) {
            return ['429', 'Too many codes requested. Please try again in an hour.'];
        }
        if (count(dashit_otp_recent($numberTimes, $now, 3600)) >= DASHIT_OTP_SENDS_PER_NUMBER
            || count(dashit_otp_recent($numberTimes, $now, 86400)) >= DASHIT_OTP_SENDS_PER_NUMBER_DAY) {
            return ['429', 'Too many codes were sent to this number. Please try again later.'];
        }
        $sentToday = (int) (dashit_otp_read($today)['sent'] ?? 0);
        if ($sentToday >= $config['daily_cap']) {
            error_log('DASHit otp: the daily cap of ' . $config['daily_cap'] . ' codes was reached.');
            return ['429', 'Verifying numbers is busy right now. Please try again tomorrow.'];
        }
        // Counted before sending, so a flood of slow requests can't all get through.
        if ($byAccount !== null) {
            $accountTimes[] = $now;
            dashit_otp_write($byAccount, $accountTimes);
        }
        $numberTimes[] = $now;
        dashit_otp_write($byNumber, dashit_otp_recent($numberTimes, $now, 86400));
        dashit_otp_write($today, ['sent' => $sentToday + 1]);
        return null;
    });
}

/** Answers 429 with what dashit_otp_count_send found, and stops. */
function dashit_otp_refuse(array $problem): void
{
    if ($problem[0] === 'wait') {
        dashit_respond(429, ['error' => 'Please wait a moment before asking for another code.', 'retry_after' => max(1, (int) $problem[1])]);
    }
    dashit_respond(429, ['error' => $problem[1], 'retry_after' => 3600]);
}

/** Texts a code to the number through 2Factor and returns its session id. Answers 502 and stops if it wasn't sent. */
function dashit_otp_text_code(array $config, string $mobile): string
{
    $template = $config['template'] !== '' ? '/' . rawurlencode($config['template']) : '';
    // The number in international form with its "+", as 2Factor's own examples send it.
    $reply = dashit_twofactor(rawurlencode($config['api_key']) . "/SMS/+91$mobile/AUTOGEN$template");
    if (!is_array($reply) || ($reply['Status'] ?? '') !== 'Success' || empty($reply['Details'])) {
        error_log('DASHit otp: 2Factor refused a send: ' . json_encode($reply));
        dashit_respond(502, ['error' => "We couldn't send the code just now. Please try again in a minute."]);
    }
    return (string) $reply['Details'];
}

/**
 * Whether $otp is the code 2Factor sent in $session. A code gets a few wrong
 * guesses and works once: after that this answers 400 and stops.
 */
function dashit_otp_code_matches(array $config, string $session, string $otp): bool
{
    $blocked = dashit_otp_store(function (string $dir) use ($session) {
        $state = dashit_otp_read(dashit_otp_record($dir, 'try', $session));
        return !empty($state['used']) || (int) ($state['wrong'] ?? 0) >= DASHIT_OTP_WRONG_TRIES;
    });
    if ($blocked) {
        dashit_respond(400, ['error' => 'That code is no longer valid. Ask for a new one.']);
    }

    $reply = dashit_twofactor(rawurlencode($config['api_key']) . '/SMS/VERIFY/' . rawurlencode($session) . '/' . rawurlencode($otp));
    $matched = is_array($reply) && ($reply['Status'] ?? '') === 'Success';

    dashit_otp_store(function (string $dir) use ($session, $matched) {
        $path = dashit_otp_record($dir, 'try', $session);
        $state = dashit_otp_read($path);
        if ($matched) {
            $state['used'] = true;
        } else {
            $state['wrong'] = (int) ($state['wrong'] ?? 0) + 1;
        }
        dashit_otp_write($path, $state);
        return null;
    });
    return $matched;
}
