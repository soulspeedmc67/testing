<?php
/*
 * Shared helpers for DASHit's sign-in endpoints. Shoppers sign in with their
 * phone number only:
 *
 *   send-code.php    sends a 6-digit code to the number on WhatsApp.
 *   verify-code.php  given the right code, returns a Firebase custom token for
 *                    the number's account.
 *
 * The apps sign in to Firebase with that token, so every customer account is a
 * number its owner has proved they hold. One number is one account (uid
 * "ph-91XXXXXXXXXX") on every phone, and the token carries the number as the
 * `mobile` claim, which firestore.rules checks.
 *
 * Secrets live OUTSIDE the website folder, next to Razorpay's, so they are
 * never downloadable (docs/whatsapp-otp-setup.md has the steps):
 *
 *   domains/dashit.co.in/dashit-secrets/sign-in.php
 *
 *     <?php return [
 *         'whatsapp_token' => 'EAAG...',            // permanent system-user token
 *         'whatsapp_phone_number_id' => '1234...',
 *         'whatsapp_template' => 'dashit_auth_otp',
 *         'whatsapp_language' => 'en_US',
 *         // App Review only: this number is sent nothing and its code is fixed.
 *         'review_mobile' => '',
 *         'review_code' => '',
 *     ];
 *
 *   domains/dashit.co.in/dashit-secrets/firebase-service-account.json
 *     Firebase console > Project settings > Service accounts > Generate new private key.
 *
 * Codes waiting to be used, and how many were sent, are kept in
 * domains/dashit.co.in/dashit-data/sign-in/ (made on first use). Only a salted
 * hash of each code is stored. Environment variables override the files, for
 * testing on a computer.
 */

require_once __DIR__ . '/../_firebase.php';

const DASHIT_CODE_LIFETIME = 600;       // a code works for 10 minutes
const DASHIT_RESEND_AFTER = 30;         // seconds before the same number can ask again
const DASHIT_SENDS_PER_NUMBER = 5;      // codes per number per hour
const DASHIT_SENDS_PER_NUMBER_DAY = 10; // codes per number per day
const DASHIT_SENDS_PER_IP = 20;         // codes per network address per hour
const DASHIT_WRONG_TRIES = 5;           // wrong guesses before a code stops working
const DASHIT_CHECKS_PER_IP = 60;        // codes checked per network address per hour

const DASHIT_NOT_SET_UP = "Signing in isn't set up on the server yet. Please try again later.";

function dashit_sign_in_config(): array
{
    $file = dashit_private_dir('dashit-secrets') . '/sign-in.php';
    $saved = is_file($file) ? include $file : [];
    $saved = is_array($saved) ? $saved : [];
    $pick = function (string $env, string $key, string $default = '') use ($saved): string {
        $value = getenv($env);
        if ($value !== false && $value !== '') {
            return trim($value);
        }
        return trim((string) ($saved[$key] ?? $default));
    };
    return [
        'whatsapp_token' => $pick('WHATSAPP_TOKEN', 'whatsapp_token'),
        'whatsapp_phone_number_id' => $pick('WHATSAPP_PHONE_NUMBER_ID', 'whatsapp_phone_number_id'),
        'whatsapp_template' => $pick('WHATSAPP_TEMPLATE', 'whatsapp_template', 'dashit_auth_otp'),
        'whatsapp_language' => $pick('WHATSAPP_LANGUAGE', 'whatsapp_language', 'en_US'),
        'whatsapp_api' => $pick('WHATSAPP_API', 'whatsapp_api', 'https://graph.facebook.com/v23.0'),
        'review_mobile' => $pick('SIGN_IN_REVIEW_MOBILE', 'review_mobile'),
        'review_code' => $pick('SIGN_IN_REVIEW_CODE', 'review_code'),
        // Caps what a flood of requests can cost in WhatsApp messages.
        'daily_limit' => (int) $pick('SIGN_IN_DAILY_LIMIT', 'daily_limit', '500'),
    ];
}

/** 10 digits starting 6–9 (an Indian mobile), the same rule as the apps; null otherwise. */
function dashit_normalized_mobile($input): ?string
{
    if (!is_string($input) && !is_int($input)) {
        return null;
    }
    $digits = preg_replace('/\D/', '', (string) $input);
    if (strlen($digits) === 12 && substr($digits, 0, 2) === '91') {
        $digits = substr($digits, 2);
    }
    return preg_match('/^[6-9]\d{9}$/', $digits) ? $digits : null;
}

/** App Review's demo number: it is sent nothing and signs in with the fixed code. */
function dashit_is_review_mobile(array $config, string $mobile): bool
{
    return dashit_normalized_mobile($config['review_mobile']) === $mobile
        && preg_match('/^\d{6}$/', $config['review_code']) === 1;
}

/** Every number has exactly one account, whichever phone it signs in from. */
function dashit_uid_for(string $mobile): string
{
    return 'ph-91' . $mobile;
}

/** The Firebase service account that signs sign-in tokens, or a 503 if it isn't there. */
function dashit_service_account(): array
{
    $account = dashit_firebase_service_account();
    if ($account === null) {
        dashit_respond(503, ['error' => DASHIT_NOT_SET_UP]);
    }
    return $account;
}

/**
 * A Firebase custom token: a JWT signed (RS256) with the service account's
 * key, which the apps exchange for a session with signInWithCustomToken.
 * https://firebase.google.com/docs/auth/admin/create-custom-tokens
 */
function dashit_firebase_custom_token(array $account, string $uid, array $claims): string
{
    $now = time();
    $token = dashit_signed_jwt($account, [
        'iss' => $account['client_email'],
        'sub' => $account['client_email'],
        'aud' => 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
        'iat' => $now,
        'exp' => $now + 3600,
        'uid' => $uid,
        'claims' => $claims,
    ]);
    if ($token === null) {
        dashit_respond(503, ['error' => DASHIT_NOT_SET_UP]);
    }
    return $token;
}

function dashit_code_hash(string $code, string $salt): string
{
    return hash_hmac('sha256', $code, $salt);
}

/**
 * Runs $work($dir) with the sign-in store locked, so two requests at once
 * can't both slip under a limit. $work returns a value instead of responding:
 * exiting inside it would skip the unlock.
 */
function dashit_with_store(callable $work)
{
    $dir = getenv('SIGN_IN_DATA_DIR') ?: dashit_private_dir('dashit-data') . '/sign-in';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        error_log("DASHit sign-in: can't create $dir.");
        dashit_respond(503, ['error' => DASHIT_NOT_SET_UP]);
    }
    $lock = fopen("$dir/.lock", 'c');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        dashit_respond(503, ['error' => "Signing in is busy. Please try again."]);
    }
    try {
        if (random_int(1, 50) === 1) {
            dashit_forget_old_records($dir);
        }
        return $work($dir);
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

/** One small JSON file per number, network address and day. */
function dashit_record_path(string $dir, string $kind, string $key): string
{
    return "$dir/$kind-" . hash('sha256', $key) . '.json';
}

function dashit_read_record(string $path): array
{
    $data = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;
    return is_array($data) ? $data : [];
}

function dashit_write_record(string $path, array $data): void
{
    file_put_contents("$path.tmp", json_encode($data));
    rename("$path.tmp", $path);
}

/** The timestamps from the last $seconds. */
function dashit_recent(array $times, int $now, int $seconds): array
{
    return array_values(array_filter($times, fn ($time) => is_int($time) && $time > $now - $seconds));
}

/** Nothing in the store matters after a day; clear out what's older than two. */
function dashit_forget_old_records(string $dir): void
{
    foreach (glob("$dir/*.json") ?: [] as $file) {
        if (filemtime($file) < time() - 2 * 86400) {
            @unlink($file);
        }
    }
}

/**
 * Sends the code with the approved WhatsApp authentication template (its body
 * shows the code and its "Copy code" button copies it). Returns null once
 * WhatsApp accepts the message, or WhatsApp's reason for refusing it.
 */
function dashit_send_whatsapp_code(array $config, string $mobile, string $code): ?string
{
    $url = rtrim($config['whatsapp_api'], '/') . '/' . rawurlencode($config['whatsapp_phone_number_id']) . '/messages';
    $message = [
        'messaging_product' => 'whatsapp',
        'recipient_type' => 'individual',
        'to' => '91' . $mobile,
        'type' => 'template',
        'template' => [
            'name' => $config['whatsapp_template'],
            'language' => ['code' => $config['whatsapp_language']],
            'components' => [
                ['type' => 'body', 'parameters' => [['type' => 'text', 'text' => $code]]],
                ['type' => 'button', 'sub_type' => 'url', 'index' => '0', 'parameters' => [['type' => 'text', 'text' => $code]]],
            ],
        ],
    ];
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $config['whatsapp_token'], 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($message),
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20,
    ]);
    $raw = curl_exec($curl);
    $status = $raw === false ? 0 : (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    $reply = $raw === false ? null : json_decode($raw, true);
    if ($status >= 200 && $status < 300 && !empty($reply['messages'][0]['id'])) {
        return null;
    }
    if ($status === 0) {
        return 'no answer from WhatsApp';
    }
    return (string) ($reply['error']['message'] ?? "WhatsApp answered HTTP $status");
}
