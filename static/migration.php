<?php
include 'template.php';
peachq_page_start('Migrate kdb+ workloads to PeachQ', 'TimeStored migrates q applications for financial institutions to PeachQ, with agreed compatibility, performance and integration targets.', 'migration');
?>
<main>
<section class="page-hero"><div class="container">
  <span class="tag">Migration</span>
  <h1>Move your workloads. <span class="peach">Keep your q.</span></h1>
  <p>TimeStored migrates q applications for financial institutions to PeachQ, with agreed compatibility, performance and integration targets.</p>
  <div class="actions"><a class="button peach-button" href="contact?template=migration#contactForm">Discuss a migration project</a></div>
</div></section>

<section class="section"><div class="container">
<h2>Your q code stays.</h2>
<p class="section-intro">Replace the runtime first, with your data where it is. Move storage later, table by table, with the same qSQL.</p>
<div class="grid-3">
  <div class="card"><div class="card-icon">⇄</div><h3>Same q, same IPC</h3><p>Queries, gateways, tickerplants and business logic run on PeachQ. Existing clients connect over the kdb+ IPC protocol.</p></div>
  <div class="card"><div class="card-icon">▤</div><h3>Your data where it is</h3><p>PeachQ reads and writes kdb+ flat, splayed, partitioned and segmented databases.</p></div>
  <div class="card"><div class="card-icon duck-icon"><img src="img/yellow-duck.svg" alt="" aria-hidden="true"></div><h3>Open storage when you choose</h3><p>Move tables to DuckDB and Parquet. qSQL is pushed down into the storage engine and the answer comes back as a q table. <a href="docs/guides/sql-duckdb/">See how</a>.</p></div>
</div>
</div></section>

<section class="section"><div class="container">
<h2>How an engagement runs.</h2>
<div class="grid-4">
  <div class="card"><span class="tag">1</span><h3>Scope</h3><p>Agree the workloads, targets and success criteria.</p></div>
  <div class="card"><span class="tag">2</span><h3>Pilot</h3><p>Run one process, such as a gateway or RDB, on PeachQ in your environment.</p></div>
  <div class="card"><span class="tag">3</span><h3>Parallel run</h3><p>Run PeachQ alongside production and compare results.</p></div>
  <div class="card"><span class="tag">4</span><h3>Production</h3><p>Cut over, with ongoing support from TimeStored.</p></div>
</div>
</div></section>

<section class="section"><div class="container signup">
<div><h2>Talk to TimeStored.</h2><p>PeachQ is developed by <a href="https://www.timestored.com/" target="_blank" rel="noreferrer">TimeStored</a>, the company behind qStudio and Pulse.</p></div>
<div class="actions"><a class="button peach-button" href="contact?template=migration#contactForm">Discuss a migration project</a></div>
</div></section>
</main>
<?php peachq_page_end(); ?>
