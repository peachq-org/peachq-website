<?php
include 'template.php';
peachq_page_start('PeachQ Compatibility', 'Track PeachQ q compatibility progress.', 'compatibility');
?>
<main>
<section class="page-hero compat-hero"><div class="container"><span class="tag">Public progress</span><h1>Compatibility, tracked.</h1><p>Generated from the PeachQ conformance ledger: q behaviour coverage, trend, suite heatmap, and robustness checks from the current build.</p></div></section>
<section class="section compat-page"><div class="container">
<div class="compat-kpis" id="compatKpis"></div>
<?php peachq_ondisk_notice(); ?>
<section class="compat-apps" id="compatApps">
  <div class="compat-toolbar"><div><h2>Apps and libraries</h2><p class="section-intro">With most of the q behaviours we measure now passing, we are shifting focus from language areas to real code: open-source q projects, run on PeachQ with their own tests at their latest upstream commit. A grade below Works means PeachQ does not run that project fully yet; it is not a fault in the project.</p></div><div class="compat-tools"><a class="button peach-button" href="https://github.com/peachq-org/peachq/issues/new?title=Add%20app%3A%20&amp;body=Repository%3A%20%0AHow%20to%20run%20its%20tests%3A%20%0AAnything%20we%20should%20know%3A%20" target="_blank" rel="noreferrer">Add your project ↗</a></div></div>
  <div class="apps-summary"></div>
  <div class="compat-table-wrap"><table class="compat-table apps-table"><thead><tr><th class="apps-c-project">Project</th><th class="apps-c-author apps-author">Author</th><th class="apps-about">About</th><th class="apps-c-stars">Stars</th><th class="apps-c-grade">Grade</th><th class="apps-c-tests">Tests</th></tr></thead><tbody></tbody></table></div>
  <p class="apps-note">When we rerun the list, any project whose results drop is flagged, so we see changes in PeachQ that would break it. Authors are also thanked on the <a href="thanks/">thanks page</a>. To show your project's grade in its README, use <code>[![PeachQ](https://peachq.org/apps-badge.php?app=NAME)](https://peachq.org/compatibility#app-NAME)</code>.</p>
</section>
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
<?php peachq_page_end(['data/qdash/data.js', 'compatibility.js', 'compat-apps.js']); ?>
