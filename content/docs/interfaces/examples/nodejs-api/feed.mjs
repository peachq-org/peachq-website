import { QConnection } from 'jkdb';

const prices = { A: 50, GM: 40, GOOG: 150, KX: 25 };
const syms = Object.keys(prices);
const pick = list => list[Math.floor(Math.random() * list.length)];
const typed = (values, type) => Object.assign(values, { [Symbol.for('kType')]: type });

const batch = () => {
  const n = 1 + Math.floor(Math.random() * 10);
  const sym = Array.from({ length: n }, () => pick(syms));
  const price = sym.map(s => prices[s] = Math.round(100 * (prices[s] + Math.random() - .5)) / 100);
  const trades = {
    time: typed(sym.map(() => new Date()), 'p'),
    sym: typed(sym, 's'),
    price: typed(price, 'f'),
    size: typed(sym.map(() => 1 + Math.floor(Math.random() * 1000)), 'i'),
    stop: typed(sym.map(() => Math.random() < .1), 'b'),
    cond: sym.map(() => pick('ABS')).join(''),
    ex: sym.map(() => pick('LNO')).join(''),
  };
  trades[Symbol.for('meta')] = { c: Object.keys(trades), t: ['p', 's', 'f', 'i', 'b', 'c', 'c'] };
  return trades;
};

const q = new QConnection({ host: 'localhost', port: Number(process.env.PEACHQ_PORT ?? 5003) });
q.on('close', () => { console.log('Connection closed'); process.exit(1); });
await q.connectAsync();
setInterval(() => {
  const trades = batch();
  q.asyn(['.u.upd[`trade]', trades]);
  console.log(`Sent ${trades.sym.length} trades`);
}, 500);
