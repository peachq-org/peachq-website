# Node.js API examples

Examples for the [Node.js API article](https://peachq.org/docs/interfaces/nodejs-api/)
on peachq.org. They connect to a PeachQ server started with `nodejs-api-server.q`
on port 5003 (set `PEACHQ_PORT` to change it).

| File | What it does |
|---|---|
| `query.mjs` | Runs a query and a function call, printing the results as rows. |
| `feed.mjs` | Sends a random batch of trades to `.u.upd` every half second. |
| `relay.mjs` | Subscribes to `trade` and forwards each update to browsers over a WebSocket; serves `index.html` on port 3000 (`WEB_PORT`). |
| `index.html` | Draws a live price chart and a trade tape from the relay's messages. |

```sh
npm install
node feed.mjs &
node query.mjs
node relay.mjs
```

Requires Node.js 20 or newer. Dependencies: [jkdb](https://github.com/jshinonome/jkdb) 1.4.0
(Apache-2.0) and [ws](https://github.com/websockets/ws) 8.22.0 (MIT), installed by
`npm install`. The page loads [Chart.js](https://www.chartjs.org/) 4.5.0 (MIT) from jsDelivr.
