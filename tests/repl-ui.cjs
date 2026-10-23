const assert = require('node:assert/strict');
const {idle} = require('./repl-console.cjs');

async function ready(page) {
  await page.waitForFunction(() => document.querySelector('#replStatus').getAttribute('aria-label') === 'runtime ready',
    null, {timeout: 120000});
}

async function command(page, code) {
  await page.locator('#replInput').fill(code);
  await page.locator('#replInput').press('Enter');
  await idle(page);
  return page.locator('#replOutput > div').last().textContent();
}

async function checkReplUI(page, origin) {
  await page.setViewportSize({width: 1440, height: 1000});
  const defaults = await command(page, '\\c');
  const panel = await page.locator('.repl-panel').boundingBox();
  const shell = await page.locator('.repl-shell').boundingBox();
  assert(Math.abs(panel.width - shell.width) < 2, 'console uses the full shell width');
  assert.equal(await page.locator('#replOutput').evaluate(el => getComputedStyle(el).whiteSpace), 'pre');
  await page.locator('#replExamplesToggle').click();
  await page.getByRole('button', {name: '6*7', exact: true}).click();
  await idle(page);
  assert.equal(await page.locator('#replOutput > div').last().textContent(), '42');
  assert(await page.locator('#replExamplesMenu').isHidden());

  // A shared setting runs once; refresh must return to a fresh runtime.
  await page.goto(origin + '/repl?run=' + encodeURIComponent('\\c 10 20'));
  await ready(page);
  assert.equal(await command(page, '\\c'), '10 20');
  assert(!new URL(page.url()).searchParams.has('run'));
  await page.reload();
  await ready(page);
  assert.equal(await command(page, '\\c'), defaults);

  // Reset also preserves an open document while clearing runtime and console state.
  await page.goto(origin + '/repl?autorun=1&title=reset-test&code=' + encodeURIComponent('\\c 10 20'));
  await ready(page);
  assert.equal(await command(page, '\\c'), '10 20');
  assert(!new URL(page.url()).searchParams.has('autorun'));
  const tabs = await page.locator('.repl-tab-name').allTextContents();
  await command(page, 'resetProbe:42');
  await page.evaluate(() => { window.resetPageMarker = 'same page'; });
  const resetRequests = [];
  const recordRequest = request => resetRequests.push(request.url());
  page.on('request', recordRequest);
  await page.locator('#replReset').click();
  await page.waitForURL(origin + '/repl');
  await ready(page);
  page.off('request', recordRequest);
  // A reset boots a fresh engine Worker (its scripts may come from cache) but downloads no page or sample file.
  const downloads = resetRequests.map(url => new URL(url)).filter(url => url.origin === origin &&
    !url.pathname.startsWith('/wasm/latest/'));
  assert.deepEqual(downloads.map(url => url.pathname), [], 'reset downloads nothing but the engine');
  assert.equal(await page.evaluate(() => window.resetPageMarker), 'same page', 'reset does not reload the document');
  assert.deepEqual(await page.locator('.repl-tab-name').allTextContents(), tabs);
  assert(!(await page.locator('#replOutput').textContent()).includes('resetProbe'));
  assert.equal(await command(page, '\\c'), defaults);
  assert.notEqual(await command(page, 'resetProbe'), '42');
  assert.equal(await command(page, '6*7'), '42');
  await page.locator('#replExpand').click();

  await page.setViewportSize({width: 390, height: 844});
  await page.locator('#replExamplesToggle').click();
  const menu = await page.locator('#replExamplesMenu').boundingBox();
  assert(menu.x >= 0 && menu.x + menu.width <= 390, 'examples fit a mobile screen');
  await page.getByRole('button', {name: '6*7', exact: true}).click();
  await idle(page);
  assert.equal(await page.locator('#replOutput > div').last().textContent(), '42');
  assert(await page.locator('#replReset').isVisible());
  console.log('REPL layout, examples, URL replay prevention and session reset passed');
}

module.exports = {checkReplUI};
