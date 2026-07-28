<?php
/**
 * Router for `php -S`, emulating the .htaccess rewrite rules.
 *
 * The built-in server ignores .htaccess and, when a path does not exist, falls
 * back to index.php -- so every extensionless URL silently rendered the home
 * page. This makes local preview and the test suite exercise the same URLs
 * Apache serves.
 *
 * Usage: php -S 127.0.0.1:8899 -t site tools/preview-router.php
 */
declare(strict_types=1);

$root = rtrim((string)$_SERVER['DOCUMENT_ROOT'], '/');
$uri  = (string)parse_url((string)$_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = $root . $uri;

/**
 * Point SCRIPT_NAME at the script actually being run, as Apache does.
 *
 * template.php reads it to work out where the site is installed, so a
 * dispatched request that left SCRIPT_NAME on the requested URL would give the
 * error page the wrong <base>.
 */
function peachq_set_script_name(string $file): void {
    $root = rtrim((string)$_SERVER['DOCUMENT_ROOT'], '/');
    $real = realpath($file);
    if ($real !== false && strpos($real, $root) === 0) {
        $_SERVER['SCRIPT_NAME'] = str_replace('\\', '/', substr($real, strlen($root)));
    }
}

/** Serve a directory index, mirroring `DirectoryIndex index.php index.html`. */
function peachq_serve_dir(string $dir): bool {
    foreach (['index.php', 'index.html'] as $candidate) {
        $file = rtrim($dir, '/') . '/' . $candidate;
        if (is_file($file)) {
            if (str_ends_with($file, '.php')) {
                peachq_set_script_name($file);
                chdir(dirname($file));
                require $file;
            } else {
                header('Content-Type: text/html; charset=utf-8');
                readfile($file);
            }
            return true;
        }
    }
    return false;
}

// RewriteCond %{REQUEST_URI} ^(.*)/(index|download|...)\.html$ -> %1/%2 [R=301]
//
// Emulated because it was missing here, so nothing caught the redirect sending
// visitors to a filesystem path. It has to run before the file checks: 404.html
// exists on disk and would otherwise be served instead of redirecting.
if (preg_match('#^(.*)/(index|download|repl|compatibility|roadmap|about|demo|qdash)\.html$#', $uri, $m)) {
    header('Location: ' . $m[1] . '/' . $m[2], true, 301);
    return true;
}

// An existing directory: serve its index.
if (is_dir($path) && peachq_serve_dir($path)) {
    return true;
}

// An existing file: PHP is executed, anything else is served verbatim.
if (is_file($path)) {
    if (str_ends_with($path, '.php')) {
        chdir(dirname($path));
        require $path;
        return true;
    }
    return false; // let the built-in server handle static files and MIME types
}

// RewriteRule ^([A-Za-z0-9_-]+)/?$ $1.php, guarded by REQUEST_FILENAME.php -f.
//
// Apache applies that per directory, so it matches at whatever depth the site is
// installed. Testing the resolved filename here does the same, which is what
// lets the tests serve one build both from a document root and from /peachq.
$trimmed = trim($uri, '/');
if ($trimmed !== '' && preg_match('#^[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*$#', $trimmed) && is_file("$root/$trimmed.php")) {
    peachq_set_script_name("$root/$trimmed.php");
    chdir(dirname("$root/$trimmed.php"));
    require "$root/$trimmed.php";
    return true;
}

// A MkDocs directory URL requested without its trailing slash.
if (is_dir("$root/$trimmed") && peachq_serve_dir("$root/$trimmed")) {
    return true;
}

// RewriteRule ^ weberror.php, which .htaccess applies from the directory it
// sits in. That directory is the site's install root, so find it the same way
// Apache would: the nearest ancestor of the request holding the error page.
$dir = is_dir($path) ? $path : dirname($path);
$installRoot = null;
while (strlen($dir) >= strlen($root)) {
    if (is_file("$dir/weberror.php")) {
        $installRoot = $dir;
        break;
    }
    $parent = dirname($dir);
    if ($parent === $dir) {
        break;
    }
    $dir = $parent;
}

http_response_code(404);
if ($installRoot !== null) {
    peachq_set_script_name("$installRoot/weberror.php");
    chdir($installRoot);
    require "$installRoot/weberror.php";
} else {
    echo "404 Not Found\n";
}
return true;
