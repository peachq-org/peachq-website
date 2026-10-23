import { QConnection } from 'jkdb';

const rows = table => {
  const { c: columns } = table[Symbol.for('meta')];
  return table[columns[0]].map((_, i) => Object.fromEntries(columns.map(name => [name, table[name][i]])));
};

const q = new QConnection({ host: 'localhost', port: Number(process.env.PEACHQ_PORT ?? 5003) });
await q.connectAsync();

const summary = await q.syncAsync('0!select trades:count i,sum size by sym from trade');
console.table(rows(summary));

const recent = await q.syncAsync(['{[s;n] n#select time,price,size from trade where sym=`$s}', 'GOOG', -3n]);
console.table(rows(recent));

await q.closeAsync();
