<?php
declare(strict_types=1);

$GLOBALS['peachq_scripts'] = [];

function peachq_esc(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

/**
 * Emits per-page <script> tags. Called from the generated footer partial,
 * immediately before </body>.
 */
function peachq_emit_scripts(): void {
    foreach ($GLOBALS['peachq_scripts'] as $src) {
        echo '<script src="' . peachq_esc($src) . '"></script>' . "\n";
    }
}

function peachq_page_start(string $title, string $description = '', string $active = ''): void {
    // $title and $description are consumed by the generated header partial's
    // PHP expressions, which is why they are included from inside this scope.
    include __DIR__ . '/partials/header.php';

    // The generated chrome carries no active nav item, because it was rendered
    // from one specific page and the split strips the marker. Mark the entry
    // matching this page client-side instead.
    if ($active !== '') {
        echo '<script>(function(){var p=location.pathname.replace(/\/$/,"");'
           . 'document.querySelectorAll(".md-tabs__link,.md-nav__link").forEach(function(a){'
           . 'if(a.getAttribute("href")&&new URL(a.href).pathname.replace(/\/$/,"")===p){'
           . 'a.classList.add(a.classList.contains("md-tabs__link")'
           . '?"md-tabs__link--active":"md-nav__link--active");}});})();</script>' . "\n";
    }
}

function peachq_page_end(array $scripts = []): void {
    $GLOBALS['peachq_scripts'] = $scripts;
    include __DIR__ . '/partials/footer.php';
}
