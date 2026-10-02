<?php
/*
 * Push notifications for orders, through Firebase Cloud Messaging (FCM, free).
 *
 *   register.php  an app hands over its push token after signing in.
 *   notify.php    after an order changes, the app or console that changed it
 *                 asks for the matching push to go out.
 *   activity.php  the iPhone app hands over its lock-screen card's address.
 *   tick.php      cron, every minute: keeps those cards moving.
 *
 * The server writes every message itself from the order's real status, so a
 * caller can't send arbitrary text, and each order/status pair is sent once
 * (pushSent/), so asking twice sends nothing more. Tokens are kept in
 * pushTokens/ with the service account; firestore.rules give apps no access.
 *
 * Cost: FCM is free. Each push costs a few Firestore reads (the order, the
 * tokens), well inside the free daily allowance.
 */

require_once __DIR__ . '/../_firebase.php';

/** POST only; the website, the rider app (a web view on https://localhost) and the apps. */
function dashit_push_preflight(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = ['https://dashit.co.in', 'https://www.dashit.co.in', 'https://localhost', 'capacitor://localhost', 'http://localhost:3000'];
    header('Vary: Origin');
    header('Access-Control-Allow-Origin: ' . (in_array($origin, $allowed, true) ? $origin : 'https://dashit.co.in'));
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
    if ($method !== 'POST') {
        dashit_respond(405, ['error' => 'Use POST.']);
    }
}

/** The signed-in caller (any real account, not an anonymous session): [account, claims]. */
function dashit_push_caller(array $body): array
{
    $account = dashit_firebase_service_account();
    if ($account === null) {
        dashit_respond(503, ['error' => 'Notifications are not set up on the server yet.']);
    }
    $token = is_string($body['id_token'] ?? null) ? $body['id_token'] : '';
    $claims = $token === '' ? null : dashit_verify_id_token($account, $token);
    $provider = is_array($claims) ? (string) ($claims['firebase']['sign_in_provider'] ?? '') : '';
    if ($claims === null || $provider === '' || $provider === 'anonymous') {
        dashit_respond(401, ['error' => 'Please sign in first.']);
    }
    return [$account, $claims];
}

/** Which step an order's status is: placed, packing, on_the_way, delivered, cancelled. */
function dashit_push_stage(string $status): string
{
    $s = strtolower($status);
    if (str_contains($s, 'cancel')) return 'cancelled';
    foreach (['out', 'way', 'rider', 'dispatch', 'transit'] as $word) {
        if (str_contains($s, $word)) return 'on_the_way';
    }
    if (str_contains($s, 'deliver')) return 'delivered';
    if (str_contains($s, 'pack') || str_contains($s, 'ready') || str_contains($s, 'confirm') || str_contains($s, 'accept')) return 'packing';
    return 'placed';
}

/**
 * Signs a phone up to an FCM topic (Instance ID API, with the service
 * account's access token). Best effort: a failure only means that phone
 * misses broadcasts until the app joins the topic itself.
 */
function dashit_push_join_topic(array $account, string $token, string $topic): void
{
    $access = dashit_google_access_token($account);
    if ($access === null) return;
    $curl = curl_init('https://iid.googleapis.com/iid/v1/' . rawurlencode($token) . '/rel/topics/' . rawurlencode($topic));
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => '',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $access, 'access_token_auth: true', 'Content-Length: 0'],
    ]);
    curl_exec($curl);
    $code = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    if ($code < 200 || $code >= 300) {
        error_log("DASHit push: couldn't add a phone to the $topic topic (HTTP $code)");
    }
}

/** Sends one message to one token. Returns 'ok', 'gone' (token no longer valid) or 'failed'. */
function dashit_push_send(array $account, string $token, string $title, string $text, array $data): string
{
    $access = dashit_google_access_token($account);
    $project = (string) ($account['project_id'] ?? '');
    if ($access === null || $project === '') return 'failed';
    $message = [
        'token' => $token,
        'notification' => ['title' => $title, 'body' => $text],
        'data' => array_map('strval', $data),
        'android' => [
            'priority' => 'HIGH',
            'notification' => ['channel_id' => 'order_updates', 'sound' => 'default', 'tag' => $data['orderId'] ?? 'dashit'],
        ],
        'apns' => [
            'headers' => ['apns-priority' => '10'],
            'payload' => ['aps' => ['sound' => 'default', 'thread-id' => $data['orderId'] ?? 'dashit']],
        ],
    ];
    [$status, $reply] = dashit_firestore_request(
        'POST',
        'https://fcm.googleapis.com/v1/projects/' . rawurlencode($project) . '/messages:send',
        $access,
        ['message' => $message]
    );
    if ($status >= 200 && $status < 300) return 'ok';
    $code = '';
    foreach ($reply['error']['details'] ?? [] as $detail) {
        $code = (string) ($detail['errorCode'] ?? $code);
    }
    if ($status === 404 || $code === 'UNREGISTERED' || ($status === 400 && $code === 'INVALID_ARGUMENT')) return 'gone';
    error_log("DASHit push: FCM refused a message (HTTP $status $code): " . ($reply['error']['message'] ?? ''));
    return 'failed';
}

/** Sends to every token in $rows ([[docId, fields], ...]) of the given app, dropping dead ones. */
function dashit_push_to(array $account, array $rows, string $app, string $title, string $text, array $data): int
{
    $sent = 0;
    foreach ($rows as [$id, $fields]) {
        if (($fields['app'] ?? 'customer') !== $app || empty($fields['token'])) continue;
        $result = dashit_push_send($account, (string) $fields['token'], $title, $text, $data);
        if ($result === 'ok') $sent++;
        if ($result === 'gone') dashit_firestore_delete($account, "pushTokens/$id");
    }
    return $sent;
}

/** Minutes added to every arrival time the shopper sees (the apps use the same). */
const DASHIT_SHOWN_MARGIN_MINUTES = 4;

/**
 * Updates (or, once delivered or cancelled, ends) the shopper's lock-screen
 * order card through Apple's Live Activity push, sent via FCM. Fields match
 * DASHitOrderAttributes.ContentState in the iPhone app; dates are seconds
 * since 2001-01-01, as Apple decodes them.
 *
 * The card is also remembered in dashit-data/live-activities.json, so
 * push/tick.php (cron, every minute) can nudge it along: the scooter on the
 * card moves with the clock, and a card only redraws when it gets an update.
 */
function dashit_push_live_activity(array $account, string $fcmToken, string $activityToken, string $orderId, array $order, string $stage): void
{
    // "assigned" (a rider has it but hasn't collected it yet) is packing on
    // the card; the card tells it apart by the rider being set.
    $status = ['placed' => 'placed', 'packing' => 'packing', 'assigned' => 'packing', 'on_the_way' => 'out_for_delivery',
        'delivered' => 'delivered', 'cancelled' => 'cancelled'][$stage];
    $progress = ['placed' => 0.12, 'packing' => 0.34, 'assigned' => 0.34, 'on_the_way' => 0.58, 'delivered' => 1.0, 'cancelled' => 0.0][$stage];
    $now = time();
    $created = strtotime((string) ($order['createdAt'] ?? '')) ?: $now;
    $eta = max(1, (int) ($order['etaMinutes'] ?? 8));
    $riding = $stage === 'on_the_way';
    // The clock only runs once the rider has collected the order (the moment
    // it went out for delivery): from then, the ride plus the shown margin.
    $pickup = $riding ? dashit_order_pickup_time($order, $now) : null;
    $arrival = $riding
        ? $pickup + max(5, $eta - 3) * 60 + DASHIT_SHOWN_MARGIN_MINUTES * 60
        : $created + $eta * 60 + DASHIT_SHOWN_MARGIN_MINUTES * 60;
    $state = [
        'status' => $status,
        'etaMinutes' => max(1, (int) ceil(($arrival - $now) / 60)),
        'progress' => $progress,
        'estimatedArrival' => $arrival - 978307200,
    ];
    if ($pickup !== null) $state['pickedUpAt'] = $pickup - 978307200;
    $rider = trim((string) ($order['driverName'] ?? ''));
    if ($rider !== '') $state['driverName'] = $rider;

    $finished = $stage === 'delivered' || $stage === 'cancelled';
    $aps = ['timestamp' => $now, 'event' => $finished ? 'end' : 'update', 'content-state' => $state];
    if ($finished) {
        $aps['dismissal-date'] = $now + 15 * 60;
    } elseif ($riding) {
        // At the arrival time iOS redraws the card as "stale", which it shows
        // as "almost there" instead of a countdown stuck at 0:00.
        $aps['stale-date'] = $arrival;
    }
    dashit_live_activity_send($account, $fcmToken, $activityToken, $aps, '10');

    dashit_live_cards(function (array $cards) use ($orderId, $finished, $fcmToken, $activityToken, $state, $arrival, $created, $pickup) {
        if ($finished) {
            unset($cards[$orderId]);
        } else {
            // `start` is set once riding: tick.php only moves cards on the way.
            $cards[$orderId] = ['fcm' => $fcmToken, 'token' => $activityToken, 'state' => $state,
                'placed' => $created, 'start' => $pickup, 'arrival' => $arrival];
        }
        return $cards;
    });
}

/**
 * When the rider collected the order: the last time it went out for delivery
 * in its status history (the rider app writes it on "Start delivery"), or now.
 */
function dashit_order_pickup_time(array $order, int $now): int
{
    $at = null;
    foreach ((array) ($order['statusHistory'] ?? []) as $entry) {
        if (!is_array($entry) || dashit_push_stage((string) ($entry['status'] ?? '')) !== 'on_the_way') continue;
        $time = strtotime((string) ($entry['at'] ?? ''));
        if ($time !== false) $at = max($at ?? 0, $time);
    }
    return ($at !== null && $at <= $now && $at > $now - 3 * 3600) ? $at : $now;
}

/** One Live Activity push through FCM. Priority '5' is for routine nudges. */
function dashit_live_activity_send(array $account, string $fcmToken, string $activityToken, array $aps, string $priority): bool
{
    $access = dashit_google_access_token($account);
    $project = (string) ($account['project_id'] ?? '');
    if ($access === null || $project === '') return false;
    [$code, $reply] = dashit_firestore_request(
        'POST',
        'https://fcm.googleapis.com/v1/projects/' . rawurlencode($project) . '/messages:send',
        $access,
        ['message' => [
            'token' => $fcmToken,
            'apns' => [
                'live_activity_token' => $activityToken,
                'headers' => ['apns-priority' => $priority, 'apns-push-type' => 'liveactivity', 'apns-topic' => 'com.dashit.app.push-type.liveactivity'],
                'payload' => ['aps' => $aps],
            ],
        ]]
    );
    if ($code < 200 || $code >= 300) {
        error_log("DASHit push: live activity update refused (HTTP $code): " . ($reply['error']['message'] ?? ''));
        return false;
    }
    return true;
}

/**
 * Reads and rewrites dashit-data/live-activities.json under a lock:
 * { orderId: { fcm, token, state, placed, arrival } }. $change gets the cards
 * and returns them as they should be saved.
 */
function dashit_live_cards(callable $change): void
{
    $dir = dashit_private_dir('dashit-data');
    if (!is_dir($dir) && !@mkdir($dir, 0700, true)) return;
    $handle = @fopen("$dir/live-activities.json", 'c+');
    if ($handle === false) return;
    try {
        if (!flock($handle, LOCK_EX)) return;
        $cards = json_decode((string) stream_get_contents($handle), true);
        $cards = $change(is_array($cards) ? $cards : []);
        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode((object) $cards));
        fflush($handle);
        flock($handle, LOCK_UN);
    } finally {
        fclose($handle);
    }
}
