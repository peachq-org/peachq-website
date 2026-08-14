<?php
declare(strict_types=1);

$format = (string)($_GET['format'] ?? 'html');
$query = trim((string)($_GET['q'] ?? ''));
$indexPath = __DIR__ . '/docs/help-index.json';
$topics = [];
if (($format === 'csv' || ($query !== '' && strlen($query) <= 160)) && is_readable($indexPath)) {
    $index = json_decode((string)file_get_contents($indexPath), true);
    if (is_array($index) && is_array($index['topics'] ?? null)) {
        $topics = $index['topics'];
    }
}

function peachq_help_pagepath(array $topic): string {
    $path = (string)($topic['path'] ?? '');
    $anchor = (string)($topic['anchor'] ?? '');
    return 'docs/' . $path . '/' . ($anchor === '' ? '' : '#' . $anchor);
}

if ($format === 'csv') {
    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: inline; filename="help.csv"');
    $output = fopen('php://output', 'wb');
    if ($output !== false) {
        fputcsv($output, ['pagepath', 'qname', 'kind']);
        foreach ($topics as $topicRow) {
            if (is_array($topicRow) && is_string($topicRow['qname'] ?? null)) {
                fputcsv($output, [peachq_help_pagepath($topicRow), $topicRow['qname'], (string)($topicRow['kind'] ?? 'alias')]);
            }
        }
        fclose($output);
    }
    exit;
}

$topic = $topics[$query] ?? null;
if (!is_array($topic) && $query !== '') {
    $matches = [];
    foreach ($topics as $candidate) {
        if (!is_array($candidate)) {
            continue;
        }
        if (peachq_help_pagepath($candidate) === $query) {
            $topic = $candidate;
            break;
        }
        $candidateName = (string)($candidate['qname'] ?? '');
        if (strcasecmp($candidateName, $query) === 0
            || strcasecmp(peachq_help_pagepath($candidate), $query) === 0) {
            $matches[] = $candidate;
        }
    }
    if (!is_array($topic) && count($matches) === 1) {
        $topic = $matches[0];
    }
}
$target = is_array($topic) ? ($topic['path'] ?? null) : null;
$anchor = is_array($topic) ? ($topic['anchor'] ?? '') : '';
if (is_string($target) && preg_match('~^(?:basics|ref)/[a-z0-9._-]+$~', $target)
    && is_string($anchor) && preg_match('~^[a-z0-9-]*$~', $anchor)) {
    if ($format === 'md') {
        $markdown = __DIR__ . '/docs/' . $target . '.md';
        if (is_readable($markdown)) {
            header('Content-Type: text/markdown; charset=UTF-8');
            header('Content-Location: docs/' . $target . '.md');
            $lines = file($markdown);
            $startLine = $topic['start_line'] ?? null;
            $endLine = $topic['end_line'] ?? null;
            if ($lines !== false && is_int($startLine) && is_int($endLine)
                && $startLine >= 0 && $endLine > $startLine && $endLine <= count($lines)) {
                echo implode('', array_slice($lines, $startLine, $endLine - $startLine));
            } else {
                readfile($markdown);
            }
            exit;
        }
    }
    // Relative so the same build redirects correctly from peachq.org and from
    // the timestored.com/peachq mirror.
    header('Location: docs/' . $target . '/' . ($anchor === '' ? '' : '#' . $anchor), true, 302);
    exit;
}

if ($format === 'md') {
    http_response_code(404);
    header('Content-Type: text/markdown; charset=UTF-8');
    header('Content-Length: 0');
    exit;
}

http_response_code(404);
include 'template.php';
peachq_page_start('Help topic not found', 'The requested PeachQ help topic was not found.');
?>
<main><section class="page-hero"><div class="container"><span class="tag">Help</span><h1>Help topic not found.</h1><p>No documentation topic matches that query.</p></div></section></main>
<?php peachq_page_end(); ?>
