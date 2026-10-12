<?php
/*
 * POST { "mobile": "9876543210", "otp": "123456", "ticket": "..." }
 *   -> 200 { "token": "<Firebase custom token>", "uid": "ph-919876543210", "mobile": "9876543210" }
 *   -> 400 / 429 { "error" }
 *
 * Checks the code number-code.php sent. The right code returns a Firebase
 * custom token for the number's account, which the app signs in with. One
 * number is one account on every phone, and the token carries the number as
 * the `mobile` claim, which firestore.rules take as a shopper's sign-in.
 */
require __DIR__ . '/_otp.php';

dashit_only_post();
dashit_rate_limit('number-sign-in', 30);
$body = dashit_json_body();

$config = dashit_otp_config();
$account = dashit_firebase_service_account();
if ($config['api_key'] === '' || $account === null) {
    dashit_respond(503, ['error' => DASHIT_NOT_SET_UP]);
}
$mobile = dashit_normalized_mobile($body['mobile'] ?? null);
$otp = is_string($body['otp'] ?? null) ? preg_replace('/\D/', '', $body['otp']) : '';
if ($mobile === null || strlen($otp) < 4 || strlen($otp) > 8) {
    dashit_respond(400, ['error' => 'Enter the code from the text message.']);
}
$ticket = is_string($body['ticket'] ?? null) ? dashit_otp_open_ticket($account, $body['ticket']) : null;
if ($ticket === null || ($ticket['u'] ?? '') !== DASHIT_OTP_NUMBER_SIGN_IN || ($ticket['m'] ?? '') !== $mobile) {
    dashit_respond(400, ['error' => 'That code has expired. Ask for a new one.']);
}
if (!dashit_otp_code_matches($config, (string) $ticket['s'], $otp)) {
    dashit_respond(400, ['error' => "That code isn't right. Check the text message and try again."]);
}

$uid = 'ph-91' . $mobile;
$token = dashit_firebase_custom_token($account, $uid, ['mobile' => $mobile]);
if ($token === null) {
    dashit_respond(503, ['error' => DASHIT_NOT_SET_UP]);
}
// The number on the profile, marked confirmed. The app can sign in without
// it (it writes the profile itself), so a failed write here is only logged.
dashit_firestore_merge($account, "users/$uid", [
    'uid' => $uid,
    'mobile' => $mobile,
    'mobileVerified' => true,
    'mobileVerifiedAt' => new DateTimeImmutable(),
    'updatedAt' => new DateTimeImmutable(),
]);
dashit_respond(200, ['token' => $token, 'uid' => $uid, 'mobile' => $mobile]);
