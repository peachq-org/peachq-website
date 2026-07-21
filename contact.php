<?php
include 'template.php';
require_once 'module-formtoken.php';
peachq_page_start('Contact PeachQ', 'Contact the PeachQ project.', 'contact');
?>
<main>
<section class="page-hero"><div class="container"><span class="tag">Contact</span><h1>Talk to Peach<span class="peach">Q</span>.</h1><p>PeachQ is an open project, so the best place to ask most questions is in the open where other users can find the answer later.</p></div></section>
<section class="section"><div class="container contact-grid">
<div class="card contact-card primary-contact">
  <span class="tag">Start here</span>
  <h2>Use GitHub first.</h2>
  <p>If you found a bug, hit a compatibility gap, or have a small reproducible example, open an issue. If you want to ask how something should work, propose an idea, or compare approaches, start a discussion.</p>
  <div class="actions">
    <a class="button peach-button" href="https://github.com/peachq-org/peachq/issues" target="_blank" rel="noreferrer">Open an issue ↗</a>
    <a class="button" href="https://github.com/peachq-org/peachq/discussions" target="_blank" rel="noreferrer">Start a discussion ↗</a>
  </div>
</div>
<div class="card contact-card">
  <h2>Good reports help.</h2>
  <p>For bugs, include the q expression or script, what PeachQ returned, what you expected, and whether the same case works in another q implementation.</p>
  <p>For compatibility gaps, linking the relevant docs or a tiny q example is usually enough to get the conversation moving.</p>
</div>
<div class="card contact-card">
  <h2>Private notes.</h2>
  <p>Use the private template below only when the note should not be public: security concerns, commercial context, or anything with private data.</p>
  <p class="small">PeachQ is currently coordinated through TimeStored while the project is getting started.</p>
</div>
<div class="card contact-card">
  <h2>Follow along.</h2>
  <p>Release notes, compatibility work and build updates are published through the repository and the site.</p>
  <div class="actions">
    <a class="button" href="compatibility">Compatibility</a>
    <a class="button" href="download">Downloads</a>
  </div>
</div>
</div></section>
<section class="section contact-form-section"><div class="container">
<form class="card contact-form" id="contactForm" method="post" action="email.php">
  <input type="hidden" name="formtoken" value="<?= htmlspecialchars(FormToken::make(), ENT_QUOTES, 'UTF-8') ?>">
  <input type="hidden" name="tag" value="peachq-contact">
  <div class="honeypot" aria-hidden="true">
    <label>Leave this field empty <input type="text" name="company_url" tabindex="-1" autocomplete="off"></label>
  </div>
  <div class="contact-form-head">
    <div>
      <span class="tag">Message builder</span>
      <h2>Draft a useful report.</h2>
      <p>Use the bug template when GitHub does not fit. Use private contact only for sensitive details that should not go into an issue.</p>
    </div>
    <div class="template-toggle" role="group" aria-label="Message template">
      <button type="button" data-contact-template="bug" aria-pressed="true">Report bug</button>
      <button type="button" data-contact-template="private" aria-pressed="false">Private contact</button>
    </div>
  </div>
  <div class="form-grid">
    <label>Name
      <input id="contactName" name="name" autocomplete="name">
    </label>
    <label>Reply email
      <input id="contactEmail" name="email" type="email" autocomplete="email" required>
    </label>
    <label>Subject
      <input id="contactSubject" name="subject" autocomplete="off">
    </label>
    <label class="message-field">Message
      <textarea id="contactMessage" name="details" rows="13" required></textarea>
    </label>
  </div>
  <div class="contact-form-actions">
    <button class="button peach-button" type="submit" id="contactSubmit">Send message</button>
    <span id="contactHint">GitHub issues are still preferred for public, reproducible bugs.</span>
  </div>
  <div class="form-status" id="contactStatus" role="status" aria-live="polite"></div>
</form>
<div class="card contact-sent" id="contactSent" role="status" aria-live="polite" hidden>
  <span class="tag">Sent</span>
  <h2>Message sent.</h2>
  <p>Thanks. Your note has been sent to the PeachQ project.</p>
</div>
</div></section>
</main>
<?php peachq_page_end(['contact.js']); ?>
