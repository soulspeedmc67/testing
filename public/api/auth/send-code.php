<?php
/*
 * POST { "mobile": "9876543210" }
 *   -> 200 { "sent": true, "resend_after": 30, "expires_in": 600 }
 *   -> 429 { "error", "retry_after" }  asked too often
 *
 * Sends a 6-digit sign-in code to the number on WhatsApp. verify-code.php
 * turns the right code into a Firebase sign-in. See _sign-in.php.
 */
require __DIR__ . '/_sign-in.php';

dashit_only_post();
$body = dashit_json_body();

$mobile = dashit_normalized_mobile($body['mobile'] ?? null);
if ($mobile === null) {
    dashit_respond(400, ['error' => 'Enter a valid 10-digit mobile number.']);
}

$config = dashit_sign_in_config();
$isReview = dashit_is_review_mobile($config, $mobile);
if (!$isReview && ($config['whatsapp_token'] === '' || $config['whatsapp_phone_number_id'] === '')) {
    error_log('DASHit sign-in: the WhatsApp token or phone number id is missing from dashit-secrets/sign-in.php.');
    dashit_respond(503, ['error' => DASHIT_NOT_SET_UP]);
}
// A code that can't be turned into a sign-in is no use: check the key first.
dashit_service_account();

$code = $isReview ? $config['review_code'] : sprintf('%06d', random_int(0, 999999));
$ip = dashit_client_ip();
$now = time();

// Book the send under the lock; WhatsApp is called after the lock is released.
$booking = dashit_with_store(function (string $dir) use ($mobile, $ip, $now, $code, $config) {
    $numberPath = dashit_record_path($dir, 'number', $mobile);
    $ipPath = dashit_record_path($dir, 'ip', $ip);
    $dayPath = dashit_record_path($dir, 'day', date('Y-m-d', $now));

    $number = dashit_read_record($numberPath);
    $numberSendsToday = dashit_recent($number['sends'] ?? [], $now, 86400);
    $numberSends = dashit_recent($numberSendsToday, $now, 3600);
    $ipSends = dashit_recent(dashit_read_record($ipPath)['sends'] ?? [], $now, 3600);
    $sentToday = (int) (dashit_read_record($dayPath)['count'] ?? 0);

    if ($numberSends && $now - max($numberSends) < DASHIT_RESEND_AFTER) {
        return ['wait' => DASHIT_RESEND_AFTER - ($now - max($numberSends))];
    }
    if (count($numberSends) >= DASHIT_SENDS_PER_NUMBER) {
        return ['wait' => min($numberSends) + 3600 - $now];
    }
    if (count($numberSendsToday) >= DASHIT_SENDS_PER_NUMBER_DAY) {
        return ['wait' => min($numberSendsToday) + 86400 - $now];
    }
    if (count($ipSends) >= DASHIT_SENDS_PER_IP || $sentToday >= $config['daily_limit']) {
        return ['busy' => true];
    }

    $salt = bin2hex(random_bytes(16));
    $number['sends'] = array_merge($numberSendsToday, [$now]);
    $number['code'] = [
        'hash' => dashit_code_hash($code, $salt),
        'salt' => $salt,
        'expires_at' => $now + DASHIT_CODE_LIFETIME,
        'wrong' => 0,
    ];
    dashit_write_record($numberPath, $number);
    dashit_write_record($ipPath, ['sends' => array_merge($ipSends, [$now])]);
    dashit_write_record($dayPath, ['count' => $sentToday + 1]);
    return ['booked' => true];
});

if (isset($booking['wait'])) {
    $wait = max(1, (int) $booking['wait']);
    if ($wait <= 60) {
        $error = "Please wait $wait seconds before asking for another code.";
    } elseif ($wait <= 5400) {
        $error = 'Too many codes for this number. Try again in ' . (int) ceil($wait / 60) . ' minutes.';
    } else {
        $error = 'Too many codes for this number today. Try again in ' . (int) ceil($wait / 3600) . ' hours.';
    }
    dashit_respond(429, ['error' => $error, 'retry_after' => $wait]);
}
if (isset($booking['busy'])) {
    error_log('DASHit sign-in: the hourly or daily code limit was reached.');
    dashit_respond(429, ['error' => 'Too many sign-in codes right now. Please try again in a little while.', 'retry_after' => 600]);
}

if (!$isReview) {
    $failure = dashit_send_whatsapp_code($config, $mobile, $code);
    if ($failure !== null) {
        error_log('DASHit sign-in: WhatsApp did not take the code for a number ending ' . substr($mobile, -4) . ": $failure");
        dashit_respond(502, [
            'error' => "We couldn't send the code on WhatsApp. Check the number is on WhatsApp and try again.",
            'retry_after' => DASHIT_RESEND_AFTER,
        ]);
    }
}

dashit_respond(200, ['sent' => true, 'resend_after' => DASHIT_RESEND_AFTER, 'expires_in' => DASHIT_CODE_LIFETIME]);
