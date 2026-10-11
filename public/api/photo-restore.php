<?php
/*
 * GET /products/uploads/dsh_<16 hex>.(jpg|png|webp), when that file is missing.
 *
 * The website's .htaccess sends the request here. Photos the shop takes in the
 * admin app are saved twice (api/staff/upload-photo.php): in the website
 * folder, and in domains/dashit.co.in/dashit-photos, beside public_html. If
 * the website folder was emptied or replaced, this answers with the kept copy
 * and puts it back in products/uploads, so the next request is a plain file.
 */

$name = (string) ($_GET['f'] ?? '');
if (!preg_match('/^dsh_[0-9a-f]{16}\.(jpg|png|webp)$/', $name, $m)) {
    http_response_code(404);
    exit;
}

$root = rtrim((string) ($_SERVER['DOCUMENT_ROOT'] ?? ''), '/');
if ($root === '') {
    $root = dirname(__DIR__);
}
$kept = dirname($root) . '/dashit-photos/' . $name;
if (!is_file($kept)) {
    http_response_code(404);
    header('Cache-Control: no-store');
    exit;
}

$dir = $root . '/products/uploads';
if (is_dir($dir) || @mkdir($dir, 0755, true) || is_dir($dir)) {
    if (@copy($kept, "$dir/$name")) {
        @chmod("$dir/$name", 0644);
    }
}

$types = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];
header('Content-Type: ' . $types[$m[1]]);
header('Content-Length: ' . filesize($kept));
header('Cache-Control: public, max-age=86400');
header('X-Content-Type-Options: nosniff');
readfile($kept);
