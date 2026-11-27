<?php
include 'template.php';
peachq_page_start('About PeachQ', 'About the PeachQ open source q implementation.', 'about');
?>
<main><section class="page-hero"><div class="container"><span class="tag">Why PeachQ</span><h1>Give <span class="peach">q</span> the open future it deserves.</h1><p>q is one of the most productive languages ever built for time-series and analytical systems. PeachQ is an open-source q runtime, built to run existing q applications and kdb+ databases, with open storage such as DuckDB and Parquet alongside.</p></div></section>
<section class="section"><div class="container about-grid">
<div class="card"><h2>The idea</h2><p class="quote">Keep your q. Choose your storage.</p><p>Rayforce provides a compact, pure-C engine for interactive vector operations. PeachQ reads and writes kdb+ on-disk data, including partitioned and segmented databases, and adds DuckDB external tables and Parquet as open storage. Firms can migrate their q applications first and move their data when it suits them.</p></div>
<div class="card"><h2>Why open</h2><p>q should be usable in every environment: education, personal projects, open-source tools, commercial systems and cloud services.</p><p>An open implementation lets the community improve compatibility, build tooling, experiment with new ideas and ensure the language continues to evolve.</p></div>
<div class="card"><h2>Background</h2><p>PeachQ is currently led by Ryan Hamilton, founder of TimeStored. Since 2012, Ryan has created q tutorials, delivered kdb training and built tools for the q community.

</p><p>He is the creator of QStudio, first released in 2013 and open sourced in 2025 after more than a decade of development. He also created Pulse, a real-time analytics platform supporting dozens of databases.

</p><p>Before founding TimeStored, Ryan worked on kdb systems at UBS, Morgan Stanley and Citi. PeachQ builds on that experience.</p></div>
<div class="card"><h2>Backed by TimeStored</h2><p>PeachQ is developed by <a href="https://www.timestored.com/" target="_blank" rel="noreferrer">TimeStored</a>, the company behind qStudio and Pulse. TimeStored works with financial institutions to migrate existing kdb+ workloads to PeachQ, with ongoing support.</p><div class="actions"><a class="button peach-button" href="contact?template=migration#contactForm">Discuss a migration project</a></div></div>
<div class="card"><h2>Open source</h2><p>PeachQ is MIT licensed, and the goal is larger than a compatible runtime: an open home for the language, drivers, editor integrations, documentation, tests and the ecosystem around them.</p><div class="actions"><a class="button peach-button" href="https://github.com/peachq-org/peachq">Join on GitHub ↗</a><a class="button" href="roadmap">See the roadmap</a></div></div>
</div></section>
<section class="section"><div class="container thanks-section">
<div>
  <span class="tag">Thanks</span>
  <h2>Built on open work.</h2>
  <p class="section-intro">PeachQ exists because a lot of people have already shared engines, parsers, databases, documentation, examples and hard-won q knowledge.</p>
</div>
<div class="thanks-grid">
  <div class="card thanks-card"><h3>Rayforce</h3><p>Thanks to Anton and the Rayforce contributors for the pure-C, in-memory vector engine PeachQ builds on. That work gives PeachQ a compact native core for arrays, tables and interactive evaluation.</p></div>
  <div class="card thanks-card"><h3>DuckDB</h3><p>Thanks to Hannes, Mark and the DuckDB community for the database engine we are building PeachQ's durable-data story around. DuckDB brings local analytics, Parquet, SQL and a serious storage ecosystem to the project.</p></div>
  <div class="card thanks-card thanks-card-wide"><h3>The wider q community</h3><p>Thanks to the people who have published q tutorials, examples, tools, documentation, tests, puzzles and libraries over the years. That includes past contributions from <a href="https://www.linkedin.com/in/charlesskelton/" target="_blank" rel="noreferrer">Charlie Skelton</a>, <a href="https://github.com/jshinonome" target="_blank" rel="noreferrer">Jo Shinonome</a>, <a href="https://github.com/qbists" target="_blank" rel="noreferrer">Stephen Taylor</a>, <a href="https://github.com/adotsch/aoc" target="_blank" rel="noreferrer">András Dőtsch</a>, <a href="https://github.com/mkst" target="_blank" rel="noreferrer">Mark Street</a>, <a href="https://www.defconq.tech/" target="_blank" rel="noreferrer">Alexander Unterrainer</a> of DefconQ and many others. Some work is a direct input; much more is part of the shared foundation PeachQ learns from.</p></div>
</div>
</div></section>
</main>
<?php peachq_page_end(); ?>
