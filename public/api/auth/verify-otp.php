<?php
/*
 * POST { "id_token": "...", "mobile": "9876543210", "otp": "123456", "ticket": "..." }
 *   -> 200 { "verified": true, "mobile": "9876543210" }
 *   -> 400 / 401 / 429 { "error" }
 *
 * Checks the code with 2Factor. If it is right, the number is saved on the
 * shopper's profile as verified (mobileVerified), written from here with the
 * service account: the apps cannot mark a number verified themselves
 * (firestore.rules).
 */
require __DIR__ . '/_otp.php';

dashit_only_post();
dashit_rate_limit('verify-otp', 60);
$body = dashit_json_body();

$config = dashit_otp_config();
if ($config['api_key'] === '') {
    dashit_respond(503, ['error' => DASHIT_NOT_SET_UP]);
}

[$account, $claims] = dashit_otp_caller($body);
$uid = (string) $claims['sub'];
$mobile = dashit_normalized_mobile($body['mobile'] ?? null);
$otp = is_string($body['otp'] ?? null) ? preg_replace('/\D/', '', $body['otp']) : '';
if ($mobile === null || strlen($otp) < 4 || strlen($otp) > 8) {
    dashit_respond(400, ['error' => 'Enter the code from the text message.']);
}
$ticket = is_string($body['ticket'] ?? null) ? dashit_otp_open_ticket($account, $body['ticket']) : null;
if ($ticket === null || ($ticket['u'] ?? '') !== $uid || ($ticket['m'] ?? '') !== $mobile) {
    dashit_respond(400, ['error' => 'That code has expired. Ask for a new one.']);
}
$session = (string) $ticket['s'];

// A code gets a few wrong guesses and works once.
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

if (!$matched) {
    dashit_respond(400, ['error' => "That code isn't right. Check the text message and try again."]);
}

$saved = dashit_firestore_merge($account, "users/$uid", [
    'mobile' => $mobile,
    'mobileVerified' => true,
    'mobileVerifiedAt' => new DateTimeImmutable(),
    'updatedAt' => new DateTimeImmutable(),
]);
if (!$saved) {
    dashit_respond(500, ['error' => "The number was right but we couldn't save it. Please try again."]);
}
dashit_respond(200, ['verified' => true, 'mobile' => $mobile]);
