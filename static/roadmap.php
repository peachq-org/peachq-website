<?php
include 'template.php';
peachq_page_start('PeachQ Roadmap', 'Where PeachQ is going and how to read the version number.', 'roadmap');
?>
<main>
<section class="page-hero"><div class="container"><span class="tag">Roadmap</span><h1>The version number is the score.</h1><p>Until 1.0, PeachQ's version is its q-conformance pass rate. <code id="roadmapVersionExample">0.41</code> means <span id="roadmapScoreExample">41%</span> of the conformance suite passes today. The suite grows as PeachQ covers more of q, so the number tracks tested behaviour, not a marketing target.</p></div></section>

<section class="section roadmap-page"><div class="container">
<div class="roadmap-score card">
  <div>
    <span class="tag">How to read releases</span>
    <h2>Watch it climb.</h2>
  </div>
  <p>Every new q behaviour needs tests. As more of the corpus turns green, the version number moves with it. New tests can raise the bar, so progress is measured against the current public suite.</p>
</div>

<div class="roadmap-status card">
  <div>
    <span class="tag">Current status</span>
    <h2>Useful, but early.</h2>
  </div>
  <p>PeachQ is already useful for experiments, coding challenges and exploring a free q-like environment. It also has strong performance foundations through Rayforce. It is not yet a drop-in q replacement: important areas such as char and string semantics, on-disk storage, and parts of the long-term architecture are still undecided or unimplemented.</p>
  <p>We are looking for people who want to discuss those choices, try real workloads, and help shape the roadmap. If that sounds useful, please <a href="contact">get in touch</a>.</p>
</div>

<div class="roadmap-grid">
  <article class="roadmap-card card active">
    <span class="roadmap-version">1.0</span>
    <h2><span class="peach">q</span> compatibility</h2>
    <p><strong>The goal: pass every test we have.</strong> 1.0 lands when PeachQ runs the full conformance corpus green: language, datatypes, qSQL, tables, joins, and IPC.</p>
    <ul>
      <li><strong>qSQL depth</strong> - <code>select</code>, <code>exec</code>, <code>update</code>, <code>delete</code>, grouping, functional queries</li>
      <li><strong>Joins</strong> - the <code>lj</code>, <code>ij</code>, <code>uj</code>, <code>aj</code> family on keyed tables</li>
      <li><strong>Core model</strong> - strings, keyed tables, and temporal types</li>
      <li><strong>IPC</strong> - the kdb wire protocol, client and server</li>
      <li><strong>Developer experience</strong> - in-REPL help, docs, and clearer table display</li>
    </ul>
  </article>

  <article class="roadmap-card card">
    <span class="roadmap-version">After 1.0</span>
    <h2>Real workloads</h2>
    <p>With the language solid, PeachQ will be tested with partners against real platforms and their own suites: the behaviours that matter in production, not only the reference docs.</p>
  </article>

  <article class="roadmap-card card">
    <span class="roadmap-version">2.0</span>
    <h2>DuckDB storage, solid</h2>
    <p>PeachQ aims to pair the in-memory q engine with DuckDB as its storage layer: durable storage, SQL, Parquet, and access to a fast-growing data ecosystem.</p>
    <p>Pieces may land earlier, but 2.0 is when the DuckDB story should be production-solid: q tables backed by DuckDB, query pushdown, and drivers that speak the kdb wire.</p>
  </article>
</div>

<div class="roadmap-scope">
  <section class="card roadmap-card">
    <span class="roadmap-version">Will do</span>
    <h2>Next areas of work</h2>
    <ul>
      <li><strong>Cross-platform IPC</strong> - client and server support on Linux, macOS and Windows using the kdb wire protocol</li>
      <li><strong>Broader qSQL and joins</strong> - more query forms, grouped updates and the full join family</li>
      <li><strong>DuckDB-backed storage</strong> - durable q tables, SQL access, Parquet workflows and query pushdown</li>
      <li><strong>More q, release by release</strong> - keep raising the conformance score until PeachQ reaches 1.0</li>
    </ul>
  </section>
  <section class="card roadmap-card">
    <span class="roadmap-version">Not a target</span>
    <h2>Clear boundaries</h2>
    <ul>
      <li><strong>kdb+ on-disk binary compatibility</strong> - PeachQ stores durable data through DuckDB rather than chasing a proprietary file format</li>
      <li><strong>The <code>k)</code> language beneath q</strong> - PeachQ targets q, not the underlying k dialect and escape hatch</li>
      <li><strong>Undocumented internals</strong> - the aim is published q behaviour, not bug-for-bug parity with private quirks</li>
    </ul>
  </section>
</div>

<div class="roadmap-footer card">
  <p>PeachQ is built in public. The compatibility page tracks the score, suite by suite, from the current build.</p>
  <div class="actions">
    <a class="button peach-button" href="compatibility">View compatibility</a>
    <a class="button" href="repl">Try Live</a>
  </div>
</div>
</div></section>
</main>
<?php peachq_page_end(); ?>
