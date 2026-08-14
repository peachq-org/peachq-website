<?php
declare(strict_types=1);

if ($argc !== 3) {
    fwrite(STDERR, "usage: php tools/build-help-index.php DOCS_DIR OUTPUT\n");
    exit(2);
}

$docsDir = rtrim($argv[1], '/');
$output = $argv[2];
$topics = [];

function topic_slug(string $heading): string {
    $plain = preg_replace('/<[^>]+>/', '', $heading) ?? $heading;
    $plain = str_replace('`', '', $plain);
    $plain = strtolower($plain);
    $plain = preg_replace('/[^a-z0-9]+/', '-', $plain) ?? $plain;
    return trim($plain, '-');
}

function qname_from_signature(string $signature): string {
    $signature = trim($signature);
    if (str_starts_with($signature, '\\')) {
        $command = substr($signature, 1);
        if (preg_match('/^[A-Za-z]+/', $command, $match)) {
            return '\\' . $match[0];
        }
        return '\\' . substr($command, 0, 1);
    }
    foreach ([
        '/^-?\d+!/',                         // -21!x, -27!(x;y)
        '/^-[A-Za-z]\b/',                    // -b, -p
        '/^\.[A-Za-z][A-Za-z0-9.]*/',        // .Q.en[x], .h.hu x
        '/^[A-Za-z][A-Za-z0-9_]*/',           // asc x, select [...]
        '/^[^A-Za-z0-9\s]+/',                 // +, ::, ':
    ] as $pattern) {
        if (preg_match($pattern, $signature, $match)) {
            return $match[0];
        }
    }
    return '';
}

function add_topic(
    array &$topics,
    string $alias,
    string $path,
    string $anchor = '',
    ?int $startLine = null,
    ?int $endLine = null,
    string $kind = 'keyword'
): void {
    $key = trim($alias);
    if ($key === '' || isset($topics[$key])) {
        return;
    }
    $topics[$key] = [
        'qname' => $alias,
        'path' => $path,
        'anchor' => $anchor,
        'kind' => $kind,
    ];
    if ($startLine !== null && $endLine !== null) {
        $topics[$key]['start_line'] = $startLine;
        $topics[$key]['end_line'] = $endLine;
    }
}

function set_topic(array &$topics, string $alias, string $path, string $anchor = '', string $kind = 'alias'): void {
    $topics[$alias] = [
        'qname' => $alias,
        'path' => $path,
        'anchor' => $anchor,
        'kind' => $kind,
    ];
}

// Reference functions win over broader basics pages if an alias ever occurs in
// both. Each filename is an alias; backtick names in the first heading add
// useful aliases such as "iasc" and "xasc" for ref/asc.md.
foreach (['ref', 'basics'] as $section) {
    $files = glob("$docsDir/$section/*.md") ?: [];
    sort($files);
    foreach ($files as $file) {
        $stem = pathinfo($file, PATHINFO_FILENAME);
        $path = "$section/$stem";
        add_topic($topics, $stem, $path, '', null, null, 'page');
        $lines = file($file);
        if ($lines === false) {
            continue;
        }
        $lineCount = count($lines);
        foreach ($lines as $lineNumber => $line) {
            if (!preg_match('/^(#{2,6})\s+(.+)$/', $line, $heading)) {
                continue;
            }
            $level = strlen($heading[1]);
            $anchor = topic_slug($heading[2]);
            if (!preg_match_all('/`([^`]+)`/', $heading[2], $names)) {
                continue;
            }
            $endLine = $lineCount;
            for ($next = $lineNumber + 1; $next < $lineCount; $next++) {
                if (preg_match('/^(#{1,6})\s+/', $lines[$next], $nextHeading)
                    && strlen($nextHeading[1]) <= $level) {
                    $endLine = $next;
                    break;
                }
            }
            // Some namespace entries use consecutive peer headings for names
            // that share one body (notably .Q.en and .Q.ens). If this heading
            // has no content before the next peer, include that peer's body.
            if ($endLine < $lineCount
                && trim(implode('', array_slice($lines, $lineNumber + 1, $endLine - $lineNumber - 1))) === '') {
                for ($next = $endLine + 1; $next < $lineCount; $next++) {
                    if (preg_match('/^(#{1,6})\s+/', $lines[$next], $nextHeading)
                        && strlen($nextHeading[1]) <= $level) {
                        $endLine = $next;
                        break;
                    }
                    $endLine = $lineCount;
                }
            }
            foreach ($names[1] as $nameset) {
                $name = qname_from_signature($nameset);
                if ($name === '') {
                    continue;
                }
                if (preg_match('/^dot([a-z])$/', $stem, $namespace) && $name[0] !== '.') {
                    // Namespace pages often abbreviate their headings ("fpn"
                    // on dotq.md). The callable name is .Q.fpn, never bare fpn.
                    $prefix = $namespace[1] === 'q' ? 'Q' : $namespace[1];
                    $name = '.' . $prefix . '.' . $name;
                }
                $kind = 'keyword';
                if (str_starts_with($name, '.')) {
                    $kind = 'namespace';
                } elseif (str_starts_with($name, '\\')) {
                    $kind = 'system-command';
                } elseif (preg_match('/^-?\d+!$/', $name)) {
                    $kind = 'internal';
                } elseif (preg_match('/^[^A-Za-z0-9]/', $name)) {
                    $kind = 'glyph';
                }
                add_topic($topics, $name, $path, $anchor, $lineNumber, $endLine, $kind);
                if ($section === 'basics' && $stem === 'syscmds' && str_starts_with($name, '\\')) {
                    add_topic($topics, 'system-' . ltrim($name, '\\'), $path, $anchor, $lineNumber, $endLine, 'alias');
                }
            }
        }
    }
}

// A heading like "Apply" is useful prose but q users ask for `.` or `@`.
// Give the language's glyphs a curated primary destination. This deliberately
// overrides incidental matches such as the "@" heading on overloads.md.
$glyphTopics = [
    '.' => ['ref/apply', ''],
    '@' => ['ref/apply', 'apply-at-index-at'],
    ':' => ['ref/assign', ''],
    '+' => ['ref/add', ''],
    '-' => ['ref/subtract', ''],
    '*' => ['ref/multiply', ''],
    '%' => ['ref/divide', ''],
    '=' => ['ref/equal', ''],
    '<>' => ['ref/not-equal', ''],
    '~' => ['ref/match', ''],
    '<' => ['ref/less-than', ''],
    '>' => ['ref/greater-than', ''],
    '|' => ['ref/greater', ''],
    '&' => ['ref/lesser', ''],
    '#' => ['ref/take', ''],
    '_' => ['ref/cut', ''],
    '^' => ['ref/fill', ''],
    ',' => ['ref/join', ''],
    "'" => ['ref/compose', ''],
    '?' => ['ref/find', ''],
    '!' => ['ref/dict', ''],
    '$' => ['ref/cast', ''],
    '0:' => ['ref/file-text', ''],
    '1:' => ['ref/file-binary', ''],
    '2:' => ['ref/dynamic-load', ''],
];
foreach ($glyphTopics as $glyph => [$path, $anchor]) {
    set_topic($topics, $glyph, $path, $anchor, 'glyph');
}
foreach (['.', '@', '$', '!', '?', '+', '-', '*', '%', '=', '~', '<', '>', '|', '&', '#', '_', '^', ','] as $glyph) {
    set_topic($topics, $glyph . ':', 'ref/assign', 'assign-through-operator', 'glyph');
}

// Iterators and control syntax are typed as glyph sequences, not page names.
foreach ([
    "'" => ['ref/overloads', 'quote'],
    "':" => ['ref/overloads', 'quote-colon'],
    '/' => ['ref/overloads', 'slash'],
    '\\' => ['ref/overloads', 'backslash'],
    '/:' => ['ref/maps', 'each-left-and-each-right'],
    '\\:' => ['ref/maps', 'each-left-and-each-right'],
    '$[]' => ['ref/cond', ''],
    '?[]' => ['ref/vector-conditional', ''],
] as $syntax => [$path, $anchor]) {
    set_topic($topics, $syntax, $path, $anchor, 'glyph');
}
foreach ([
    'each-left' => ['ref/maps', 'each-left-and-each-right'],
    'each-right' => ['ref/maps', 'each-left-and-each-right'],
    'each-prior' => ['ref/maps', 'each-prior'],
    'each-parallel' => ['ref/maps', 'each-parallel'],
] as $alias => [$path, $anchor]) {
    set_topic($topics, $alias, $path, $anchor, 'alias');
}

// qSQL phrases are genuine terminal vocabulary even though several do not own
// standalone files.
foreach ([
    'select' => ['ref/select', ''],
    'exec' => ['ref/exec', ''],
    'update' => ['ref/update', ''],
    'delete' => ['ref/delete', ''],
    'from' => ['basics/qsql', 'from-phrase'],
    'where' => ['basics/qsql', 'where-phrase'],
    'by' => ['ref/select', 'by-phrase'],
    'distinct' => ['ref/select', 'select-distinct'],
] as $keyword => [$path, $anchor]) {
    set_topic($topics, $keyword, $path, $anchor, 'qsql');
}

// Datatype names and special values are common REPL questions.
foreach ([
    'boolean' => 'basic-types', 'byte' => 'basic-types', 'short' => 'basic-types',
    'int' => 'basic-types', 'long' => 'basic-types', 'real' => 'basic-types',
    'float' => 'basic-types', 'char' => 'strings', 'string' => 'strings',
    'symbol' => 'symbols', 'timestamp' => 'temporal', 'month' => 'temporal',
    'date' => 'temporal', 'datetime' => 'temporal', 'timespan' => 'temporal',
    'minute' => 'temporal', 'second' => 'temporal', 'time' => 'temporal',
    'guid' => 'guid', 'dictionary' => 'dictionary-and-table', 'table' => 'dictionary-and-table',
    '0N' => 'infinities', '0n' => 'infinities', '0W' => 'infinities', '0w' => 'infinities',
] as $typeName => $anchor) {
    set_topic($topics, $typeName, 'basics/datatypes', $anchor, 'datatype');
}

// Error names are definition-list entries rather than headings, so index their
// explicit anchors. Both the literal q form ('type) and error-type are useful.
$errorLines = file("$docsDir/basics/errors.md") ?: [];
foreach ($errorLines as $lineNumber => $line) {
    if (!preg_match('/^\[\]\(\)\{#([^}]+)\}(.*)$/', trim($line), $error)) {
        continue;
    }
    $anchor = $error[1];
    $name = trim($error[2]);
    for ($next = $lineNumber + 1; $name === '' && $next < count($errorLines); $next++) {
        $name = trim($errorLines[$next]);
    }
    if ($name === '' || str_contains($name, '|') || str_contains($name, '`')) {
        continue;
    }
    set_topic($topics, "'" . $name, 'basics/errors', $anchor, 'error');
    set_topic($topics, 'error-' . $anchor, 'basics/errors', $anchor, 'alias');
}

ksort($topics);
$json = json_encode(
    ['version' => 3, 'topics' => $topics],
    JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
);
if ($json === false || file_put_contents($output, $json . "\n") === false) {
    fwrite(STDERR, "error: could not write $output\n");
    exit(1);
}
