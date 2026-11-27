<?php
include 'template.php';
peachq_page_start('PeachQ - Open-source q, built as a drop-in replacement', 'PeachQ is an open-source, MIT-licensed q runtime built as a drop-in replacement. It runs existing q code and kdb+ databases, with commercial migration and support from TimeStored.', 'home');
?>
<main>
<section class="hero"><div class="container hero-grid">
<div>
  <div class="eyebrow"><span class="dot"></span> PeachQ · MIT licensed · backed by TimeStored</div>
  <h1 class="hero-headline">Open-source q. Built as a <span class="peach" style="white-space:nowrap">drop-in</span> replacement.</h1>
  <p class="hero-copy">Run your existing q code, kdb+ databases and IPC clients on an independent, open-source runtime. Keep the applications and business logic you have invested in, and move your data to open formats when you choose.</p>
  <div class="actions">
    <a class="button peach-button" href="download">Download PeachQ</a>
    <a class="button primary" href="repl">Try the live REPL</a>
    <a class="button" href="migration">Explore commercial migration</a>
  </div>
</div>
<div class="hero-card">
  <div class="terminal">
    <div class="terminal-head"><i></i><i></i><i></i></div>
    <pre><span class="prompt">q)</span>\l hdb
<span class="prompt">q)</span><span class="sql">select vwap:size wavg price by date,sym from trade</span>
<span class="result">| date       | sym    | vwap    |</span>
<span class="result">| date       | symbol | float   |</span>
<span class="result">|============|========|---------|</span>
<span class="result">| 2026.11.13 | IBM    | 101.875 |</span>
<span class="result">| 2026.11.13 | MSFT   | 330.2   |</span>
<span class="result">| 2026.11.14 | IBM    | 103.5   |</span>
<span class="result">| 2026.11.14 | MSFT   | 331     |</span></pre>
  </div>
</div>
</div></section>

<section class="section"><div class="container">
<h2>Already running real q.</h2>
<p class="section-intro">PeachQ is measured in public against q's own behaviour and against open-source q applications. Compatibility is not yet complete, and the known gaps are listed.</p>
<div class="compat-kpis">
  <a class="compat-kpi hero" href="compatibility"><span>q conformance</span><strong id="homeKpiScore">92%</strong><em>of measured q behaviours pass</em></a>
  <a class="compat-kpi" href="compatibility#compatApps"><span>q applications</span><strong id="homeKpiApps">32</strong><em id="homeKpiAppsNote">open-source q projects tested</em></a>
  <a class="compat-kpi" href="news/2026/11/16-peachq-v0-92/"><span>kdb+ databases</span><strong>HDB</strong><em>partitioned and segmented databases load and query</em></a>
  <a class="compat-kpi" href="docs/cookbook/torq/"><span>Frameworks</span><strong>TorQ</strong><em>runs on PeachQ, step by step</em></a>
</div>
<div class="actions"><a class="button" href="compatibility">Detailed compatibility results</a><a class="button" href="roadmap">What is left on the roadmap</a></div>
</div></section>

<section class="section"><div class="container">
<h2>Migrate kdb+ workloads without rewriting your q.</h2>
<p class="section-intro">Replacing your q runtime should not mean rewriting years of applications and business logic. PeachQ runs existing workloads, so you can migrate incrementally, one process at a time.</p>
<div class="grid-3">
  <div class="card"><div class="card-icon">⇄</div><h3>Keep your q applications</h3><p>Reuse existing queries, gateways, tickerplants and business logic. Existing kdb+ clients connect over the same IPC protocol. We validate each workload as part of a migration.</p></div>
  <div class="card"><div class="card-icon duck-icon"><img src="img/yellow-duck.svg" alt="" aria-hidden="true"></div><h3>Modernise storage on your schedule</h3><p>Read your kdb+ databases as they are today, then move data to DuckDB, Parquet and open data lakes when it suits you. Migrating your code and migrating your data become separate projects.</p></div>
  <div class="card"><div class="card-icon">⌘</div><h3>Avoid lock-in</h3><p>An independent, MIT-licensed q runtime with a public roadmap and public compatibility results. No licence fees and no core counts. Run it on servers, laptops, containers, CI and in the browser.</p></div>
</div>
</div></section>

<section class="section"><div class="container">
<h2>q on open data.</h2>
<p class="section-intro">The same qSQL works on open storage. PeachQ hands as much of each query as it can to DuckDB, and returns q tables with q types. These features are new and marked experimental.</p>
<div class="grid-3">
  <a class="card" href="docs/guides/sql-duckdb/"><span class="tag">Experimental</span><h3>DuckDB external tables</h3><p>Keep q tables in a DuckDB file, query them with qSQL or SQL, and let DuckDB do the work.</p></a>
  <a class="card" href="docs/cookbook/hive-parquet/"><span class="tag">Experimental</span><h3>Parquet data lakes</h3><p>Query a hive-partitioned Parquet lake, locally or on S3, with ordinary qSQL.</p></a>
  <a class="card" href="news/2026/11/16-peachq-v0-92/"><span class="tag">0.92</span><h3>Your kdb+ data as it is</h3><p>Load partitioned and segmented kdb+ databases, and write partitions in the kdb+ layout.</p></a>
</div>
</div></section>

<section class="section" id="migration"><div class="container split">
<div>
  <span class="tag">For institutions</span>
  <h2>Commercial migration and support.</h2>
  <p class="section-intro">TimeStored works with financial institutions to migrate existing kdb+ workloads to PeachQ, with agreed compatibility, performance and integration targets.</p>
  <p class="section-intro">PeachQ is developed by <a href="https://www.timestored.com/" target="_blank" rel="noreferrer">TimeStored</a>, the company behind qStudio and Pulse.</p>
  <div class="actions"><a class="button peach-button" href="contact?template=migration#contactForm">Discuss a migration project</a><a class="button" href="migration">How migration works</a></div>
</div>
<div class="card">
  <h3>Typical engagements</h3>
  <ul>
    <li>Migration of existing q applications and gateways</li>
    <li>Compatibility and performance work on your workloads</li>
    <li>Integration with DuckDB, Parquet and open data lakes</li>
    <li>Production readiness and ongoing support</li>
  </ul>
</div>
</div></section>

<section class="section"><div class="container split">
<div><h2>Compatibility you can see.</h2><p class="section-intro">The compatibility page tracks language features, qSQL, types, IPC and storage support as each area lands.</p><div class="actions"><a class="button" href="compatibility">Explore compatibility</a></div></div>
<div class="chart-wrap"><div class="chart-meta"><strong>q compatibility</strong><span id="homeCompatScore">loading current score</span></div><svg id="compatChart" viewBox="0 0 720 300" role="img" aria-label="Compatibility increasing over time"></svg></div>
</div></section>

<section class="section"><div class="container signup">
<div><h2>Open source, built in public.</h2><p>PeachQ is MIT licensed and developed on <a href="https://github.com/peachq-org/peachq" target="_blank" rel="noreferrer">GitHub</a>. Bug reports, compatibility gaps and contributions are welcome. Join the mailing list for release milestones, compatibility progress and invitations to test new builds.</p><small>For now this uses the TimeStored newsletter list.</small></div>
<form class="signup-form" action="https://timestored.us6.list-manage.com/subscribe/post?u=dd21f3c286626a64a81a866db&amp;id=c4b9d1fef9&amp;f_id=0000cde5f0" method="post" target="_blank">
  <input type="email" name="EMAIL" id="mce-EMAIL" placeholder="you@example.com" required>
  <input type="hidden" name="tags" value="3786210,3786211">
  <span class="honeypot" aria-hidden="true"><input type="text" name="b_dd21f3c286626a64a81a866db_c4b9d1fef9" tabindex="-1" autocomplete="off"></span>
  <button type="submit">Join updates</button>
</form>
</div></section>

</main>
<?php peachq_page_end(); ?>
