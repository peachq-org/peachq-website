<?php
include 'template.php';
peachq_page_start('PeachQ Benchmark', 'PeachQ on the NYSE TAQ benchmark: speed in MPH, with DuckDB as 100, against other engines.');
?>
<main>
<section class="page-hero bench-hero"><div class="container"><span class="tag">NYSE TAQ benchmark</span><h1>Query speed, measured.</h1><p>84 queries over a day of NYSE trades and quotes, run by PeachQ and other engines on one machine. Each time is the faster of two warm runs.</p><div class="actions bench-full"><a class="button peach-button" href="data/benchmark/full/">Full results</a></div></div></section>
<section class="section bench-page"><div class="container">
<div class="bench-empty hidden" id="benchEmpty"><h2>No results published yet.</h2><p>Benchmark results appear here once a verified run has been uploaded. The benchmark itself can be run from <a href="https://github.com/peachq-org/NYSETAQBenchmarks">the peachq-org fork</a>.</p></div>
<div id="benchBody">
<div class="compat-toolbar bench-threads"><div><p class="section-intro">Speed is in MPH: <strong class="bench-target">DuckDB = 100 MPH</strong>, and higher is faster. A solution's MPH is 100 divided by the geometric mean, over the queries, of its time over DuckDB's. A query it did not answer counts at twice the worst ratio any solution shown here posted for it.</p></div>
  <div class="compat-tools"><div class="compat-toggle" id="benchThreads" role="group" aria-label="Thread count"></div></div>
</div>
<div class="compat-kpis" id="benchKpis"></div>
<div class="bench-speed">
  <div class="compat-chart">
    <div class="chart-meta"><strong>PeachQ speedometer</strong><span>linear</span></div>
    <svg id="benchGauge" viewBox="0 0 360 236" role="img" aria-label="PeachQ speed in MPH on a 0 to 200 MPH dial"></svg>
    <div class="bench-legend" id="benchGaugeLegend"></div>
  </div>
  <div class="compat-chart">
    <div class="chart-meta"><strong>PeachQ MPH over time</strong><span>by run date, linear</span></div>
    <svg id="benchTrend" viewBox="0 0 640 300" role="img" aria-label="PeachQ MPH by run date"></svg>
    <div class="bench-legend" id="benchTrendLegend"></div>
  </div>
</div>
<div class="compat-chart">
  <div class="chart-meta"><strong>Speed of each solution</strong><span>MPH, linear, longer is faster</span></div>
  <svg id="benchBars" viewBox="0 0 900 320" role="img" aria-label="MPH of each solution, with DuckDB as 100"></svg>
</div>
<div class="compat-toolbar">
  <div><h2>Per query</h2><p class="section-intro">Warm time in milliseconds; a dash means no verified result.</p>
    <p class="bench-legend bench-shade-legend"><span><i class="bench-fast"></i>within 1.3x of the fastest on that query</span><span><i class="bench-slow"></i>more than 10x the fastest</span></p></div>
  <div class="compat-tools"><input id="benchFilter" type="search" placeholder="Filter queries or tags" aria-label="Filter benchmark queries"></div>
</div>
<div class="compat-table-wrap bench-table-wrap"><table class="compat-table bench-table" id="benchTable"><thead></thead><tbody></tbody></table></div>
<p class="note" id="benchMachine"></p>
</div>
<p class="note bench-credit">The benchmark, its queries and the full-results dashboard are <a href="https://github.com/KxSystems/NYSETAQBenchmarks">KX's NYSE TAQ benchmark</a> (Apache-2.0), run by <a href="https://github.com/peachq-org/NYSETAQBenchmarks">the peachq-org fork</a>.</p>
</div></section>
</main>
<?php peachq_page_end(['data/benchmark/data.js', 'benchmark.js']); ?>
