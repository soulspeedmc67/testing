<?php
/*
 * POST { "mobile": "9876543210" }
 *   -> 200 { "configured": false }                       2Factor isn't set up: signing in with a number is off
 *   -> 200 { "configured": true, "sent": true, "ticket": "...", "resend_after": 30 }
 *   -> 400 / 429 { "error" }
 *
 * Texts a 6-digit code to a number that wants to sign in with the number
 * alone (no Google or Apple account). Nobody is signed in yet, so the limits
 * per network address are tighter here than in send-otp.php; the limits per
 * number and per day in _otp.php apply as well.
 */
require __DIR__ . '/_otp.php';

dashit_only_post();
dashit_rate_limit('number-code', 6);
dashit_rate_limit('number-code-day', 15, 86400);
$body = dashit_json_body();

$config = dashit_otp_config();
if ($config['api_key'] === '') {
    dashit_respond(200, ['configured' => false]);
}
$account = dashit_firebase_service_account();
if ($account === null) {
    dashit_respond(503, ['error' => DASHIT_NOT_SET_UP]);
}
$mobile = dashit_normalized_mobile($body['mobile'] ?? null);
if ($mobile === null) {
    dashit_respond(400, ['error' => 'Enter a valid 10-digit mobile number.']);
}

$problem = dashit_otp_count_send($config, $mobile, null);
if ($problem !== null) {
    dashit_otp_refuse($problem);
}
$session = dashit_otp_text_code($config, $mobile);

dashit_respond(200, [
    'configured' => true,
    'sent' => true,
    'ticket' => dashit_otp_ticket($account, DASHIT_OTP_NUMBER_SIGN_IN, $mobile, $session),
    'resend_after' => DASHIT_OTP_RESEND_AFTER,
]);
