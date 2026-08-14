<?php
declare(strict_types=1);

/** Resolve a Markdown target against its original imported source file. */
function peachq_help_absolute_target(string $target, string $source, string $docsRoot): string {
    if ($target === '' || preg_match('~^(?:[a-z][a-z0-9+.-]*:|//)~i', $target)) {
        return $target;
    }
    if ($target[0] === '#') {
        $sourcePage = substr($source, -3) === '.md' ? substr($source, 0, -3) . '/' : $source;
        return 'https://peachq.org/docs/' . $sourcePage . $target;
    }
    if ($target[0] === '/') {
        return 'https://code.kx.com' . $target;
    }

    $fragment = '';
    $hash = strpos($target, '#');
    if ($hash !== false) {
        $fragment = substr($target, $hash);
        $target = substr($target, 0, $hash);
    }
    $parts = explode('/', dirname($source) . '/' . $target);
    $resolved = [];
    foreach ($parts as $part) {
        if ($part === '' || $part === '.') {
            continue;
        }
        if ($part === '..') {
            array_pop($resolved);
        } else {
            $resolved[] = $part;
        }
    }
    $path = implode('/', $resolved);
    $localFile = rtrim($docsRoot, '/') . '/' . $path;
    $isImported = strpos($path, 'basics/') === 0 || strpos($path, 'ref/') === 0;

    if ($isImported && is_file($localFile)) {
        if (substr($path, -3) === '.md') {
            return 'https://peachq.org/docs/' . substr($path, 0, -3) . '/' . $fragment;
        }
        return 'https://peachq.org/docs/' . $path . $fragment;
    }

    // A relative target outside the imported snapshot belongs to the original
    // documentation site. Its MkDocs HTML URLs use directories, not .md.
    if (substr($path, -3) === '.md') {
        $path = substr($path, 0, -3) . '/';
    }
    return 'https://code.kx.com/q/' . $path . $fragment;
}

/** Rewrite Markdown links and make images explicit for text-only clients. */
function peachq_help_rewrite_links(string $line, string $source, string $docsRoot): string {
    return preg_replace_callback(
        '~(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)~',
        static function (array $match) use ($source, $docsRoot): string {
            $target = peachq_help_absolute_target($match[3], $source, $docsRoot);
            $label = $match[2];
            if ($match[1] === '!') {
                $label = 'Image: ' . ($label === '' ? 'illustration' : $label);
            }
            return '[' . $label . '](' . $target . ')';
        },
        $line
    ) ?? $line;
}

/** Convert PyMdown admonitions to portable Markdown blockquotes. */
function peachq_help_convert_admonitions(array $lines): array {
    $output = [];
    $inAdmonition = false;
    $pendingBlank = false;
    foreach ($lines as $line) {
        // The title may itself contain quoted q literals, for example `"j"`.
        if (!$inAdmonition && preg_match('/^\s*!!!\s+([a-z0-9_-]+)(?:\s+"(.*)")?\s*$/i', $line, $match)) {
            $label = ucfirst(str_replace(['-', '_'], ' ', $match[1]));
            $title = trim($match[2] ?? '');
            $output[] = '> **' . $label . ($title === '' ? '' : ' — ' . $title) . '**';
            $inAdmonition = true;
            $pendingBlank = false;
            continue;
        }
        if ($inAdmonition) {
            if ($line === '') {
                $pendingBlank = true;
                continue;
            }
            if (preg_match('/^(?:    |\t)(.*)$/', $line, $match)) {
                if ($pendingBlank) {
                    $output[] = '>';
                }
                $output[] = '> ' . $match[1];
                $pendingBlank = false;
                continue;
            }
            $inAdmonition = false;
            $pendingBlank = false;
        }
        $output[] = $line;
    }
    return $output;
}

/** Collapse excess blank lines while preserving whitespace inside code. */
function peachq_help_compact_blank_lines(array $lines): array {
    $output = [];
    $inFence = false;
    $blank = false;
    foreach ($lines as $line) {
        if (preg_match('/^(?:>\s*)?\s*(```+|~~~+)/', $line)) {
            $inFence = !$inFence;
        }
        if (!$inFence && $line === '') {
            if ($blank) {
                continue;
            }
            $blank = true;
        } else {
            $blank = false;
        }
        $output[] = $line;
    }
    return $output;
}

/** Produce portable, compact Markdown for q terminals and simple clients. */
function peachq_help_transform_markdown(string $markdown, string $source, string $docsRoot): string {
    $markdown = str_replace(["\r\n", "\r"], "\n", $markdown);
    $markdown = preg_replace('/\A---\n.*?\n---\n/s', '', $markdown, 1) ?? $markdown;
    $lines = explode("\n", $markdown);
    $output = [];
    $inFence = false;
    $inComment = false;
    $inStyle = false;
    $inTypewriter = false;

    foreach ($lines as $line) {
        if (preg_match('/^\s*(```+|~~~+)/', $line)) {
            $inFence = !$inFence;
            $output[] = $line;
            continue;
        }
        if ($inFence) {
            $output[] = $line;
            continue;
        }

        if ($inComment) {
            if (strpos($line, '-->') !== false) {
                $inComment = false;
            }
            continue;
        }
        if (strpos($line, '<!--') !== false) {
            if (strpos($line, '-->') === false) {
                $inComment = true;
            }
            continue;
        }
        if ($inStyle) {
            if (strpos(strtolower($line), '</style>') !== false) {
                $inStyle = false;
            }
            continue;
        }
        if (preg_match('/^\s*<style\b/i', $line)) {
            if (strpos(strtolower($line), '</style>') === false) {
                $inStyle = true;
            }
            continue;
        }

        if (preg_match('/^\s*<div\b[^>]*class="[^"]*typewriter[^"]*"[^>]*>\s*$/i', $line)) {
            $output[] = '```text';
            $inTypewriter = true;
            continue;
        }
        if ($inTypewriter && preg_match('/^\s*<\/div>\s*$/i', $line)) {
            $output[] = '```';
            $inTypewriter = false;
            continue;
        }
        if (preg_match('/^\s*<\/?div\b[^>]*>\s*$/i', $line)) {
            continue;
        }
        if (preg_match('/^\s*<br\s*\/?>\s*$/i', $line)
            || preg_match('/^\s*\[\]\(\)\{#[^}]+\}\s*$/', $line)
            || preg_match('/^\s*\{:\s*.*\}\s*$/', $line)) {
            $output[] = '';
            continue;
        }

        $line = preg_replace('/:fontawesome-[a-z0-9-]+:/i', '', $line) ?? $line;
        $line = preg_replace('~</?small>~i', '', $line) ?? $line;
        $line = str_replace('&nbsp;', ' ', $line);
        $line = peachq_help_rewrite_links($line, $source, $docsRoot);
        $output[] = $line;
    }

    if ($inTypewriter) {
        $output[] = '```';
    }
    $output = peachq_help_convert_admonitions($output);
    $output = peachq_help_compact_blank_lines($output);
    return trim(implode("\n", $output)) . "\n";
}
