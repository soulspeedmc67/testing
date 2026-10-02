<?php
/*
 * POST { "id_token": "...", "title": "...", "text": "..." }   -> 200 { "sent": true, "history": [...] }
 * POST { "id_token": "...", "action": "history" }             -> 200 { "history": [...] }
 *
 * "Notify customers" in the admin consoles: one message to every shopper's
 * phone, Android and iPhone. It goes out as a single FCM message to the
 * "customers" topic, which every shop app joins (and register.php signs each
 * phone up to), so it costs nothing and reads nothing however many shoppers
 * there are. Admins only, and at most DASHIT_BROADCASTS_PER_DAY in any 24
 * hours, so a slip or a stolen login can't flood people's phones. The last
 * few are kept in dashit-data/broadcasts.json for the console to list.
 */
require __DIR__ . '/_push.php';

const DASHIT_BROADCASTS_PER_DAY = 10;
const DASHIT_BROADCAST_TOPIC = 'customers';

dashit_push_preflight();
dashit_rate_limit('push-broadcast', 30);
$body = dashit_json_body();
[$account, $claims] = dashit_push_caller($body);
[$isStaff, $role] = dashit_staff_role($account, $claims);
if (!$isStaff || $role !== 'admin') {
    dashit_respond(403, ['error' => 'Only the shop owner can send these.']);
}

$historyFile = dashit_private_dir('dashit-data') . '/broadcasts.json';
$readHistory = function () use ($historyFile): array {
    $list = is_file($historyFile) ? json_decode((string) file_get_contents($historyFile), true) : [];
    return is_array($list) ? $list : [];
};

if (($body['action'] ?? '') === 'history') {
    dashit_respond(200, ['history' => $readHistory(), 'perDay' => DASHIT_BROADCASTS_PER_DAY]);
}

$clean = function ($value, int $max): string {
    $text = is_string($value) ? trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value)) : '';
    return mb_substr($text, 0, $max);
};
$title = $clean($body['title'] ?? '', 60);
$text = $clean($body['text'] ?? '', 180);
if ($title === '' || $text === '') {
    dashit_respond(400, ['error' => 'Write a title and a message.']);
}

$now = time();
$history = $readHistory();
$lastDay = array_filter($history, fn ($b) => ($b['at'] ?? 0) > $now - 86400 && ($b['sent'] ?? false));
if (count($lastDay) >= DASHIT_BROADCASTS_PER_DAY) {
    dashit_respond(429, ['error' => 'That\'s ' . DASHIT_BROADCASTS_PER_DAY . ' messages in the last 24 hours. Please wait before sending another.']);
}

$access = dashit_google_access_token($account);
$project = (string) ($account['project_id'] ?? '');
if ($access === null || $project === '') {
    dashit_respond(503, ['error' => 'Notifications are not set up on the server yet.']);
}
[$code, $reply] = dashit_firestore_request(
    'POST',
    'https://fcm.googleapis.com/v1/projects/' . rawurlencode($project) . '/messages:send',
    $access,
    ['message' => [
        'topic' => DASHIT_BROADCAST_TOPIC,
        'notification' => ['title' => $title, 'body' => $text],
        'data' => ['kind' => 'broadcast'],
        'android' => [
            'priority' => 'HIGH',
            'notification' => ['channel_id' => 'news', 'sound' => 'default'],
        ],
        'apns' => ['payload' => ['aps' => ['sound' => 'default']]],
    ]]
);
$sent = $code >= 200 && $code < 300;
if (!$sent) {
    error_log("DASHit push: broadcast refused (HTTP $code): " . ($reply['error']['message'] ?? ''));
}

array_unshift($history, ['at' => $now, 'title' => $title, 'text' => $text, 'sent' => $sent]);
$history = array_slice($history, 0, 20);
if (!is_dir(dirname($historyFile))) @mkdir(dirname($historyFile), 0700, true);
@file_put_contents($historyFile, json_encode($history), LOCK_EX);

if (!$sent) {
    dashit_respond(502, ['error' => "Couldn't send it just now. Please try again.", 'history' => $history]);
}
dashit_respond(200, ['sent' => true, 'history' => $history, 'perDay' => DASHIT_BROADCASTS_PER_DAY]);
