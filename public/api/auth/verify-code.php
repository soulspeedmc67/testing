<?php
/*
 * POST { "mobile": "9876543210", "code": "123456" }
 *   -> 200 { "token": "<Firebase custom token>", "uid": "ph-919876543210" }
 *   -> 400 { "error" }  a wrong, used or expired code
 *
 * Checks the code send-code.php sent. The right code returns a Firebase custom
 * token for the number's account, which the app signs in with. A code works
 * once, for 10 minutes, and stops after 5 wrong tries. See _sign-in.php.
 */
require __DIR__ . '/_sign-in.php';

dashit_only_post();
// Each code already stops after 5 wrong tries; this stops one network
// guessing across many numbers' codes at once.
dashit_rate_limit('verify-code', DASHIT_CHECKS_PER_IP);
$body = dashit_json_body();

$mobile = dashit_normalized_mobile($body['mobile'] ?? null);
if ($mobile === null) {
    dashit_respond(400, ['error' => 'Enter a valid 10-digit mobile number.']);
}
$code = is_string($body['code'] ?? null) ? preg_replace('/\D/', '', $body['code']) : '';
if (strlen($code) !== 6) {
    dashit_respond(400, ['error' => 'Enter the 6-digit code from WhatsApp.']);
}

// Loaded before the code is used up, so a missing key doesn't waste it.
$account = dashit_service_account();
$now = time();

$result = dashit_with_store(function (string $dir) use ($mobile, $code, $now) {
    $path = dashit_record_path($dir, 'number', $mobile);
    $number = dashit_read_record($path);
    $pending = $number['code'] ?? null;
    if (!is_array($pending)) {
        return 'none';
    }
    if ((int) $pending['expires_at'] < $now) {
        unset($number['code']);
        dashit_write_record($path, $number);
        return 'expired';
    }
    if (!hash_equals((string) $pending['hash'], dashit_code_hash($code, (string) $pending['salt']))) {
        $pending['wrong'] = (int) ($pending['wrong'] ?? 0) + 1;
        if ($pending['wrong'] >= DASHIT_WRONG_TRIES) {
            unset($number['code']);
            dashit_write_record($path, $number);
            return 'locked';
        }
        $number['code'] = $pending;
        dashit_write_record($path, $number);
        return 'wrong';
    }
    unset($number['code']);
    dashit_write_record($path, $number);
    return 'right';
});

if ($result !== 'right') {
    dashit_respond(400, ['error' => [
        'none' => 'That code has been used or has run out. Ask for a new one.',
        'expired' => 'That code has run out. Ask for a new one.',
        'locked' => 'Too many wrong tries. Ask for a new code.',
        'wrong' => "That code isn't right. Check WhatsApp and try again.",
    ][$result]]);
}

$uid = dashit_uid_for($mobile);
dashit_respond(200, [
    'token' => dashit_firebase_custom_token($account, $uid, ['mobile' => $mobile]),
    'uid' => $uid,
]);
