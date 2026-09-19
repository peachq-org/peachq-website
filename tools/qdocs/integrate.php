<?php
// Wrap qDoc output with the same site shell used by the root pages.
declare(strict_types=1);
require __DIR__ . '/../../static/template.php';

$path = $argv[1];
$html = file_get_contents($path);
if (!preg_match('~<head>(.*?)</head>.*?<body[^>]*>(.*?)</body>~s', $html, $parts)) {
    throw new RuntimeException('Unrecognised qDoc page: ' . $path);
}
preg_match('~<title>(.*?)</title>~s', $parts[1], $title);
preg_match_all('~<link\b[^>]*rel="stylesheet"[^>]*>|<script\b[^>]*>.*?</script>~s', $parts[1], $resources);
$resources = implode("\n", array_filter($resources[0], function ($tag) {
    return strpos($tag, 'peachq-api.css') === false;
}));

// Template URLs are relative to the site root; API pages are two levels below it.
function api_shell_urls(string $html): string {
    $html = preg_replace('~<base\b[^>]*>~', '', $html);
    return preg_replace_callback('~\b(href|src)="([^"#][^"]*)"~', function ($m) {
        if (preg_match('~^(?:[a-z]+:|/)~i', $m[2])) return $m[0];
        return $m[1] . '="../../' . $m[2] . '"';
    }, $html);
}
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['REQUEST_URI'] = '/docs/api/' . (basename($path) === 'index.html' ? '' : basename($path));
ob_start();
peachq_page_start(html_entity_decode($title[1] ?? 'Library API - PeachQ'), '', 'docs');
$start = api_shell_urls(ob_get_clean());
$start = str_replace('<body>', '<body class="peachq-api">', $start);
$start = str_replace('<link rel="stylesheet" href="../../css/styles.css">',
    $resources . "\n" . '<link rel="stylesheet" href="../../css/styles.css">' .
    "\n" . '<link rel="stylesheet" href="peachq-api.css">', $start);
ob_start();
peachq_page_end();
$end = api_shell_urls(ob_get_clean());

$body = $parts[2];
if (basename($path) === 'index.html') {
    $notice = <<<'HTML'
<aside class="peachq-api-load" aria-labelledby="load-standard-library">
<h2 id="load-standard-library">Load the standard library first</h2>
<p>PeachQ starts without the standard library loaded. To load it, run either command:</p>
<pre><code class="nohighlight">system "l pq"
\l pq</code></pre>
</aside>
HTML;
    $body = preg_replace_callback('~<h1\b[^>]*>Library API</h1>~', function ($m) use ($notice) {
        return $m[0] . $notice;
    }, $body, 1);
}
$exampleTitle = rawurlencode(basename($path, '.html'));
$body = preg_replace_callback("~<a class='qd-example-link' href='(../../repl\\?code=[^']*)' target='a' title='Run example'>.*?</a>~s", function ($m) use ($exampleTitle) {
    if ($exampleTitle !== 'regexp.q') {
        return '<button type="button" class="qd-example-link" data-copy-example title="Copy example" aria-label="Copy example to clipboard">Copy</button>' .
            '<span class="qd-copy-status" role="status"></span>';
    }
    return '<a class="qd-example-link" href="' . htmlspecialchars($m[1] . '&title=' . $exampleTitle, ENT_QUOTES, 'UTF-8') .
        '" target="_blank" rel="noopener noreferrer" title="Open in REPL" aria-label="Open example in REPL (new tab)">&#8599;</a>';
}, $body);
// The site's script owns navigation and colour mode; no second theme runtime.
$body = preg_replace('~<script\b[^>]*>.*?</script>~s', '', $body);
$body = preg_replace('~<div class="rst-versions".*?</div>~s', '', $body);
$body = str_replace('<i data-toggle="wy-nav-top" class="fa fa-bars"></i>',
    '<button type="button" data-api-menu aria-expanded="false" aria-controls="api-sidebar">☰ API menu</button>', $body);
$body = str_replace('class="wy-nav-side stickynav"', 'class="wy-nav-side stickynav" id="api-sidebar"', $body);
$output = $start . $body . '<script src="peachq-api.js"></script>' . $end;
file_put_contents($path, preg_replace('/[\t ]+$/m', '', $output));
