<?php
declare(strict_types=1);

// Stable archive URLs follow the same release manifest as the download page.
header('Cache-Control: no-store, max-age=0');
header('Content-Type: text/plain; charset=utf-8');
$aliases = [
    'peachq.zip' => 'windows',
    'peachq-duckdb.zip' => 'windows_duckdb',
    'peachq-mac-arm64.tar.gz' => 'mac',
    'peachq-mac-arm64-duckdb.tar.gz' => 'macos_duckdb',
    'peachq-linux-x64.tar.gz' => 'linux',
    'peachq-linux-x64-duckdb.tar.gz' => 'linux_glibc_duckdb',
];
$path = (string)parse_url((string)$_SERVER['REQUEST_URI'], PHP_URL_PATH);
$alias = preg_match('~/download/([^/]+)$~', $path, $match) ? $match[1] : '';
if (!isset($aliases[$alias])) {
    http_response_code(404);
    exit("Unknown download.\n");
}

$manifestPath = __DIR__ . '/file/latest.json';
$manifest = is_readable($manifestPath)
    ? json_decode((string)file_get_contents($manifestPath), true) : null;
$file = $manifest['files'][$aliases[$alias]]['name'] ?? null;
if (!is_string($file) || !preg_match('/\Apeachq-[a-zA-Z0-9._-]+\.(zip|tar\.gz)\z/', $file)) {
    http_response_code(503);
    exit("The requested release download is unavailable. Please try again later.\n");
}

// Relative to /download/<alias>, this also works under a mirror's site prefix.
header('Location: ../file/' . rawurlencode($file), true, 302);
