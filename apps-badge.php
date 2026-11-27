<?php
$colors = ['Works' => '#2c8b57', 'Mostly' => '#5aa874', 'Loads' => '#e0904f', 'Parses' => '#e0904f', 'Broken' => '#c9543a'];
$name = isset($_GET['app']) ? (string)$_GET['app'] : '';
$grade = 'unknown';
$data = json_decode((string)@file_get_contents(__DIR__ . '/data/apps/apps.json'), true);
foreach (($data['apps'] ?? []) as $app) {
  if (($app['name'] ?? null) === $name) { $grade = (string)($app['grade'] ?? 'unknown'); break; }
}
$color = $colors[$grade] ?? '#8a8f98';
$label = 'PeachQ';
$lw = 52;
$vw = 10 + 7 * strlen($grade);
$w = $lw + $vw;
$cx = $lw + $vw / 2;
$g = htmlspecialchars($grade, ENT_QUOTES);
header('Content-Type: image/svg+xml');
header('Cache-Control: max-age=3600');
echo <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="$w" height="20" role="img" aria-label="$label: $g"><title>$label: $g</title><rect width="$lw" height="20" rx="3" fill="#555"/><rect x="$lw" width="$vw" height="20" rx="3" fill="$color"/><rect x="$lw" width="4" height="20" fill="$color"/><g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle"><text x="26" y="14">$label</text><text x="$cx" y="14">$g</text></g></svg>
SVG;
