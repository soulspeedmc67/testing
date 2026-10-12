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

$problem = dashit_otp_count_send($config, $mobile, $uid);
if ($problem !== null) {
    dashit_otp_refuse($problem);
}
$session = dashit_otp_text_code($config, $mobile);

dashit_respond(200, [
    'configured' => true,
    'sent' => true,
    'ticket' => dashit_otp_ticket($account, $uid, $mobile, $session),
    'resend_after' => DASHIT_OTP_RESEND_AFTER,
]);
