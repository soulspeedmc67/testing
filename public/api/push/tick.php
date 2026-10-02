<?php
/*
 * Cron, every minute:  php domains/dashit.co.in/public_html/api/push/tick.php
 *
 * Nudges every lock-screen order card that's on its way. The scooter on the
 * card moves from the shop to the door with the clock from pickup, but a
 * card only redraws when it receives an update, so each one gets a quiet,
 * low-priority push a minute. The cards come from dashit-data/live-activities.json
 * (written by notify.php and activity.php): no Firestore reads at all, and
 * FCM pushes are free.
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__ . '/_push.php';

$lockDir = dashit_private_dir('dashit-data');
$lock = @fopen("$lockDir/live-tick.lock", 'c');
if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) exit; // the last run is still going

$account = dashit_firebase_service_account();
if ($account === null) exit(1);

$now = time();
$due = [];
dashit_live_cards(function (array $cards) use ($now, &$due) {
    foreach ($cards as $orderId => $card) {
        $arrival = (int) ($card['arrival'] ?? 0);
        $placed = (int) ($card['placed'] ?? 0);
        // Forgotten after three hours whatever happens (a lost "delivered" push).
        if ($arrival <= 0 || $now - $placed > 3 * 3600) {
            unset($cards[$orderId]);
            continue;
        }
        // Only cards on the way move (before pickup the scooter waits at the
        // store). Past the arrival time the card shows "almost there" by
        // itself (its stale date), so nothing more to move until it ends.
        if (!empty($card['start']) && $now <= $arrival + 60) $due[$orderId] = $card;
    }
    return $cards;
});

foreach ($due as $orderId => $card) {
    $arrival = (int) $card['arrival'];
    $start = (int) $card['start'];
    $state = (array) $card['state'];
    $state['etaMinutes'] = max(1, (int) ceil(($arrival - $now) / 60));
    // How far along the ride is, the same as the card works it out.
    $span = max(60, $arrival - $start);
    $state['progress'] = round(min(0.94, max(0.04, ($now - $start) / $span)), 3);
    dashit_live_activity_send($account, (string) $card['fcm'], (string) $card['token'], [
        'timestamp' => $now,
        'event' => 'update',
        'content-state' => $state,
        'stale-date' => $arrival,
    ], '5');
}
