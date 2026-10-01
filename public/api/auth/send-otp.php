<?php
/*
 * POST { "id_token": "<Firebase ID token>", "mobile": "9876543210" }
 *   -> 200 { "configured": false }                       2Factor isn't set up: the app just saves the number
 *   -> 200 { "configured": true, "sent": true, "ticket": "...", "resend_after": 30 }
 *   -> 400 / 401 / 429 { "error" }
 *
 * Texts a 6-digit code to the number through 2Factor. See _otp.php for the
 * limits that keep this from running up a bill.
 */
require __DIR__ . '/_otp.php';

dashit_only_post();
dashit_rate_limit('send-otp', 20);
$body = dashit_json_body();

$config = dashit_otp_config();
if ($config['api_key'] === '') {
    dashit_respond(200, ['configured' => false]);
}

[$account, $claims] = dashit_otp_caller($body);
$uid = (string) $claims['sub'];
$mobile = dashit_normalized_mobile($body['mobile'] ?? null);
if ($mobile === null) {
    dashit_respond(400, ['error' => 'Enter a valid 10-digit mobile number.']);
}

$now = time();
$problem = dashit_otp_store(function (string $dir) use ($uid, $mobile, $now, $config) {
    $byAccount = dashit_otp_record($dir, 'uid', $uid);
    $byNumber = dashit_otp_record($dir, 'num', $mobile);
    $today = dashit_otp_record($dir, 'day', gmdate('Y-m-d'));

    $accountTimes = dashit_otp_recent(dashit_otp_read($byAccount), $now, 3600);
    if ($accountTimes && max($accountTimes) > $now - DASHIT_OTP_RESEND_AFTER) {
        return ['wait', DASHIT_OTP_RESEND_AFTER - ($now - max($accountTimes))];
    }
    if (count($accountTimes) >= DASHIT_OTP_SENDS_PER_ACCOUNT) {
        return ['429', 'Too many codes requested. Please try again in an hour.'];
    }
    $numberTimes = dashit_otp_read($byNumber);
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
    $accountTimes[] = $now;
    dashit_otp_write($byAccount, $accountTimes);
    $numberTimes[] = $now;
    dashit_otp_write($byNumber, dashit_otp_recent($numberTimes, $now, 86400));
    dashit_otp_write($today, ['sent' => $sentToday + 1]);
    return null;
});
if ($problem !== null) {
    if ($problem[0] === 'wait') {
        dashit_respond(429, ['error' => 'Please wait a moment before asking for another code.', 'retry_after' => max(1, (int) $problem[1])]);
    }
    dashit_respond(429, ['error' => $problem[1], 'retry_after' => 3600]);
}

$template = $config['template'] !== '' ? '/' . rawurlencode($config['template']) : '';
$reply = dashit_twofactor(rawurlencode($config['api_key']) . "/SMS/91$mobile/AUTOGEN$template");
if (!is_array($reply) || ($reply['Status'] ?? '') !== 'Success' || empty($reply['Details'])) {
    error_log('DASHit otp: 2Factor refused a send: ' . json_encode($reply));
    dashit_respond(502, ['error' => "We couldn't send the code just now. Please try again in a minute."]);
}

dashit_respond(200, [
    'configured' => true,
    'sent' => true,
    'ticket' => dashit_otp_ticket($account, $uid, $mobile, (string) $reply['Details']),
    'resend_after' => DASHIT_OTP_RESEND_AFTER,
]);
