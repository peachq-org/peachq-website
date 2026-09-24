// Real-browser verification of TorQ's heartbeat UI. Requires npm install.
// Usage: node demos/torq/check-monitor.cjs http://localhost:6009/.non?monitorui /tmp/torq-browser
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const url = process.argv[2] || 'http://localhost:6009/.non?monitorui';
  const output = process.argv[3];
  if (!output) throw new Error('Supply an evidence output directory');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {})
  });
  const events = [], errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 620 } });
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    page.on('websocket', ws => {
      ws.on('socketerror', e => errors.push(String(e)));
      ws.on('framereceived', frame => {
        const text = Buffer.from(frame.payload).toString('utf8');
        const start = text.indexOf('{');
        if (start < 0) return;
        try {
          const data = JSON.parse(text.slice(start));
          events.push({ name: data.name, data: data.data });
        } catch (error) { errors.push(`Cannot decode JSON payload: ${error.message}`); }
      });
    });
    await page.goto(url);
    const deadline = Date.now() + 45000;
    while (!events.some(e => e.name === 'upd' && e.data?.tablename === 'heartbeat')) {
      if (Date.now() > deadline) throw new Error('No live heartbeat update within 45 seconds');
      await page.waitForTimeout(500);
    }
    await page.waitForFunction(() => document.body.innerText.includes('rdb1'), null, {timeout: 15000});
    const body = await page.locator('body').innerText();
    fs.writeFileSync(path.join(output, 'browser.json'), JSON.stringify({body, events, errors}, null, 2) + '\n');
    if (!events.some(e => e.name === 'start') || !body.includes('rdb1') || errors.length) {
      throw new Error(`Monitor check failed: ${JSON.stringify(errors)}`);
    }
    await page.screenshot({ path: path.join(output, 'monitor.png'), fullPage: true });
    fs.writeFileSync(path.join(output, 'browser.json'), JSON.stringify({ title: await page.title(), body, events, errors }, null, 2) + '\n');
    console.log('PASS: initial monitor data, heartbeat rows and live WebSocket update');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
