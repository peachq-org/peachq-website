<?php
include 'template.php';
peachq_page_start('PeachQ beta builds', 'Experimental PeachQ builds with features ahead of the general release.', 'download');
$release = '';
$uploaded = '';
$files = [];
$labels = [
    'linux' => 'Linux x86_64',
    'linux_glibc' => 'Linux x86_64 (glibc)',
    'linux_arm64' => 'Linux arm64',
    'linux_arm64_glibc' => 'Linux arm64 (glibc)',
    'mac' => 'macOS arm64',
    'windows' => 'Windows x64',
    'linux_glibc_duckdb' => 'Linux x86_64 with DuckDB',
    'linux_arm64_glibc_duckdb' => 'Linux arm64 with DuckDB',
    'macos_duckdb' => 'macOS arm64 with DuckDB',
    'windows_duckdb' => 'Windows x64 with DuckDB',
];
$latestPath = __DIR__ . '/file/beta/latest.json';
if (is_readable($latestPath)) {
    $latest = json_decode((string)file_get_contents($latestPath), true);
    if (is_array($latest)) {
        $release = is_string($latest['version'] ?? null) ? $latest['version'] : '';
        $uploaded = is_string($latest['uploaded'] ?? null) ? $latest['uploaded'] : '';
        foreach ($labels as $key => $label) {
            $f = $latest['files'][$key] ?? null;
            if (is_array($f) && is_string($f['name'] ?? null) && $f['name'] !== '') {
                $files[$key] = $f;
            }
        }
    }
}
function peachq_beta_size($bytes): string {
    if (!is_int($bytes) || $bytes <= 0) {
        return '';
    }
    return $bytes >= 1048576 ? round($bytes / 1048576, 1) . ' MB' : round($bytes / 1024) . ' KB';
}
?>
<main><section class="page-hero"><div class="container"><span class="tag">Beta builds</span><h1>PeachQ <span class="peach">beta</span>.</h1>
<p>Experimental builds with features ahead of the general release, currently qSQL pushdown to DuckDB. Use them to try those features and tell us how they behave on your data. For everything else, use the <a href="download">general release</a>.</p>
<?php if ($release !== ''): ?><p><span class="tag">Build <?= htmlspecialchars($release, ENT_QUOTES, 'UTF-8') ?></span><?php if ($uploaded !== ''): ?> <small>uploaded <?= htmlspecialchars(substr($uploaded, 0, 10), ENT_QUOTES, 'UTF-8') ?></small><?php endif; ?></p><?php endif; ?>
</div></section>
<section class="section"><div class="container">
<?php if ($files === []): ?>
<div class="card"><p>No beta build is available right now. Use the <a href="download">general release</a>.</p></div>
<?php else: ?>
<div class="download-grid">
<?php foreach ($files as $key => $f): ?>
<div class="card download-card"><span class="tag"><?= htmlspecialchars($labels[$key], ENT_QUOTES, 'UTF-8') ?></span>
<div class="file-name"><?= htmlspecialchars($f['name'], ENT_QUOTES, 'UTF-8') ?></div>
<p><small><?= htmlspecialchars(peachq_beta_size($f['bytes'] ?? null), ENT_QUOTES, 'UTF-8') ?><?php if (is_string($f['sha256'] ?? null) && $f['sha256'] !== ''): ?> · SHA-256 <span title="<?= htmlspecialchars($f['sha256'], ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars(substr($f['sha256'], 0, 12), ENT_QUOTES, 'UTF-8') ?>…</span><?php endif; ?></small></p>
<div class="actions"><a class="button peach-button" href="file/beta/<?= rawurlencode($f['name']) ?>">Download</a></div></div>
<?php endforeach; ?>
</div>
<?php endif; ?>
<div class="card" style="margin-top:24px"><h2>Before you use a beta</h2>
<p>Beta builds change without notice and may be withdrawn. Each archive's LICENSE file states the terms for that build. Report problems and results through the <a href="contact">contact page</a>.</p></div>
</div></section></main>
<?php peachq_page_end(); ?>
