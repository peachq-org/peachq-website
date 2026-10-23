/* Run against Apache after deployment; PHP's dev server ignores .htaccess.
 * SEARCH_DELIVERY_URL=http://peachq.me node tests/test_search_delivery.cjs
 */
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const origin = process.env.SEARCH_DELIVERY_URL;
if (!origin) throw new Error('Set SEARCH_DELIVERY_URL to the deployed site root');
(async () => {
  const browser = await chromium.launch({headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {}),
    args: ['--host-resolver-rules=MAP peachq.me 127.0.0.1']});
  try {
    const page = await browser.newPage();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    const transfers = new Map();
    cdp.on('Network.responseReceived', event => {
      if (/\/search\/(search_index|q_lookup)\./.test(event.response.url)) {
        transfers.set(event.requestId, {url: event.response.url,
          cached: !!event.response.fromDiskCache,
          headers: Object.fromEntries(Object.entries(event.response.headers)
            .map(([key, value]) => [key.toLowerCase(), value]))});
      }
    });
    cdp.on('Network.loadingFinished', event => {
      if (transfers.has(event.requestId)) transfers.get(event.requestId).bytes = event.encodedDataLength;
    });
    // Do not intercept routes: Playwright routing disables HTTP caching.
    for (const path of ['docs/', 'docs/ref/']) {
      await page.goto(new URL(path, origin.replace(/\/?$/, '/')).href,
        {waitUntil: 'domcontentloaded'});
      const input = page.locator('[data-md-component="search-query"]');
      await input.fill('0:');
      await input.press('ArrowRight');
      await page.locator('.peachq-search a[href$="docs/ref/file-text/"]').waitFor();
      await input.fill('regexp replace');
      await input.press('ArrowRight');
      await page.locator('[data-md-component="search-result"] a[href*="docs/api/regexp.q.html"]').first().waitFor();
    }
    // Allow CDP's completion events to arrive after the DOM result.
    await page.waitForTimeout(500);
    const records = [...transfers.values()];
    assert.equal(records.length, 4, 'One request per index per page, not per query');
    for (const record of records) {
      assert.match(record.url, /\.[a-f0-9]{16}\.json$/);
      assert.match(record.headers['content-encoding'], /gzip|br/);
      assert.match(record.headers['cache-control'], /immutable/);
      if (record.cached) assert.equal(record.bytes, 0);
    }
    assert.equal(records.filter(r => r.cached).length, 2, 'Both indexes reused on the second page');
    console.log(records.map(({url, cached, bytes}) => ({url, cached, bytes})));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
