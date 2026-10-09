import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { QConnection } from 'jkdb';
import { WebSocketServer } from 'ws';

const rows = table => {
  const { c: columns } = table[Symbol.for('meta')];
  return table[columns[0]].map((_, i) => Object.fromEntries(columns.map(name => [name, table[name][i]])));
};

const page = await readFile(new URL('./index.html', import.meta.url));
const web = createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(page);
});
const browsers = new WebSocketServer({ server: web });

const q = new QConnection({ host: 'localhost', port: Number(process.env.PEACHQ_PORT ?? 5003) });
q.on('upd', ([, table, data]) => {
  const message = JSON.stringify({ table, rows: rows(data) });
  for (const browser of browsers.clients) browser.send(message);
  console.log(`${table}: ${data.sym.length} rows to ${browsers.clients.size} browser(s)`);
});
q.on('close', () => { console.log('Connection closed'); process.exit(1); });
await q.connectAsync();
await q.syncAsync('.u.sub[`trade;`]');

const webPort = Number(process.env.WEB_PORT ?? 3000);
web.listen(webPort, () => console.log(`Subscribed to trade; open http://localhost:${webPort}`));
