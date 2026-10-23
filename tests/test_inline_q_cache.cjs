/* Focused real-runtime regression: build and fetch fixtures before running. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'inline-q-cache-'));
for (const name of fs.readdirSync(path.join(root, 'site'))) fs.symlinkSync(path.join(root, 'site', name), path.join(temp, name));
// A small page isolates the runner from documentation search/player rendering.
const fixture = '<!doctype html><meta charset="utf-8"><style>body{margin:32px;max-width:720px;font:18px sans-serif;--md-code-font-family:monospace;--md-code-fg-color:#222;--md-code-bg-color:#f5f5f5;--md-default-fg-color:#222;--md-default-fg-color--light:#555;--md-default-fg-color--lightest:#ddd;--md-primary-fg-color:#7c4dff}</style><link rel="stylesheet" href="css/inline-q.css"><div class="peachq-inline" data-title="Fixture" data-code="42&#10;&quot;42&quot;">42</div><script src="js/inline-q.js"></script>';
fs.writeFileSync(path.join(temp, 'inline-fixture.html'), fixture);
fs.mkdirSync(path.join(temp, 'mirror'));
for (const name of ['js', 'css', 'wasm']) fs.symlinkSync(path.join(root, 'site', name), path.join(temp, 'mirror', name));
fs.writeFileSync(path.join(temp, 'mirror/inline-fixture.html'), fixture);
let browser, server;
(async () => {
  const origin = await new Promise((resolve, reject) => {
    server = spawn('php', ['-S', '127.0.0.1:0', '-t', temp, path.join(root, 'tools/preview-router.php')], {stdio:['ignore','ignore','pipe']});
    server.stderr.on('data', data => { const match = String(data).match(/http:\/\/127\.0\.0\.1:\d+/); if (match) resolve(match[0]); });
    server.on('error', reject);
  });
  browser = await chromium.launch();
  for (const prefix of ['', '/mirror']) {
    console.log('Checking cache/isolation at', prefix || '/');
    const context = await browser.newContext();
    await context.addInitScript(() => {
      const NativeWorker = Worker;
      window.stats = {live:0, max:0, evals:[]};
      window.Worker = class extends NativeWorker {
        constructor(...args) { super(...args); this.q = String(args[0]).includes('/js/inline-q-worker.js'); if (this.q) { this.live = true; stats.max = Math.max(stats.max, ++stats.live); } }
        postMessage(message, ...args) { if (this.q && message.op === 'eval') stats.evals.push(message.src); return super.postMessage(message, ...args); }
        terminate() { if (this.q && this.live) { stats.live--; this.live = false; } return super.terminate(); }
      };
    });
    const page = await context.newPage();
    let binaryRequests = 0, release;
    const held = new Promise(resolve => { release = resolve; });
    await page.route('**/*', async route => {
      if (!route.request().url().startsWith(origin + '/')) return route.abort();
      if (new URL(route.request().url()).pathname.endsWith('/peachq.wasm')) { binaryRequests++; await held; }
      return route.continue();
    });
    await page.goto(origin + prefix + '/inline-fixture.html', {waitUntil:'domcontentloaded'});
    const box = page.locator('.peachq-inline.is-ready').first();
    const run = box.getByRole('button', {name:/^Run Example /});
    const editor = box.locator('textarea');
    await editor.fill('stale:1'); await run.click();
    assert(await run.isDisabled());
    await box.getByRole('button', {name:/^Reset Example /}).click();
    await editor.fill('shared:41\nshared+1'); await run.click(); release();
    await page.waitForFunction(() => !document.querySelector('.peachq-inline button').disabled, null, {timeout:60000});
    assert.equal(await box.locator('pre').textContent(), '42');
    assert.deepEqual(await page.evaluate(() => stats.evals), ['shared:41', 'shared+1']);
    await editor.fill('shared'); await run.click();
    await page.waitForFunction(() => !document.querySelector('.peachq-inline button').disabled);
    assert.equal(await box.getAttribute('data-state'), 'error');
    assert.match(await box.locator('pre').textContent(), /shared/);
    await editor.fill('2+3'); await run.click();
    await page.waitForFunction(() => !document.querySelector('.peachq-inline button').disabled);
    assert.equal(await box.locator('pre').textContent(), '5');
    assert.equal(binaryRequests, 1, 'one binary download for all fresh sessions on this page');
    assert.deepEqual(await page.evaluate(() => [stats.max, stats.live]), [1, 0]);
    assert(await box.locator('.peachq-inline-play').isVisible());
    assert.equal(await box.evaluate(node => getComputedStyle(node).borderTopColor), 'rgb(124, 77, 255)');
    await box.scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(temp, prefix ? 'mirror.png' : 'root.png')});
    console.log((prefix || '/') + ': one WASM request, fresh q state, reset during loading, purple border/play icon');
    await context.close();
  }
  // A bad binary is visible as a loading error; a later Run retries its download.
  const page = await browser.newPage();
  let broken = true, requests = 0;
  await page.route('**/*', route => {
    if (!route.request().url().startsWith(origin + '/')) return route.abort();
    if (new URL(route.request().url()).pathname.endsWith('/peachq.wasm')) {
      requests++;
      if (broken) return route.fulfill({status:200, contentType:'application/wasm', body:'not wasm'});
    }
    return route.continue();
  });
  await page.goto(origin + '/inline-fixture.html', {waitUntil:'domcontentloaded'});
  const box = page.locator('.peachq-inline.is-ready').first();
  await box.getByRole('button', {name:/^Run Example /}).click();
  await page.waitForFunction(() => !document.querySelector('.peachq-inline button').disabled);
  assert.match(await box.locator('pre').textContent(), /Could not load the q engine/);
  broken = false;
  const before = requests;
  await box.getByRole('button', {name:/^Run Example /}).click();
  await page.waitForFunction(() => !document.querySelector('.peachq-inline button').disabled, null, {timeout:60000});
  assert.equal(await box.locator('pre').textContent(), '42\n"42"');
  assert.equal(requests, before + 1);
  console.log('Failed binary retries successfully. Screenshots: ' + temp);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server) server.kill();
});
