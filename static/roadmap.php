<?php
include 'template.php';
peachq_page_start('PeachQ Roadmap', 'Where PeachQ is today and the engineering options for what comes next.', 'roadmap');
?>
<main>
<section class="page-hero"><div class="container">
  <span class="tag">Open source · Engineering roadmap</span>
  <h1>Compatible by design.<br><span class="peach">Fast by ambition.</span></h1>
  <p>Open-source q. Built on correctness, proven against real applications and engineered for demanding workloads.</p>
</div></section>

<section class="section roadmap-page"><div class="container">
<div class="rm-metrics">
  <div class="card rm-metric"><strong>92.1%</strong><span>Language conformance</span></div>
  <div class="card rm-metric"><strong>3.8×</strong><span>Benchmark speedup vs earlier PeachQ (geomean)</span></div>
  <div class="card rm-metric"><strong>16,288</strong><span>Documented examples</span></div>
  <div class="card rm-metric"><strong>32</strong><span>Third-party projects graded</span></div>
</div>

<div class="card rm-panel">
  <span class="tag">Two chapters · One engineering programme</span>
  <h2>Correctness first. Performance next.</h2>
  <div class="rm-chapters">
    <article class="rm-chapter">
      <span class="tag">Chapter 01 · Towards 1.0</span>
      <h3>Compatibility</h3>
      <svg class="rm-chart" viewBox="0 0 480 240" role="img" aria-label="Conformance rose from 66.2% to 92.1%">
        <path class="grid" d="M42 35H450 M42 75H450 M42 115H450 M42 155H450 M42 195H450"/>
        <g class="axis"><text x="6" y="39">100%</text><text x="12" y="79">90%</text><text x="12" y="119">80%</text><text x="12" y="159">70%</text><text x="12" y="199">60%</text></g>
        <path class="conf-area" d="M50 170.2L150 110.2L250 83L350 79L450 66.6V195H50Z"/>
        <path class="conf" d="M50 170.2L150 110.2L250 83L350 79L450 66.6"/>
        <g class="conf-pt" text-anchor="middle"><circle cx="50" cy="170.2" r="4"/><text x="50" y="158.2">66.2%</text><circle cx="150" cy="110.2" r="4"/><text x="150" y="98.2">81.2%</text><circle cx="250" cy="83" r="4"/><text x="250" y="71">88%</text><circle cx="350" cy="79" r="4"/><text x="350" y="67">89%</text><circle cx="450" cy="66.6" r="4"/><text x="450" y="54.6">92.1%</text></g>
        <g class="axis" text-anchor="middle"><text x="50" y="220">Jul</text><text x="150" y="220">Aug</text><text x="250" y="220">Sep</text><text x="350" y="220">Oct</text><text x="450" y="220">Nov</text></g>
      </svg>
      <p>66.2% to 92.1% conformance while the documented test corpus more than doubled.</p>
    </article>
    <article class="rm-chapter">
      <span class="tag">Chapter 02 · Performance</span>
      <h3>Less time. More work.</h3>
      <svg class="rm-chart" viewBox="0 0 480 240" role="img" aria-label="Measured total benchmark runtime fell from 4541 to 619 milliseconds; dashed future direction is illustrative">
        <path class="grid" d="M40 35H450 M40 75H450 M40 115H450 M40 155H450 M40 195H450"/>
        <path class="perf" d="M50 49.7L245 175.2"/>
        <path class="perf-future" d="M245 175.2Q340 188 450 193"/>
        <g class="perf-pt"><circle cx="50" cy="49.7" r="5"/><circle cx="245" cy="175.2" r="5"/><text x="50" y="36">4,541 ms</text><text x="245" y="162" text-anchor="middle">619 ms</text></g>
        <g class="axis" style="font-size:12px"><text x="50" y="220">Baseline</text><text x="245" y="220" text-anchor="middle">Today</text><text x="450" y="220" text-anchor="end">Future</text><text x="340" y="90" text-anchor="middle">Fusion · SIMD</text><text x="340" y="108" text-anchor="middle">Parallelism · compilation</text><text x="340" y="126" text-anchor="middle">Illustrative direction</text></g>
      </svg>
      <p>104 benchmark cases. 3.8× geometric-mean speedup. Chart shows total runtime; dashed line is illustrative, not a target or forecast.</p>
    </article>
  </div>
  <div class="rm-journey">
    <article><span class="tag">2023 – Jun 2026</span><h3>Engine foundations</h3><p>C17 columnar engine, kernels and thread pool.</p></article>
    <article><span class="tag">Jul – Aug 2026</span><h3>Language compatibility</h3><p>q, qSQL, IPC and conformance.</p></article>
    <article><span class="tag">Sep – Nov 2026</span><h3>Real applications</h3><p>embedPy, DuckDB, on-disk databases and tooling.</p></article>
    <article><span class="tag">Future direction</span><h3>Production scale</h3><p>Parallel queries, compiled execution and historical data.</p></article>
  </div>
</div>

<div class="rm-tracks">
  <span class="tag">Seven engineering tracks</span>
  <h2 class="section-title">Where we are. Where we could go.</h2>
  <p class="section-intro">Current capabilities are available in the latest release, with known gaps and ongoing improvements. Potential next steps are scoped engineering options, not release commitments. Priorities are shaped with users and funding partners.</p>

  <article class="rm-track"><h3>Testing &amp; compatibility</h3><div class="rm-done"><span class="tag">Current capability</span><p>Doc-derived conformance corpus, real-app grading, real kdb+ files</p></div><div class="rm-next"><span class="tag">Potential next steps</span><p>Evaluator fuzzing, fast-path equivalence, customer workload suites</p></div></article>

  <article class="rm-track"><h3>Execution speed</h3><div class="rm-done"><span class="tag">Current capability</span><p>Typed kernels and two measured performance chains: the benchmark suite runs 3.8× faster (geomean)</p></div><div class="rm-next"><span class="tag">Potential next steps</span><p>Interpreter overheads, operator fusion, compiled execution</p></div></article>
  <details class="card rm-deep"><summary>Explore performance engineering</summary>
    <h3>Fewer passes. Less allocation.</h3>
    <p>Today, typed vector kernels and in-place updates remove substantial overhead. A potential next step is to fuse compatible atomic operations into a single pass.</p>
    <div class="rm-example">
      <div><span class="tag">Separate vector operations · conceptual</span><pre>tmp:b*c
result:a+tmp</pre><div class="rm-pipeline"><span>Multiply</span> → <span>Temporary vector</span> → <span>Add</span></div></div>
      <div><span class="tag">Potential fused execution</span><pre>a+b*c
/ one loop, where semantics permit</pre><div class="rm-pipeline"><span>Multiply + add</span> → <span>Result</span></div></div>
    </div>
    <p>Other opportunities: atomic each as a vector call, lower lambda overhead, explicit SIMD and a graph/VM executor. Optimised execution must agree with the reference evaluator; no future speedup is claimed.</p>
  </details>

  <article class="rm-track"><h3>Parallelisation</h3><div class="rm-done"><span class="tag">Current capability</span><p>Thread pool in core kernels, worker processes</p></div><div class="rm-next"><span class="tag">Potential next steps</span><p>Threaded where/by, per-partition map-reduce, peach across processes</p></div></article>

  <article class="rm-track"><h3>On-disk databases</h3><div class="rm-done"><span class="tag">Current capability</span><p>Reads and writes kdb+ flat, splayed, partitioned and segmented databases</p></div><div class="rm-next"><span class="tag">Potential next steps</span><p>Efficient partitioned queries, Snappy/zstd, encryption</p></div></article>
  <details class="card rm-deep"><summary>Explore partitioned query execution</summary>
    <h3>From opening an HDB to querying it efficiently</h3>
    <p>Current partitioned queries build an in-memory table from the partitions read. The next opportunity is to execute eligible queries partition by partition and combine partial results.</p>
    <pre>select avg price by sym from trade where date within 2026.11.01 2026.11.03</pre>
    <div class="rm-example">
      <div><span class="tag">Current approach</span><div class="rm-pipeline"><span>Read partitions</span> → <span>Combine rows</span> → <span>Aggregate</span></div></div>
      <div><span class="tag">Potential map-reduce</span><div class="rm-pipeline"><span>Per-partition sum / count</span> → <span>Merge</span> → <span>Average</span></div></div>
    </div>
    <p>The goal is to avoid materialising all selected rows for eligible aggregations, and exploit parallelism across partitions.</p>
  </details>

  <article class="rm-track"><h3>Interfaces &amp; IPC</h3><div class="rm-done"><span class="tag">Current capability</span><p>kdb+ wire client and server, TLS, HTTP, WebSockets, 2:, FFI, Kafka</p></div><div class="rm-next"><span class="tag">Potential next steps</span><p>Unix domain sockets, host-managed reconnect</p></div></article>

  <article class="rm-track"><h3>Data lake &amp; engines</h3><div class="rm-done"><span class="tag">Current capability</span><p>DuckDB with qSQL pushdown, Parquet, S3; ClickHouse pushdown proof of concept</p></div><div class="rm-next"><span class="tag">Potential next steps</span><p>Production ClickHouse provider, DuckLake, q tables shared in place</p></div></article>
  <details class="card rm-deep"><summary>Explore qSQL pushdown</summary>
    <h3>Bring the query to the data</h3>
    <div class="rm-example">
      <div><span class="tag">Current · DuckDB foreign table</span><pre>select volume:sum size by sym
 from trade where sym in `AAPL`MSFT</pre><p>Illustrative qSQL: eligible filters and grouping/aggregates can be pushed down; remaining operations execute in q. Support depends on the expression.</p></div>
      <div><span class="tag">Potential · joins and further engines</span><pre>aj[`sym`time;trade;quote]</pre><p>As-of and window join pushdown, production ClickHouse, first-class DuckLake and shared in-memory tables.</p></div>
    </div>
    <h3>ClickHouse proof of concept · 100 million trades</h3>
    <div class="rm-bench">
      <span>Pull into q</span><div style="--w:100%" class="rm-bar"></div><strong>6,358 ms</strong>
      <span>Pushed qSQL</span><div style="--w:0.66%" class="rm-bar peach"></div><strong>42 ms</strong>
      <span>Native SQL</span><div style="--w:0.42%" class="rm-bar"></div><strong>27 ms</strong>
    </div>
    <p>5-minute OHLCV bars, three symbols, one day. Median of seven warm runs. Proof of concept, not a production provider.</p>
  </details>

  <article class="rm-track"><h3>Developer tooling</h3><div class="rm-done"><span class="tag">Current capability</span><p>Debugger, profiler, linter, language server diagnostics</p></div><div class="rm-next"><span class="tag">Potential next steps</span><p>Outline, go-to-definition, hover, completion</p></div></article>
</div>

<div class="card rm-cta">
  <div>
    <span class="tag">Open source. Customer-driven.</span>
    <h2>Help shape the next stage.</h2>
    <p>Bring your q applications and datasets. We can turn your workloads into tracked test suites and prioritise the engineering that matters to your production environment.</p>
  </div>
  <a class="button peach-button" href="contact?template=migration#contactForm">Talk to us</a>
</div>

<p class="rm-note">Roadmap snapshot: 23 November 2026. Future options are not release commitments. PeachQ is independent and MIT-licensed. Benchmark speedup is relative to earlier PeachQ builds, not kdb+.</p>
</div></section>
</main>
<?php peachq_page_end(); ?>
