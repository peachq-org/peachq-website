<?php
include 'template.php';
peachq_page_start('PeachQ Compatibility', 'Track PeachQ q compatibility progress.', 'compatibility');
?>
<main>
<section class="page-hero compat-hero"><div class="container"><span class="tag">Public progress</span><h1>Compatibility, tracked.</h1><p>Generated from the PeachQ conformance ledger: q behaviour coverage, trend, suite heatmap, and robustness checks from the current build.</p></div></section>
<section class="section compat-page"><div class="container">
<div class="compat-kpis" id="compatKpis"></div>
<div class="compat-chart">
  <div class="chart-meta"><strong id="compatChartTitle">q behaviours over time</strong><span id="compatUpdated"></span></div>
  <svg id="compatTrend" viewBox="0 0 900 320" role="img" aria-label="PeachQ compatibility trend"></svg>
</div>
<div class="compat-toolbar">
  <div><h2>Feature heatmap</h2><p class="section-intro">Each tile is a generated suite. Hover for the source filename and pillar.</p></div>
  <div class="compat-tools">
    <div class="compat-toggle" role="tablist" aria-label="Compatibility view">
      <button type="button" id="compatViewHeat" aria-pressed="true">Heatmap</button>
      <button type="button" id="compatViewTable" aria-pressed="false">Table</button>
    </div>
    <input id="compatFilter" type="search" placeholder="Filter areas or suites" aria-label="Filter compatibility rows">
  </div>
</div>
<div id="compatHeat" class="compat-heat"></div>
<div class="compat-table-wrap hidden" id="compatTableWrap">
  <table class="compat-table" id="compatTable"><thead></thead><tbody></tbody></table>
</div>
<div class="compat-qmatrix" id="compatQmatrix"></div>
</div></section>
</main>
<?php peachq_page_end(['/data/qdash/data.js', '/compatibility.js']); ?>
