/* Real Material worker + q lookup, served at root and under a mirror prefix. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'peachq-search-test-'));
fs.symlinkSync(path.join(root, 'site'), path.join(temporary, 'mirror'), 'dir');
let server;
let browser;

async function serve(documentRoot) {
  server = spawn('php', ['-S', '127.0.0.1:0', '-t', documentRoot,
    path.join(root, 'tools/preview-router.php')], {stdio: ['ignore', 'ignore', 'pipe']});
  return new Promise((resolve, reject) => {
    let output = '';
    server.stderr.on('data', chunk => {
      output += chunk;
      const address = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (address) resolve(address[0]);
    });
    server.on('error', reject);
    server.on('exit', code => { if (!output.includes('started')) reject(new Error(`PHP exited ${code}: ${output}`)); });
  });
}

async function query(page, value) {
  const input = page.locator('[data-md-component="search-query"]');
  await input.fill(value);
  // Material watches keyboard events; fill alone only dispatches input/change.
  await input.press('ArrowRight');
}

(async () => {
  browser = await chromium.launch({headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {})});
  for (const prefix of ['', '/mirror']) {
    const origin = await serve(prefix ? temporary : path.join(root, 'site'));
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(origin + '/')) return route.continue();
      // API pages use a CDN highlighter, unrelated to search/navigation checks.
      if (url.startsWith('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/')) {
        return route.fulfill({contentType: 'application/javascript',
          body: 'window.hljs = {highlightAll() {}, registerLanguage() {}};'});
      }
      return route.abort();
    });
    await page.goto(origin + prefix + '/docs/', {waitUntil: 'domcontentloaded'});
    const input = page.locator('[data-md-component="search-query"]');
    for (const [term, destination] of [
      ['-11!', 'docs/basics/internal/#-11-streaming-execute'],
      ['0:', 'docs/ref/file-text/'], ['1:', 'docs/ref/file-binary/'],
      ['.', 'docs/ref/overloads/#dot'], ['$', 'docs/ref/overloads/#dollar'],
      ['!', 'docs/ref/overloads/#bang'], ['select', 'docs/ref/select/'],
      ['.csv.read', 'docs/api/csv.q.html#-csv-read'],
      ['file text', 'docs/ref/file-text/'],
      ['-p', 'docs/basics/cmdline/#-p-listening-port'],
      ['-P', 'docs/basics/cmdline/#-p-display-precision'],
      ['\\?', 'docs/basics/syscmds/#peachq-specific-commands'],
    ]) {
      await query(page, term);
      await page.waitForFunction(expected => {
        const first = document.querySelector('.peachq-search a');
        return first?.href === expected;
      }, origin + prefix + '/' + destination);
      assert(await page.locator('.peachq-search').isVisible(), term);
      const panel = await page.locator('.md-search__inner').boundingBox();
      assert(panel.x >= 0 && panel.x + panel.width <= 1281, 'Search fits desktop viewport');
    }
    await query(page, '.csv.');
    assert(await page.locator('.peachq-search a').count() >= 2);
    await query(page, '.CSV.read');
    assert(await page.locator('.peachq-search').isHidden(), 'Exact q lookup is case sensitive');
    await query(page, 'regexp replace');
    await page.locator('[data-md-component="search-result"] a[href*="docs/api/regexp.q.html"]').first().waitFor();
    await query(page, 'read csv');
    await page.locator('[data-md-component="search-result"] a[href*="docs/api/csv.q.html"]').first().waitFor();
    await query(page, '0:');
    await input.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.href), origin + prefix + '/docs/ref/file-text/');
    await page.keyboard.press('ArrowUp');
    assert(await input.evaluate(element => element === document.activeElement));
    await input.press('Enter');
    await page.waitForURL(origin + prefix + '/docs/ref/file-text/');

    await query(page, '.csv.read');
    await page.locator('[data-md-component="search-query"]').press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForURL(origin + prefix + '/docs/api/csv.q.html#-csv-read');
    await page.goto(origin + prefix + '/docs/', {waitUntil: 'domcontentloaded'});

    await page.setViewportSize({width: 390, height: 844});
    await page.locator('label[for="__search"]').first().click();
    await query(page, '.csv.read');
    await page.locator('.peachq-search a').waitFor();
    await page.waitForFunction(() =>
      document.querySelector('.md-search__scrollwrap').clientHeight > window.innerHeight / 2);
    const panel = await page.locator('.md-search__inner').boundingBox();
    assert(panel.width <= 391 && panel.x >= 0, 'Search fits mobile viewport');
    await page.locator('[data-md-component="search"] button[type="reset"]').click();
    assert(await page.locator('.peachq-search').isHidden());
    await query(page, '1:');
    await page.locator('.peachq-search a').click();
    await page.waitForURL(origin + prefix + '/docs/ref/file-binary/');
    assert.deepEqual(errors, []);
    await page.close();
    server.kill();
    console.log(`Search browser checks passed: ${prefix || '/'}`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server) server.kill();
  fs.rmSync(temporary, {recursive: true, force: true});
});
