<?php
include 'template.php';
peachq_page_start('PeachQ - Open source q preview', 'PeachQ is an open source q implementation built on Rayforce, with DuckDB storage being explored.', 'home');
?>
<main>
<section class="hero"><div class="container hero-grid">
<div>
  <div class="eyebrow"><span class="dot"></span> MIT licensed · community built</div>
  <h1>Peach<span class="peach">Q</span></h1>
  <p class="hero-copy">An open implementation of q for everyone, built on the Rayforce in-memory engine today, with DuckDB-backed storage being shaped for future releases.</p>
  <div class="actions">
    <a class="button peach-button" href="/download">Download PeachQ</a>
    <a class="button primary" href="/repl">Try the live REPL</a>
    <a class="button" href="https://github.com/peachq-org/peachq" target="_blank">View on GitHub ↗</a>
  </div>
  <p class="note">Early project. APIs and compatibility are improving quickly.</p>
</div>
<div class="hero-card">
  <div class="terminal">
    <div class="terminal-head"><i></i><i></i><i></i></div>
    <pre><span class="prompt">q)</span>trade:([]sym:`AAPL`MSFT;px:211.2 493.7)
<span class="result">sym   px</span>
<span class="result">---------</span>
<span class="result">AAPL  211.2</span>
<span class="result">MSFT  493.7</span>

<span class="prompt">q)</span><span class="sql">select avg px by sym from trade</span>
<span class="result">sym | px</span>
<span class="result">----|------</span>
<span class="result">AAPL| 211.2</span>
<span class="result">MSFT| 493.7</span></pre>
    <div class="duck-mark">🍑</div>
  </div>
</div>
</div></section>

<section class="section"><div class="container">
<h2>A modern foundation for q.</h2>
<p class="section-intro">Keep the concise array language and table semantics people love. Add an open implementation, a broad storage ecosystem, and room for the community to move it forward.</p>
<div class="grid-3">
  <div class="card"><div class="card-icon">⚡</div><h3>Fast in memory</h3><p>Built on the high-performance Rayforce engine for vector operations, tables and interactive analysis.</p></div>
  <div class="card"><div class="card-icon duck-icon"><img src="/img/yellow-duck.svg" alt="" aria-hidden="true"></div><h3>DuckDB storage trials</h3><p>DuckDB-backed storage is not in the public release yet. We are looking for volunteers to trial durable tables, SQL and Parquet workflows as they land.</p></div>
  <div class="card"><div class="card-icon">⌘</div><h3>Open everywhere</h3><p>Run q freely on laptops, servers, containers, CI systems and inside the browser.</p></div>
</div>
</div></section>

<section class="section"><div class="container split">
<div><h2>Compatibility you can see.</h2><p class="section-intro">PeachQ is being built in public. The compatibility page tracks language features, qSQL, types, IPC and storage support as each area lands.</p><div class="actions"><a class="button" href="/compatibility">Explore compatibility</a></div></div>
<div class="chart-wrap"><div class="chart-meta"><strong>q compatibility</strong><span id="homeCompatScore">loading current score</span></div><svg id="compatChart" viewBox="0 0 720 300" role="img" aria-label="Compatibility increasing over time"></svg></div>
</div></section>

<section class="section"><div class="container signup">
<div><h2>Follow the build.</h2><p>Detailed development notes live on GitHub. Join the mailing list for release milestones, compatibility progress and invitations to test new builds.</p><small>For now this uses the TimeStored newsletter list.</small></div>
<form class="signup-form" action="https://timestored.us6.list-manage.com/subscribe/post?u=dd21f3c286626a64a81a866db&amp;id=c4b9d1fef9&amp;f_id=0000cde5f0" method="post" target="_blank">
  <input type="email" name="EMAIL" id="mce-EMAIL" placeholder="you@example.com" required>
  <input type="hidden" name="tags" value="3786210,3786211">
  <span class="honeypot" aria-hidden="true"><input type="text" name="b_dd21f3c286626a64a81a866db_c4b9d1fef9" tabindex="-1" autocomplete="off"></span>
  <button type="submit">Join updates</button>
</form>
</div></section>

<section class="section"><div class="container help-build">
  <span class="tag">Community</span>
  <h2>Help build Peach<span class="peach">Q</span>.</h2>
  <p class="section-intro">PeachQ is an open-source community project, and we would love your help.</p>
  <div class="help-list">
    <p><strong>IDE authors</strong> Make existing q editors and IDEs work seamlessly with PeachQ.</p>
    <p><strong>Library maintainers</strong> Help shape an open standard library and reusable package ecosystem.</p>
    <p><strong>q developers</strong> Improve compatibility with tests, examples and real-world workloads.</p>
    <p><strong>Tool builders</strong> Build drivers, language servers, formatters, linters, notebooks and other ecosystem tools.</p>
    <p><strong>Companies using q</strong> Tell us what compatibility matters most to your workflows.</p>
  </div>
  <div class="actions"><a class="button peach-button" href="https://github.com/peachq-org/peachq" target="_blank" rel="noreferrer">Join on GitHub ↗</a><a class="button" href="/contact">Get in touch</a></div>
</div></section>
</main>
<?php peachq_page_end(); ?>
