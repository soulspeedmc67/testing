<?php
/*
 * Keeps public_html/catalog/catalog.json up to date. Runs from Hostinger's
 * cron (command line); the web gets a 404 (and .htaccess blocks it too).
 * The work is dashit_catalog_build() in _catalog.php, which changes.php also
 * runs when the file is missing or stale, so the shop keeps working if the
 * cron job stops.
 *
 *   php build.php          one Firestore read to see whether anything changed;
 *                          if so, only the changed products. Once a day (or
 *                          with no file yet) everything.
 *   php build.php --full   read everything now.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/_catalog.php';

$ok = dashit_catalog_build(in_array('--full', $argv, true), function (string $line): void {
    fwrite(STDOUT, gmdate('c') . " $line\n");
});
exit($ok === false ? 1 : 0);
