<?php
include 'template.php';
peachq_page_start('Download PeachQ', 'Download PeachQ preview builds and browser runtime.', 'download');
$release = 'v0.41.0';
$releaseDisplay = 'v0.41';
$uploaded = '2026-07-16';
$files = [
    'windows' => "peachq-$release-windows-x86_64.zip",
    'mac' => "peachq-$release-darwin-arm64.tar.gz",
    'linux' => "peachq-$release-linux-x86_64.tar.gz",
];
$commands = [
    'linux' => "curl -LO https://peachq.org/file/{$files['linux']}\nmkdir -p peachq\ntar -xzf {$files['linux']} -C peachq\ncd peachq\n./q",
    'mac' => "curl -LO https://peachq.org/file/{$files['mac']}\nmkdir -p peachq\ntar -xzf {$files['mac']} -C peachq\ncd peachq\n./q",
    'windows' => "Invoke-WebRequest https://peachq.org/file/{$files['windows']} -OutFile {$files['windows']}\nExpand-Archive {$files['windows']} -DestinationPath peachq\ncd peachq\n.\\q.exe",
];
?>
<main><section class="page-hero"><div class="container"><span class="tag">Preview builds</span><h1>Download Peach<span class="peach">Q</span>.</h1><p>Native packages for the current preview, plus the browser REPL for a no-install first look.</p><p class="release-meta">Current preview <strong data-release-version><?= htmlspecialchars($releaseDisplay, ENT_QUOTES, 'UTF-8') ?></strong> uploaded <time data-release-uploaded datetime="<?= htmlspecialchars($uploaded, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($uploaded, ENT_QUOTES, 'UTF-8') ?></time>.</p></div></section>
<section class="section"><div class="container">
<div class="download-grid" data-platform-downloads>
<div class="card download-card" data-platform-card="windows"><div class="os">⊞</div><span class="tag">Windows x64</span><h3>Windows</h3><p>Standalone preview archive for 64-bit Windows.</p><div class="file-name" data-release-file="windows"><?= htmlspecialchars($files['windows'], ENT_QUOTES, 'UTF-8') ?></div><div class="file-meta" data-release-meta="windows" hidden></div><div class="actions"><a class="button peach-button" data-release-link="windows" href="/file/<?= htmlspecialchars($files['windows'], ENT_QUOTES, 'UTF-8') ?>">Download Windows</a></div></div>
<div class="card download-card" data-platform-card="mac"><div class="os">◉</div><span class="tag">macOS arm64</span><h3>macOS</h3><p>Apple silicon preview archive with the PeachQ command-line binary.</p><div class="file-name" data-release-file="mac"><?= htmlspecialchars($files['mac'], ENT_QUOTES, 'UTF-8') ?></div><div class="file-meta" data-release-meta="mac" hidden></div><div class="actions"><a class="button peach-button" data-release-link="mac" href="/file/<?= htmlspecialchars($files['mac'], ENT_QUOTES, 'UTF-8') ?>">Download macOS</a></div></div>
<div class="card download-card" data-platform-card="linux"><div class="os">🐧</div><span class="tag">Linux x86_64</span><h3>Linux</h3><p>Portable x86_64 tarball for current Linux distributions.</p><div class="file-name" data-release-file="linux"><?= htmlspecialchars($files['linux'], ENT_QUOTES, 'UTF-8') ?></div><div class="file-meta" data-release-meta="linux" hidden></div><div class="actions"><a class="button peach-button" data-release-link="linux" href="/file/<?= htmlspecialchars($files['linux'], ENT_QUOTES, 'UTF-8') ?>">Download Linux</a></div></div>
<div class="card download-card download-card-secondary"><div class="os">🌐</div><span class="tag">Browser</span><h3>Browser REPL</h3><p>No install. Useful for a quick compatibility check before downloading.</p><div class="actions"><a class="button" href="/repl">Launch REPL</a></div></div>
<div class="card download-card download-card-secondary"><div class="os">⌘</div><span class="tag">Developers</span><h3>Build from source</h3><p>Follow development, inspect the implementation and contribute fixes.</p><div class="actions"><a class="button" href="https://github.com/peachq-org/peachq">Open GitHub ↗</a></div></div>
<!--
<div class="card download-card"><div class="os">📦</div><span class="tag">Roadmap</span><h3>Containers</h3><p>Small reproducible images for CI, services and hosted workloads.</p><div class="actions"><a class="button" href="/roadmap">See roadmap</a></div></div>
-->
</div>
<div class="download-cli" data-platform-instructions>
<div class="platform-instructions" data-platform-instructions-for="linux" hidden>
<h2>Linux command line</h2>
<pre><code data-release-command="linux"><?= htmlspecialchars($commands['linux'], ENT_QUOTES, 'UTF-8') ?></code></pre>
</div>
<div class="platform-instructions" data-platform-instructions-for="mac" hidden>
<h2>macOS command line</h2>
<pre><code data-release-command="mac"><?= htmlspecialchars($commands['mac'], ENT_QUOTES, 'UTF-8') ?></code></pre>
</div>
<div class="platform-instructions" data-platform-instructions-for="windows" hidden>
<h2>Windows PowerShell</h2>
<pre><code data-release-command="windows"><?= htmlspecialchars($commands['windows'], ENT_QUOTES, 'UTF-8') ?></code></pre>
</div>
</div>
<div class="changelog">
<h2>Release path</h2>
<p class="section-intro">PeachQ's version is its q-conformance score, so each release is a step up the pass rate.</p>
<div class="change"><time>0.4</time><div><strong>Breadth and polish</strong><p>Deeper qSQL, self-hosted q verbs, a Windows build, the browser REPL and in-REPL help.</p></div></div>
<div class="change"><time>0.3</time><div><strong>Talking and joining</strong><p>IPC over the kdb wire, keyed tables, the first joins and a real string model.</p></div></div>
<div class="change"><time>0.2</time><div><strong>qSQL and time</strong><p><code>select</code> and <code>exec</code> over in-memory tables, temporal types and reference-matched display.</p></div></div>
<div class="change"><time>0.1</time><div><strong>The language takes shape</strong><p>Core datatypes, adverbs, dictionaries and tables, with <code>parse</code> and <code>type</code> starting to match kdb.</p></div></div>
<div class="change"><time>0.01</time><div><strong>First light</strong><p>A q parser over the Rayforce engine: parse trees, a handful of verbs, and numbers in and out.</p></div></div>
</div>
</div></section></main>
<?php peachq_page_end(['/download.js']); ?>
