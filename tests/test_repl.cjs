/* Run after build + dev-fixtures; all q tests share one browser REPL. */
const assert = require('node:assert/strict');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');
const {checkQFiles} = require('./repl-console.cjs');
const {checkReplUI} = require('./repl-ui.cjs');
const root = path.resolve(__dirname, '..');
let server, browser;

(async () => {
  const origin = await new Promise((resolve, reject) => {
    server = spawn('php', ['-S', '127.0.0.1:0', '-t', path.join(root, 'site'),
      path.join(root, 'tools/preview-router.php')], {stdio: ['ignore', 'ignore', 'pipe']});
    server.stderr.on('data', chunk => {
      const address = chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);
      if (address) resolve(address[0]);
    });
    server.on('error', reject);
    server.on('exit', code => reject(new Error(`Preview server exited (${code})`)));
  });
  browser = await chromium.launch({headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?
      {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {})});
  const page = await browser.newPage();
  await page.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
  const sampleDownloads = [];
  page.context().on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/repl/files/')) sampleDownloads.push(url.pathname);
  });
  await page.goto(origin + '/repl');
  await page.waitForFunction(() => document.querySelector('#replStatus').getAttribute('aria-label') === 'runtime ready',
    null, {timeout: 120000});
  // Samples are mounted lazily: none is downloaded until q reads it.
  assert.deepEqual(sampleDownloads, [], 'no sample file is downloaded before it is read');
  await checkQFiles(page);
  assert(sampleDownloads.includes('/repl/files/dowjones.csv'), 'reading a sample downloads it');
  await checkReplUI(page, origin);
})().catch(error => {console.error(error); process.exitCode = 1;}).finally(async () => {
  try {
    if (browser) await browser.close();
  } finally {
    if (server) server.kill();
  }
});
