---
title: A crypto HDB from public data
description: Fetch Coinbase minute bars over HTTPS, write them as a kdb+ partitioned database with .Q.dpft, query across partitions, and compare closes with Massive.
---

<!-- peachq: audience="Existing kdb+ developers who know HDBs, splayed tables, .Q.dpft and sym enumeration." goal="Build, load and query a partitioned database in PeachQ from public crypto data, then join it to a second price source." -->

# A crypto HDB from public data

This guide builds a small historical database (HDB) from public data in one PeachQ session. It fetches two days of BTC, ETH and SOL minute bars from Coinbase, writes them with `.Q.dpft`, loads them with `\l` and queries across both partitions. Finally it joins one day to Massive's minute bars and measures how far the two sources' closing prices differ, in basis points:

```q
q)select n:count i,mad:avg abs bps,bias:avg bps,maxbps:max abs bps by sym from j
| sym    | n    | mad       | bias       | maxbps   |
| symbol | long | float     | float      | float    |
|========|------|-----------|------------|----------|
| BTC    | 1440 | 0.9959136 | -0.75366   | 32.19484 |
| ETH    | 1440 | 1.405754  | -1.004426  | 34.40348 |
| SOL    | 1440 | 0.8917489 | -0.1479007 | 18.79447 |
```

Every one of the 1,440 minutes matched for each coin. In a typical minute the two closes are about 1 bp apart (`mad`, the mean absolute difference), Coinbase's closes sit slightly below Massive's on average (`bias`), and single minutes reach 30 bp or more.

<video class="peachq-video" controls preload="none" playsinline src="/video/crypto-hdb-FHD.mp4" poster="/recordings/crypto-hdb/intro-frame.png"></video>

## What you need

- Linux x64 with glibc, and network access. Use the glibc download below: the default Linux archive is statically linked and cannot make HTTPS requests from q.
- A [Massive](https://massive.com) API key for the final comparison step. Everything before it uses Coinbase's public market data and needs no key. Massive plans limit requests per minute; the comparison makes three requests.

## Copy and run

Download PeachQ and start it:

```sh
mkdir crypto-hdb && cd crypto-hdb
curl -fL https://peachq.org/download/peachq-linux-x64-glibc.tar.gz | tar -xz
./q
```

Paste this into the q session. Replace `YOUR_MASSIVE_API_KEY` with your key first, or export `MASSIVE_API_KEY` before starting q and leave out the `.massive.set_key` line. Run it in a fresh session and directory: after `\l hdb` the working directory is the HDB, so pasting it again would write a second database inside the first.

```q
hdr:" HTTP/1.0\r\nHost: api.exchange.coinbase.com\r\nUser-Agent: peachq\r\n\r\n"
cb:{[p;s;e] r:(`$":https://api.exchange.coinbase.com") "GET /products/",p,"-USD/candles?granularity=60&start=",s,"&end=",e,hdr; .j.k(4+first r ss "\r\n\r\n")_r}
epoch:{string(`long$x-1970.01.01D)div 1000000000}
raw:{[c;d] t:d+0D04:48*til 5; flip`time`low`high`open`close`volume!flip raze cb[string c]'[epoch t;epoch t+0D04:47]}
day:{[c;d] `time xasc update sym:c,time:1970.01.01D+1000000000*`long$time from raw[c;d]}
coins:`BTC`ETH`SOL
{[d] bars::raze day[;d] each coins; .Q.dpft[`:hdb;d;`sym;`bars]} each 2026.11.13 2026.11.14
\l hdb
select open:first open,high:max high,low:min low,close:last close,vwap:volume wavg close by date,sym from bars
.massive.set_key "YOUR_MASSIVE_API_KEY"
mv:{[s;d] select date:d,sym:s,time:t,mclose:c from .massive.bars[`$"X:",(string s),"USD";d;d;`mult`span!(1;`minute)]}
m:raze mv[;2026.11.14] each coins
j:update bps:1e4*(close-mclose)%mclose from ej[`date`sym`time;select date,sym,time,close from bars where date=2026.11.14;m]
select n:count i,mad:avg abs bps,bias:avg bps,maxbps:max abs bps by sym from j
5#`abps xdesc select sym,time,close,mclose,abps:abs bps from j
```

The sections below walk through what each part does.

## Fetch minute bars from Coinbase

Coinbase's public candles endpoint returns minute bars as JSON arrays of `[time, low, high, open, close, volume]`, newest first, at most 300 per request. It refuses requests without a `User-Agent` header, and PeachQ's `.Q.hg` does not send one, so `cb` writes the HTTP request itself. Applying an `https://` handle to a request string sends it and returns the raw response:

```q
hdr:" HTTP/1.0\r\nHost: api.exchange.coinbase.com\r\nUser-Agent: peachq\r\n\r\n"
cb:{[p;s;e] r:(`$":https://api.exchange.coinbase.com") "GET /products/",p,"-USD/candles?granularity=60&start=",s,"&end=",e,hdr; .j.k(4+first r ss "\r\n\r\n")_r}
```

The request asks for HTTP/1.0, so the server sends the body in one piece, not in chunks. `cb` drops the response headers (everything up to the first blank line) and parses the rest with `.j.k`. It does not check the HTTP status: if Coinbase refuses a request, for example for sending too many, the body is a JSON error object and `raw` fails with a type or length error.

A day is 1,440 minutes, so `raw` makes five requests of 288 minutes each, with start and end times in Unix seconds. `day` turns the result into a table sorted by time, converting the seconds to timestamps and adding the `sym` column:

```q
epoch:{string(`long$x-1970.01.01D)div 1000000000}
raw:{[c;d] t:d+0D04:48*til 5; flip`time`low`high`open`close`volume!flip raze cb[string c]'[epoch t;epoch t+0D04:47]}
day:{[c;d] `time xasc update sym:c,time:1970.01.01D+1000000000*`long$time from raw[c;d]}
```

JSON numbers parse as floats, so every price and volume column is a q float (`f`).

## Write the HDB

For each date, the lambda builds one in-memory `bars` table for all three coins and hands it to `.Q.dpft`, exactly as you would with kdb+:

```q
q){[d] bars::raze day[;d] each coins; .Q.dpft[`:hdb;d;`sym;`bars]} each 2026.11.13 2026.11.14
`bars`bars
q)key `:hdb
`2026.11.13`2026.11.14`sym
```

`.Q.dpft` enumerates the symbol columns (here just `sym`) against `hdb/sym`, sorts the table by `sym`, applies the parted attribute and writes a splayed table under `hdb/2026.11.13/bars/` and `hdb/2026.11.14/bars/`. Coinbase omits minutes with no trades: this run stored 8,635 of a possible 8,640 bars, all five gaps on 13 November, which is why the comparison below uses 14 November.

## Load and query across partitions

`\l hdb` mounts the database and, as in kdb+, makes `hdb` the working directory. `bars` is now a partitioned table with the virtual column `date`. Here `vwap` weights each minute's close by its volume, an approximation of the true trade VWAP:

```q
q)\l hdb
q)select open:first open,high:max high,low:min low,close:last close,vwap:volume wavg close by date,sym from bars
| date       | sym    | open     | high     | low     | close    | vwap     |
| date       | symbol | float    | float    | float   | float    | float    |
|============|========|----------|----------|---------|----------|----------|
| 2026.11.13 | BTC    | 71369.9  | 71429.46 | 67555   | 68236.54 | 69037.21 |
| 2026.11.13 | ETH    | 2017.26  | 2018.61  | 1894.32 | 1928.28  | 1943.877 |
| 2026.11.13 | SOL    | 81.62    | 82.32    | 77.08   | 78.11    | 79.48537 |
| 2026.11.14 | BTC    | 68236.54 | 68380    | 63270   | 64118.79 | 65734.58 |
| 2026.11.14 | ETH    | 1928.08  | 1934.68  | 1727.73 | 1768.41  | 1833.29  |
| 2026.11.14 | SOL    | 78.12    | 78.42    | 68.54   | 70.25    | 73.29708 |
```

## Compare with Massive

The [`.massive` library](/docs/api/massive.q.html) wraps Massive's REST API and loads the first time you use it. `.massive.bars` returns bars for a ticker between two dates; Massive names crypto pairs like `X:BTCUSD`, and its columns are single letters (`t` for the bar time, `c` for the close). `t` is the start of the bar in UTC, the same convention as Coinbase's times, so the two sources' minutes line up exactly. `mv` keeps the time and close and adds `date` and `sym`, so the rows line up with the HDB:

```q
.massive.set_key "YOUR_MASSIVE_API_KEY"
mv:{[s;d] select date:d,sym:s,time:t,mclose:c from .massive.bars[`$"X:",(string s),"USD";d;d;`mult`span!(1;`minute)]}
m:raze mv[;2026.11.14] each coins
```

`ej` joins the HDB's 14 November bars to Massive's on date, symbol and minute, and `bps` is the Coinbase close's difference from Massive's in basis points. The summary at the top of this page uses `avg abs bps` for the typical gap and `avg bps` for the bias, since positive and negative minutes cancel in a plain average. The largest single differences:

```q
q)j:update bps:1e4*(close-mclose)%mclose from ej[`date`sym`time;select date,sym,time,close from bars where date=2026.11.14;m]
q)5#`abps xdesc select sym,time,close,mclose,abps:abs bps from j
| sym    | time                          | close    | mclose   | abps     |
| symbol | timestamp                     | float    | float    | float    |
|--------|-------------------------------|----------|----------|----------|
| ETH    | 2026.11.14D14:24:00.000000000 | 1863.76  | 1857.37  | 34.40348 |
| ETH    | 2026.11.14D02:27:00.000000000 | 1898.6   | 1905.15  | 34.38049 |
| BTC    | 2026.11.14D02:27:00.000000000 | 67395.64 | 67613.32 | 32.19484 |
| ETH    | 2026.11.14D02:30:00.000000000 | 1884.85  | 1888.78  | 20.80708 |
| ETH    | 2026.11.14D15:40:00.000000000 | 1832.55  | 1828.9   | 19.95735 |
```

The 02:27 minute is among the largest differences for both BTC and ETH. Massive's figures for the same minutes changed between our fetches, so your basis-point values may differ slightly from these.

## Limitations

- Queries on a partitioned database work but are not yet efficient: each query builds one in-memory table from the partitions it reads. That is fine at this size; a large HDB will be much slower than in kdb+.
- PeachQ's `.Q.hg` sends no `User-Agent` header, which is why `cb` writes its own request.
- The default static Linux archive cannot make HTTPS requests; use the glibc archive as above.
