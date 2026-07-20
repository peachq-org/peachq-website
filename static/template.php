<?php
declare(strict_types=1);

function peachq_page_start(string $title, string $description = '', string $active = ''): void {
    $title = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
    $description = htmlspecialchars($description, ENT_QUOTES, 'UTF-8');
    $active = htmlspecialchars($active, ENT_QUOTES, 'UTF-8');
    $nav = [
        'repl' => ['Try Live', '/repl'],
        'download' => ['Download', '/download'],
        'compatibility' => ['Compatibility', '/compatibility'],
        'roadmap' => ['Roadmap', '/roadmap'],
        'about' => ['About', '/about'],
        'contact' => ['Contact', '/contact'],
    ];
?>
<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<?php if ($description !== ''): ?><meta name="description" content="<?= $description ?>"><?php endif; ?>
<title><?= $title ?></title>
<link rel="icon" href="/img/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="16x16" href="/img/peachq-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/img/peachq-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/img/peachq-180x180.png">
<link rel="stylesheet" href="/css/styles.css">
</head>
<body>
<header class="nav">
  <div class="container nav-inner">
    <a class="brand" href="/"><img class="logo" src="/img/peachq-logo.svg" alt="PeachQ logo"><span>Peach<span style="color:var(--peach-strong)">Q</span></span></a>
    <button class="mobile-menu" type="button" data-mobile-menu aria-expanded="false" aria-controls="siteNav">Menu</button>
    <nav class="nav-links" id="siteNav">
<?php foreach ($nav as $key => [$label, $href]): ?>
<?php
      $classes = [];
      if ($active === $key) {
          $classes[] = 'active';
      }
      if ($key === 'repl') {
          $classes[] = 'nav-cta';
      }
      $classAttr = $classes === [] ? '' : ' class="' . htmlspecialchars(implode(' ', $classes), ENT_QUOTES, 'UTF-8') . '"';
?>
      <a href="<?= $href ?>"<?= $classAttr ?>><?= $label ?></a>
<?php endforeach; ?>
      <a href="https://github.com/peachq-org/peachq" target="_blank" rel="noreferrer">GitHub ↗</a>
      <button class="theme-toggle" data-theme-toggle aria-label="Toggle theme"></button>
    </nav>
  </div>
</header>
<div class="preview-ribbon" aria-hidden="true">Early preview</div>

<?php
}

function peachq_page_end(array $scripts = []): void {
?>
<footer class="footer">
  <div class="container footer-inner">
    <div>PeachQ - MIT-licensed open source q, built on Rayforce with DuckDB storage in progress.</div>
    <div><a href="/about">Built for the community</a> · <a href="/contact">Contact</a> · <a href="https://github.com/peachq-org/peachq">GitHub</a></div>
  </div>
</footer>
<script src="/script.js"></script>
<?php foreach ($scripts as $script): ?>
<script src="<?= htmlspecialchars($script, ENT_QUOTES, 'UTF-8') ?>"></script>
<?php endforeach; ?>
</body>
</html>
<?php
}
