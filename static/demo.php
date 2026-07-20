<?php
include 'template.php';
peachq_page_start('PeachQ Demo', 'Demo the PeachQ browser runtime.', 'repl');
?>
<main><section class="page-hero"><div class="container"><span class="tag">Runs locally in your browser</span><h1>Try PeachQ.</h1><p>The browser REPL loads the latest PeachQ WebAssembly runtime and evaluates q expressions locally in your tab.</p></div></section>
<section class="section"><div class="container repl-shell">
<div class="repl-panel">
<div class="repl-toolbar"><span>PeachQ browser REPL</span><span id="replStatus">loading runtime</span></div>
<div class="repl-output" id="replOutput"></div>
<div class="repl-line"><span>q)</span><input id="replInput" autocomplete="off" spellcheck="false" autofocus aria-label="q expression"></div>
</div>
<aside class="card examples"><h3>Examples</h3>
<button data-example="til 10">til 10</button>
<button data-example="sum 2 3 4 5">sum 2 3 4 5</button>
<button data-example="avg 10 20 30">avg 10 20 30</button>
<button data-example="reverse 1 2 3 4">reverse 1 2 3 4</button>
<button data-example="6*7">6*7</button>
<button data-example="([]sym:`AAPL`MSFT;px:211.2 493.7)">sample table</button>
<button data-example="select avg px by sym from trade">sample qSQL</button>
<div class="repl-actions">
  <button type="button" data-repl-run>Run</button>
  <button type="button" data-repl-clear>Clear</button>
</div>
<p class="small">Deploy the generated runtime to <code>/wasm/latest/</code>. A <code>manifest.json</code> can declare the artifact name; otherwise the loader tries common PeachQ/OpenQ/Rayforce names.</p>
</aside>
</div></section></main>
<?php peachq_page_end(['/repl.js']); ?>
