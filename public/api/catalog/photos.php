<?php
/*
 * GET /api/catalog/photos.php
 *   -> 200 { "files": ["sweet_tooth/dsh_….webp", …], "names": { name: img }, "barcodes": { code: img } }
 *
 * The product photos on this website, for the staff console to give new
 * products a photo by themselves (src/lib/sitePhotos.js):
 *   files     every photo in products/catalog or products/thumbs (either copy
 *             stands in for the other, see components/ProductImage), so the
 *             console only picks a product-list photo that really opens;
 *   names,    the shop's own photos in products/photos, named after the
 *   barcodes  product's barcode ("8901262150019.webp") or name ("Amul Butter
 *             100g.webp"); then the last photo each product name / barcode
 *             had in the shop (photo memory, _catalog.php, and the seed file
 *             of photos the shop had before the memory was kept).
 * Worked out at most every 10 minutes for everyone.
 */

require __DIR__ . '/_catalog.php';

header('Access-Control-Allow-Origin: *');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    dashit_respond(405, ['error' => 'Use GET.']);
}
dashit_rate_limit('catalog-photos', 120);

/** Paths below $dir of every photo file in it. */
function dashit_photo_files(string $dir): array
{
    if (!is_dir($dir)) return [];
    $out = [];
    $items = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
    foreach ($items as $file) {
        if ($file->isFile() && preg_match('/\.(webp|jpe?g|png)$/i', $file->getFilename())) {
            $out[] = str_replace('\\', '/', substr($file->getPathname(), strlen($dir) + 1));
        }
    }
    return $out;
}

$cache = dashit_private_dir('dashit-data') . '/site-photos.json';
$saved = is_file($cache) ? json_decode((string) file_get_contents($cache), true) : null;
if (is_array($saved) && time() - (int) ($saved['at'] ?? 0) < 600 && isset($saved['body'])) {
    $body = $saved['body'];
} else {
    $root = dirname(__DIR__, 2);
    $files = array_values(array_unique(array_merge(
        dashit_photo_files("$root/products/catalog"),
        dashit_photo_files("$root/products/thumbs")
    )));
    sort($files);
    $onSite = array_flip($files);

    $seed = @json_decode((string) @file_get_contents("$root/catalog/photo-memory-seed.json"), true);
    $memory = dashit_photo_memory_read();
    // A remembered product-list photo counts only if it is on the website.
    $usable = function (string $img) use ($onSite): bool {
        // The shop uploads its own photos: none from Open Food Facts.
        if (preg_match('#^https?://images\.open(?:food|beauty)facts\.#', $img)) return false;
        if (preg_match('#/products/(?:catalog|thumbs)/(.+)$#', $img, $m)) return isset($onSite[$m[1]]);
        return true;
    };
    $body = ['files' => $files, 'names' => [], 'barcodes' => []];
    // The shop's own uploads win over anything remembered.
    $own = ['names' => [], 'barcodes' => []];
    foreach (dashit_photo_files("$root/products/photos") as $file) {
        $stem = trim(str_replace(['_', '-'], ' ', pathinfo(basename($file), PATHINFO_FILENAME)));
        if ($stem === '') continue;
        $url = 'https://dashit.co.in/products/photos/' . implode('/', array_map('rawurlencode', explode('/', $file)));
        if (preg_match('/^(\d{8}|\d{12,14})$/', $stem)) $own['barcodes'][$stem] = $url;
        else $own['names'][$stem] = $url;
    }
    foreach (['names', 'barcodes'] as $kind) {
        // Later sources win. Not array_merge: it renumbers barcode keys.
        foreach ([is_array($seed[$kind] ?? null) ? $seed[$kind] : [], $memory[$kind], $own[$kind]] as $source) {
            foreach ($source as $key => $img) {
                if (is_string($img) && $usable($img)) $body[$kind][(string) $key] = $img;
            }
        }
    }
    @mkdir(dirname($cache), 0700, true);
    @file_put_contents("$cache.tmp", json_encode(['at' => time(), 'body' => $body], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    @rename("$cache.tmp", $cache);
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, max-age=300');
echo json_encode([
    'files' => $body['files'],
    'names' => (object) $body['names'],
    'barcodes' => (object) $body['barcodes'],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
