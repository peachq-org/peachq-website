<?php
include 'template.php';
peachq_page_start('PeachQ Browser REPL', 'Try PeachQ in a browser REPL.', 'repl');
?>
<main class="repl-page"><section class="page-hero"><div class="container"><span class="tag">Runs locally in your browser</span><h1>Try Peach<span class="peach">Q</span>.</h1><p>The browser REPL loads the latest PeachQ WebAssembly runtime and evaluates q expressions locally in your tab.</p></div></section>
<section class="section"><div class="container repl-shell">
<div class="repl-panel">
<div class="repl-toolbar">
  <span>PeachQ browser REPL</span>
  <div class="repl-actions">
    <button type="button" id="replCopy">Copy output</button>
    <button type="button" id="replShare">Share latest</button>
    <button type="button" class="repl-icon-button repl-full-theme" data-repl-theme-toggle aria-label="Toggle color theme" title="Toggle light/dark theme">◐</button>
    <button type="button" class="repl-expand-button" id="replExpand" aria-label="Open editor mode" aria-expanded="false">Editor mode</button>
    <span class="repl-status-dot" id="replStatus" role="status" aria-label="loading runtime"></span>
  </div>
  <button type="button" class="repl-close-button" id="replClose" aria-label="Close fullscreen REPL">×</button>
  <span class="repl-toast" id="replToast" role="status" aria-live="polite"></span>
</div>
<div class="repl-workspace">
  <section class="repl-editor-pane" aria-label="q editor">
    <div class="repl-editor-head">
      <span>q editor</span>
      <div>
        <div class="repl-editor-menu">
          <button type="button" id="replOpenToggle" aria-expanded="false" aria-controls="replOpenMenu">Open <span aria-hidden="true">▾</span></button>
          <div class="repl-editor-menu-panel" id="replOpenMenu" hidden>
            <strong>Editor examples</strong>
            <button type="button" data-editor-example="/examples/example-first-open.q">First open</button>
            <button type="button" data-editor-example="/examples/example-operations.q">Operations</button>
            <button type="button" data-editor-example="/examples/example-casting.q">Casting</button>
            <button type="button" data-editor-example="/examples/example-functions.q">Functions</button>
            <button type="button" data-editor-example="/examples/example-tables.q">Tables</button>
          </div>
        </div>
        <button type="button" class="repl-icon-button" id="replExportTabs" aria-label="Export workspace" title="Export workspace">↓</button>
        <button type="button" class="repl-icon-button" id="replImportTabs" aria-label="Import workspace" title="Import workspace">↑</button>
        <button type="button" class="repl-icon-button" id="replThemeToggle" data-repl-theme-toggle aria-label="Toggle color theme" title="Toggle light/dark theme">◐</button>
        <button type="button" id="replRunLine" title="Control+Enter" aria-label="Run current line, Control+Enter">Run line</button>
        <button type="button" id="replRunSelection" title="Control+E" aria-label="Run selection, Control+E">Run selection</button>
      </div>
    </div>
    <div class="repl-tabs" id="replTabs" role="tablist" aria-label="Editor files"></div>
    <div class="repl-editor-wrap">
      <pre class="repl-highlight" aria-hidden="true"><code id="replEditorHighlight"></code></pre>
      <textarea id="replEditor" spellcheck="false" autocomplete="off" aria-label="q editor"></textarea>
    </div>
    <input type="file" id="replImportInput" accept="application/json,.json" hidden>
  </section>
  <section class="repl-terminal-pane" aria-label="q terminal">
    <div class="repl-console-head"><span>console</span><span>live output</span></div>
    <div class="repl-output" id="replOutput"></div>
    <div class="repl-line"><span>q)</span><input id="replInput" autocomplete="off" spellcheck="false" autofocus aria-label="q expression"></div>
  </section>
</div>
</div>
<aside class="card examples"><h3>Examples</h3>
<button data-example="til 10">til 10</button>
<button data-example="sum 2 3 4 5">sum 2 3 4 5</button>
<button data-example="avg 10 20 30">avg 10 20 30</button>
<button data-example="reverse 1 2 3 4">reverse 1 2 3 4</button>
<button data-example="6*7">6*7</button>
<button data-example="trade:([]sym:`AAPL`MSFT;px:211.2 493.7)">sample table</button>
<button data-example="trade:([]sym:`AAPL`MSFT;px:211.2 493.7);select avg px by sym from trade">sample qSQL</button>
<div class="repl-menu">
  <button type="button" id="replExamplesToggle" aria-expanded="false" aria-controls="replExamplesMenu">More examples <span aria-hidden="true">▾</span></button>
  <div class="repl-menu-panel" id="replExamplesMenu" hidden>
    <strong>Snippet examples</strong>
    <button type="button" data-rich-example="t:([]a:1 2 3;b:10 20 30);select a,b from t where a&gt;1">select with where</button>
    <button type="button" data-rich-example="t:([]a:1 2 3;b:10 20 30);select sum a from t">aggregate table column</button>
    <button type="button" data-rich-example="t:([]sym:`AAPL`MSFT`NVDA;px:211.2 493.7 167.9);select avg px by sym from t">group by symbol</button>
    <button type="button" data-rich-example="(+) scan 1 2 3 4 5">running sum</button>
    <button type="button" data-rich-example="(*) over 1 2 3 4 5">product over list</button>
    <button type="button" data-rich-example="flip `sym`price`size!(`IBM`MSFT;10.2 23.45;100 100)">flip dictionary to table</button>
    <button type="button" data-rich-example="x:([]a:1 2 3;b:`I`J`K;c:10 20 30);y:([a:1 3;b:`I`K]c:1 2;d:10 20);x lj y">left join keyed table</button>
  </div>
</div>
<div class="repl-help">
  <a class="repl-bug-button" id="replBugLink" href="https://github.com/peachq-org/peachq/issues/new" target="_blank" rel="noreferrer">Report a bug</a>
</div>
</aside>
</div></section></main>
<?php peachq_page_end(['repl.js']); ?>
