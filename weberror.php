<?php
include 'template.php';
$status = http_response_code();
if ($status === false || $status < 400) {
    http_response_code(404);
}
peachq_page_start('PeachQ - page not found', 'PeachQ error page.');
?>
<main><section class="page-hero"><div class="container"><span class="tag">404</span><h1>Page not found.</h1><p>The page you requested could not be found.</p><div class="actions"><a class="button peach-button" href="./">Go home</a><a class="button" href="repl">Try PeachQ</a></div></div></section></main>
<?php peachq_page_end(); ?>
