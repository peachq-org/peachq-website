/* Run after build + dev-fixtures; exercises the deployed WASM, not a mock. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'peachq-files-test-'));
fs.symlinkSync(path.join(root, 'site'), path.join(temporary, 'mirror'), 'dir');
let server, browser;
async function serve(documentRoot) {
  server = spawn('php', ['-S', '127.0.0.1:0', '-t', documentRoot,
    path.join(root, 'tools/preview-router.php')], {stdio:['ignore','ignore','pipe']});
  return new Promise((resolve,reject) => {
    server.stderr.on('data', chunk => {
      const address = chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);
      if (address) resolve(address[0]);
    });
    server.on('error', reject);
  });
}
(async () => {
  browser = await chromium.launch({headless:true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?
      {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}: {})});
  for (const prefix of ['', '/mirror']) {
    const origin = await serve(prefix ? temporary : path.join(root, 'site'));
    const page = await browser.newPage();
    const requests = [];
    await page.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
    page.on('request', request => requests.push(request.url()));
    await page.goto(origin + prefix + '/');
    assert(!requests.some(url => url.includes('/repl/files')), 'No samples on ordinary pages');
    for (const suffix of ['/repl?code=til%203', '/repl/']) {
      await page.goto(origin + prefix + suffix);
      await page.waitForFunction(() => document.querySelector('#replStatus').getAttribute('aria-label') === 'runtime ready');
      assert.equal(await page.evaluate(() => document.baseURI), origin + prefix + '/');
      assert.equal(await page.evaluate(() => evalWasm('count get `:dowjones.csv')), '649');
      assert.equal(await page.evaluate(() => evalWasm('count get `:price.json')), '2628');
      for (const script of ['dowjones', 'prices']) {
        const result = await page.evaluate(script => evalWasm('\\l examples/' + script + '.q'), script);
        assert(!result.startsWith("'"), result);
      }
      assert.equal(await page.evaluate(() => evalWasm('count dowjones')), '649');
      assert.equal(await page.evaluate(() => evalWasm('count prices')), '2628');
      // Reloading the sample installer never replaces a live user's edited file.
      assert.equal(await page.evaluate(async () => {
        runtime.FS.writeFile('/dowjones.csv', 'user data');
        await loadSampleFiles();
        return runtime.FS.readFile('/dowjones.csv', {encoding:'utf8'});
      }), 'user data');
    }
    await page.route('**/repl/files/price.json?*', route => route.fulfill({status:503, body:'unavailable'}));
    await page.goto(origin + prefix + '/repl');
    await page.waitForFunction(() => document.querySelector('#replStatus').getAttribute('aria-label') === 'runtime ready');
    assert((await page.locator('#replOutput').innerText()).includes('Sample files unavailable'));
    assert.equal(await page.evaluate(() => evalWasm('1+1')), '2');
    assert.equal(await page.evaluate(() => runtime.FS.analyzePath('/dowjones.csv').exists), false);
    await page.close();
    server.kill(); server = null;
  }
  console.log('REPL sample files: real WASM, root/mirror routes, scripts, lazy loading and failure handling passed');
})().catch(error => {console.error(error);process.exitCode=1;}).finally(async()=>{
  if (browser) await browser.close();
  if (server) server.kill();
  fs.rmSync(temporary, {recursive:true,force:true});
});
