/* Actual current WASM tests. Run tools/build.sh and tools/dev-fixtures.sh first. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'inline-q-'));
for (const name of fs.readdirSync(path.join(root, 'site'))) fs.symlinkSync(path.join(root, 'site', name), path.join(temp, name));
fs.symlinkSync(path.join(root, 'site'), path.join(temp, 'mirror'));
let server, browser;
const instrumentation = () => {
  const NativeWorker = window.Worker;
  window.bootGate = true; window.heldStarts = [];
  window.releaseBoot = () => { window.bootGate = false; window.heldStarts.splice(0).forEach(fn => fn()); };
  window.workerStats = {created: 0, live: 0, max: 0, evals: [], starts: []};
  window.Worker = class extends NativeWorker {
    constructor(...args) {
      super(...args);
      this.isQ = String(args[0]).includes("/js/inline-q-worker.js");
      if (!this.isQ) return;
      const stats = window.workerStats;
      stats.created++; stats.live++; stats.max = Math.max(stats.max, stats.live);
      this.alive = true;
      this.addEventListener('message', e => {
        if (e.data.id === this.startId) stats.starts.push(performance.now() - this.startTime);
      });
    }
    postMessage(message, ...args) {
      if (message.op === 'start') { this.startId = message.id; this.startTime = performance.now(); }
      if (message.op === 'eval') window.workerStats.evals.push(message.src);
      if (message.op === 'start' && window.bootGate) { window.heldStarts.push(() => super.postMessage(message, ...args)); return; }
      return super.postMessage(message, ...args);
    }
    terminate() {
      if (this.isQ && this.alive) { window.workerStats.live--; this.alive = false; }
      return super.terminate();
    }
  };
};
(async () => {
  const origin = await new Promise((resolve, reject) => {
    server = spawn('php', ['-S','127.0.0.1:0','-t',temp,path.join(root,'tools/preview-router.php')],{stdio:['ignore','ignore','pipe']});
    server.stderr.on('data', data => { const m = String(data).match(/http:\/\/127\.0\.0\.1:\d+/); if (m) resolve(m[0]); });
    server.on('error', reject);
  });
  browser = await chromium.launch({headless:true});
  const measurements = [];
  const source = fs.readFileSync(path.join(root,'content/docs/guides/casting-parsing.md'),'utf8');
  const marked = [...source.matchAll(/<!-- peachq: inline -->\s*```q\n([\s\S]*?)^```/gm)]
    .map(match => match[1].split('\n').map(line => line.trim()).filter(Boolean));
  const commands = marked.map(lines => lines.filter(line => line.startsWith('q)')).map(line => line.slice(2)));
  const expected = marked.map(lines => lines.filter(line => !line.startsWith('q)')).join('\n'));
  assert(expected.length >= 2, 'lifecycle checks need at least two marked examples');
  for (const prefix of ['', '/mirror']) {
    const context = await browser.newContext();
    await context.addInitScript(instrumentation);
    const page = await context.newPage();
    await page.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
    page.setDefaultTimeout(15000);
    // Hold boot's start message to exercise a click during preparation.
    console.error('Checking inline q examples at', prefix || '/');
    await page.goto(origin + prefix + '/docs/guides/casting-parsing/', {waitUntil:'domcontentloaded'});
    const boxes = page.locator('.peachq-inline.is-ready'), first = boxes.nth(0), second = boxes.nth(1);
    assert.equal(await boxes.count(),expected.length);
    await first.scrollIntoViewIfNeeded();
    await first.locator('textarea').fill('once:41\nonce+1');
    await first.getByRole('button',{name:/^Run Example /}).evaluate(button => { for(let i=0;i<10;i++) button.click(); });
    assert(await first.getByRole('button',{name:/^Run Example /}).isDisabled());
    await page.evaluate(() => releaseBoot());
    const done = async box => { await box.getByRole('button',{name:/^Run Example /}).waitFor(); await page.waitForFunction(node => !node.querySelector('button').disabled, await box.elementHandle(), {timeout:60000}); };
    await done(first);
    assert.equal(await first.locator('pre').textContent(),'42');
    assert.equal(await page.evaluate(() => workerStats.evals.filter(x=>x==='once+1').length),1);
    // Another run cannot see the previous variable, even in the same editor.
    await first.locator('textarea').fill('once');
    await first.getByRole('button',{name:/^Run Example /}).click(); await done(first);
    assert.match(await first.locator('pre').textContent(),/once/);
    assert.equal(await first.getAttribute('data-state'),'error');
    await second.locator('textarea').fill('once');
    await second.getByRole('button',{name:/^Run Example /}).click(); await done(second);
    assert.equal(await second.getAttribute('data-state'),'error');
    // All authored boxes execute independently on real q, including exercise answers.
    for (let i=0;i<await boxes.count();i++) {
      console.error('Executing example', i + 1, 'at', prefix || '/');
      const box=boxes.nth(i);
      await box.getByRole('button',{name:/^Reset Example /}).click();
      await box.getByRole('button',{name:/^Run Example /}).click(); await done(box);
      assert.notEqual(await box.getAttribute('data-state'),'error', `example ${i+1}`);
      assert.equal(await box.locator('pre').textContent(), expected[i], `checked output ${i+1}`);
    }
    // Reset cancels queued work and an executing nonterminating expression.
    await first.locator('textarea').fill('while[1b;1]');
    await first.getByRole('button',{name:/^Run Example /}).click();
    await page.waitForFunction(() => workerStats.evals.includes('while[1b;1]'));
    const queuedBaseline = await page.evaluate(() => workerStats.evals.length);
    await second.getByRole('button',{name:/^Run Example /}).click();
    await second.getByRole('button',{name:/^Reset Example /}).click();
    await first.getByRole('button',{name:/^Reset Example /}).click();
    assert.equal(await first.locator('textarea').inputValue(),commands[0].join('\n'));
    assert(await first.locator('pre').isHidden());
    await first.getByRole('button',{name:/^Run Example /}).click(); await done(first);
    assert.equal(await first.locator('pre').textContent(),expected[0]);
    assert.deepEqual(await page.evaluate(n => workerStats.evals.slice(n), queuedBaseline), commands[0]);
    assert.equal(await page.evaluate(() => workerStats.max),1);
    assert.equal(await page.evaluate(() => workerStats.live),0);
    assert.equal(await page.locator('details.example').count(),0);
    await first.scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(temp, 'desktop'+(prefix?'mirror':'')+'.png')});
    await page.setViewportSize({width:390,height:844});
    await first.scrollIntoViewIfNeeded();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await first.locator('textarea').focus(); await page.keyboard.press('Control+A'); await page.keyboard.type('2+3');
    await first.getByRole('button',{name:/^Run Example /}).focus(); await page.keyboard.press('Enter'); await done(first);
    assert.equal(await first.locator('pre').textContent(),'5');
    assert(await first.getByRole('button',{name:/^Run Example /}).evaluate(node => node === document.activeElement));
    assert.equal(await first.locator('pre').getAttribute('role'), 'region');
    assert.equal(new Set(await boxes.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))).size, expected.length);
    await page.screenshot({path:path.join(temp, 'mobile'+(prefix?'mirror':'')+'.png')});
    measurements.push({prefix,...await page.evaluate(()=>({
      workersCreated:workerStats.created, maximumLive:workerStats.max, live:workerStats.live,
      expressionsEvaluated:workerStats.evals.length
    }))});
    await context.close();
  }
  // Reset during boot discards that request, including a late start completion.
  const lifecycle = await browser.newContext();
  await lifecycle.addInitScript(instrumentation);
  const page = await lifecycle.newPage();
  await page.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
  await page.goto(origin + '/docs/guides/casting-parsing/', {waitUntil:'domcontentloaded'});
  const first = page.locator('.peachq-inline.is-ready').first();
  await first.getByRole('button',{name:/^Run Example /}).click();
  await first.getByRole('button',{name:/^Reset Example /}).click();
  await page.evaluate(() => releaseBoot());
  assert(await first.locator('pre').isHidden());
  await first.getByRole('button',{name:/^Run Example /}).click();
  await page.waitForFunction(() => !document.querySelector('.peachq-inline button').disabled);
  assert.equal(await first.locator('pre').textContent(),expected[0]);
  assert.deepEqual(await page.evaluate(() => workerStats.evals), commands[0]);
  // Keyboard completion must not steal focus after the reader moves elsewhere.
  await page.evaluate(() => { window.bootGate = true; });
  await first.getByRole('button',{name:/^Run Example /}).focus();
  await page.keyboard.press('Enter');
  await first.locator('textarea').focus();
  await page.evaluate(() => releaseBoot());
  await page.waitForFunction(() => !document.querySelector('.peachq-inline button').disabled);
  assert(await first.locator('textarea').evaluate(node => node === document.activeElement));
  // Explicitly exercise pagehide while running, not just implicit browser cleanup.
  await first.locator('textarea').fill('while[1b;1]');
  await first.getByRole('button',{name:/^Run Example /}).click();
  await page.waitForFunction(() => workerStats.evals.includes('while[1b;1]'));
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide')));
  assert.equal(await page.evaluate(() => workerStats.live),0);
  assert.equal(await page.evaluate(() => workerStats.max),1);
  await lifecycle.close();
  const staticPage = await browser.newPage({javaScriptEnabled:false});
  await staticPage.goto(origin + '/docs/guides/casting-parsing/');
  assert.equal(await staticPage.locator('.peachq-inline .highlight').count(),expected.length);
  assert.equal(await staticPage.locator('.peachq-inline-fallback').count(),expected.length);
  await staticPage.close();
  console.log(JSON.stringify({screenshots:temp,measurements},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)server.kill();});
