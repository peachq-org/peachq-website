---
title: SQL and DuckDB storage
description: Keep a q table in a DuckDB file as an external table, query the same table with qSQL and SQL, bind q values into SQL and see the SQL that ran inside DuckDB.
---

<!-- peachq: audience="You are a q developer who knows SQL and wants to use SQL alongside q, and to keep q tables in a DuckDB file rather than in memory." goal="Store a trade table in a DuckDB file, use it as an external table from qSQL and SQL, pass q values into SQL and check what ran inside DuckDB." -->

# SQL and DuckDB storage

<video class="peachq-video" controls preload="none" playsinline src="/video/sql-duckdb-HD.mp4" poster="/recordings/sql-duckdb/intro-frame.png" aria-label="Opening a DuckDB file, storing a trade table, querying the same external table with qSQL and SQL, and reading the SQL that ran inside DuckDB"></video>

Use the player's fullscreen control for a larger view.

--8<-- "includes/experimental.md"

PeachQ supports **external tables**: q tables whose data stays in a DuckDB database. qSQL and SQL both
work on them, and writes go through to DuckDB. You get DuckDB in full,
with its SQL dialect and functions and its access to files over HTTPS and on S3. The download
bundles DuckDB's `httpfs`, `aws` and `ducklake` extensions, which load without a network connection. The
same table also answers qSQL with your q types: `select`, `exec`, `update`, `count` and `insert` work on it
as on an in-memory table, and PeachQ runs as much of each `select` as it can inside DuckDB.

DuckDB is where PeachQ storage is heading: tables in an open format that other tools can read. PeachQ's own
reader also opens splayed tables written by kdb+, so existing on-disk data can be read and copied into
DuckDB. Partitioned databases do not load yet.

PeachQ stores each table as an ordinary DuckDB table in the `.duckdb` file, beside a `_q_schema` table that
records the q types, so a DuckDB 2.0 client such as the `duckdb` command-line tool can read it too.
DuckDB 1.x clients cannot open the file.

This guide stores a `trade` table in a DuckDB file and answers the same question from it with qSQL and with
SQL. Here is the qSQL answer, the SQL that PeachQ sent to DuckDB for it, and the SQL answer:

```q
q)select hi:max price, vol:sum size by sym from t
| sym    | hi    | vol  |
| symbol | float | long |
|========|-------|------|
| AAPL   | 228.4 | 870  |
| IBM    | 183   | 550  |
| MSFT   | 416.1 | 950  |
q)-1 exec last sql from .duckdb.sqllog;
SELECT sym, coalesce(max(price), $pq1) AS hi, CAST(coalesce(sum(size), $pq2) AS BIGINT) AS vol FROM trade GROUP BY sym ORDER BY sym
q)h "SELECT sym, max(price) AS hi, sum(size) AS vol FROM trade GROUP BY sym ORDER BY sym"
| sym    | hi    | vol  |
|        | float | long |
|--------|-------|------|
| "AAPL" | 228.4 | 870  |
| "IBM"  | 183   | 550  |
| "MSFT" | 416.1 | 950  |
```

The grouping and both aggregates ran inside DuckDB, and only three rows came back into q. The SQL answer has
the same numbers, but `sym` is a string column rather than symbols.

The functions used here are listed in the [SQL reference](../basics/sql.md), [`hopen`](../ref/hopen.md#peachq-handles)
and [Storing tables in DuckDB](../peachq/sql-duckdb-storage.md).

## What you need

--8<-- "includes/duckdb-download.md"

- The PeachQ download with DuckDB. On Linux x64 (glibc) it is one command, shown below.
- On x86-64, a CPU with AVX2, which the bundled DuckDB 2.0 requires. On Linux, `grep -c avx2 /proc/cpuinfo`
  prints a number above zero when it is present.

## Run it

Download PeachQ into an empty directory and start it:

```bash
mkdir sql-demo && cd sql-demo
curl -fL https://peachq.org/download/peachq-linux-x64-duckdb.tar.gz | tar -xz
./q
```

Then paste the session. It creates `mkt.duckdb` in the current directory:

<!-- peachq: title="Store and query a DuckDB table" -->
```q
h:hopen (`:pq:duckdb:mkt;"mkt.duckdb")
h "SELECT version() AS duckdb, list_sort([3, 1, 2]) AS sorted, strftime(DATE '2026-10-21', '%A') AS day"
trade:([] sym:`IBM`MSFT`AAPL`IBM`MSFT`AAPL`IBM`MSFT; price:182.1 415.3 227.5 182.6 414.8 228.0 183.0 416.1; size:300 200 500 100 400 250 150 350)
`:pq:duckdb:mkt:trade/ set trade
select hi:max price, vol:sum size by sym from `:pq:duckdb:mkt:trade/
t:get `:pq:duckdb:mkt:trade/
`t insert ([] sym:enlist `AAPL; price:enlist 228.4; size:enlist 120)
h "SELECT count(*) AS n FROM trade"
select hi:max price, vol:sum size by sym from t
-1 exec last sql from .duckdb.sqllog;
h "SELECT sym, max(price) AS hi, sum(size) AS vol FROM trade GROUP BY sym ORDER BY sym"
s)SELECT sym, count(*) AS n FROM t GROUP BY sym ORDER BY sym
bigTrades:{[lo] h ``sql SELECT sym, sum(size) AS vol FROM trade WHERE size >= $lo GROUP BY sym ORDER BY sym``}
bigTrades 200
(.pq.info h)`tables
.duckdb.maxrows:5
@[{select from x}; t; {"error: ",x}]
select from t where sym=`AAPL
.duckdb.maxrows:0W
hclose h
```

The sections below walk through the same session.

## Open a DuckDB database

`hopen` of the pair `` (`:pq:duckdb:mkt;"mkt.duckdb") `` opens a DuckDB database file under a name you
choose, here `mkt`, and creates the file if it does not exist. The result is the symbol `` `:pq:duckdb:mkt ``,
used as the handle. A string sent to it is DuckDB SQL, with all of DuckDB's functions:

```q
q)h:hopen (`:pq:duckdb:mkt;"mkt.duckdb")
q)h
`:pq:duckdb:mkt
q)h "SELECT version() AS duckdb, list_sort([3, 1, 2]) AS sorted, strftime(DATE '2026-10-21', '%A') AS day"
| duckdb   | sorted | day         |
|          |        |             |
|----------|--------|-------------|
| "v2.0.0" | 1 2 3i | "Wednesday" |
```

The DuckDB list comes back as a q list, and the text as strings.

## Store a table

Each table in the database is a coordinate, `` `:pq:duckdb:mkt:trade/ ``, which works with `set`, `upsert`,
`get` and `select` like a file path. `set` writes the whole table, replacing any table of that name, and
`upsert` appends rows. Both are in the file when they return:

```q
q)trade:([] sym:`IBM`MSFT`AAPL`IBM`MSFT`AAPL`IBM`MSFT; price:182.1 415.3 227.5 182.6 414.8 228.0 183.0 416.1; size:300 200 500 100 400 250 150 350)
q)`:pq:duckdb:mkt:trade/ set trade
`trade
```

Close the handle, open the file again, and the eight rows are still there:

```q
q)hclose h
q)h:hopen (`:pq:duckdb:mkt;"mkt.duckdb")
q)count get `:pq:duckdb:mkt:trade/
8
```

The table keeps its q types, so `sym` comes back as symbols and `size` as longs.

## Query it with qSQL

A `select` on the coordinate answers exactly as the same select on the in-memory table. The stored table
needs no loading first:

```q
q)select hi:max price, vol:sum size by sym from `:pq:duckdb:mkt:trade/
| sym    | hi    | vol  |
| symbol | float | long |
|========|-------|------|
| AAPL   | 228   | 750  |
| IBM    | 183   | 550  |
| MSFT   | 416.1 | 950  |
q)select from `:pq:duckdb:mkt:trade/ where sym=`IBM
| sym    | price | size |
| symbol | float | long |
|--------|-------|------|
| IBM    | 182.1 | 300  |
| IBM    | 182.6 | 100  |
| IBM    | 183   | 150  |
```

PeachQ translates as much of the select as DuckDB can answer exactly, so the grouping, the aggregates and the
`sym` filter run inside DuckDB. [See what ran](#see-what-ran) shows how to check.

## Use it as an external table

`get` of the coordinate gives an external table. Here `t` is an external table over `trade`:

```q
q)t:get `:pq:duckdb:mkt:trade/
q)type t
98h
q)meta t
| c      | t    | f      | a      |
| symbol | char | symbol | symbol |
|========|------|--------|--------|
| sym    | s    |        |        |
| price  | f    |        |        |
| size   | j    |        |        |
```

Insert a late trade through `t`. The row lands in the DuckDB table, so SQL on the handle sees it at once:

```q
q)`t insert ([] sym:enlist `AAPL; price:enlist 228.4; size:enlist 120)
,8
q)count t
9
q)h "SELECT count(*) AS n FROM trade"
| n    |
| long |
|------|
| 9    |
```

The same table answers qSQL through `t` and SQL through `h`:

```q
q)select hi:max price, vol:sum size by sym from t
| sym    | hi    | vol  |
| symbol | float | long |
|========|-------|------|
| AAPL   | 228.4 | 870  |
| IBM    | 183   | 550  |
| MSFT   | 416.1 | 950  |
q)h "SELECT sym, max(price) AS hi, sum(size) AS vol FROM trade GROUP BY sym ORDER BY sym"
| sym    | hi    | vol  |
|        | float | long |
|--------|-------|------|
| "AAPL" | 228.4 | 870  |
| "IBM"  | 183   | 550  |
| "MSFT" | 416.1 | 950  |
```

Other qSQL works too. `update` returns an in-memory result and leaves the stored table unchanged:

```q
q)update notional:price*size from t where sym=`IBM
| sym    | price | size | notional |
| symbol | float | long | float    |
|--------|-------|------|----------|
| IBM    | 182.1 | 300  | 54630    |
| MSFT   | 415.3 | 200  |          |
| AAPL   | 227.5 | 500  |          |
| IBM    | 182.6 | 100  | 18260    |
| MSFT   | 414.8 | 400  |          |
| AAPL   | 228   | 250  |          |
| IBM    | 183   | 150  | 27450    |
| MSFT   | 416.1 | 350  |          |
| AAPL   | 228.4 | 120  |          |
```

## Query it with SQL

A line starting `s)` runs SQL on PeachQ's main DuckDB instance. There the external table is visible under its
q name, `t`, and the stored table under its qualified name, `mkt.trade`:

```q
q)s)SELECT sym, count(*) AS n FROM t GROUP BY sym ORDER BY sym
| sym    | n    |
|        | long |
|--------|------|
| "AAPL" | 3    |
| "IBM"  | 3    |
| "MSFT" | 3    |
q)s)SELECT sym, count(*) AS n FROM mkt.trade GROUP BY sym ORDER BY sym
| sym    | n    |
|        | long |
|--------|------|
| "AAPL" | 3    |
| "IBM"  | 3    |
| "MSFT" | 3    |
```

SQL answers in DuckDB's types. DuckDB stores `sym` as text, so SQL returns strings where qSQL returns
symbols:

```q
q)meta h "SELECT sym, size FROM trade"
| c      | t    | f      | a      |
| symbol | char | symbol | symbol |
|========|------|--------|--------|
| sym    | C    |        |        |
| size   | j    |        |        |
```

Use qSQL when you want your q types back, and SQL when you want DuckDB's SQL features or a result to hand to
other SQL tools.

## Pass q values into SQL

Inside a `` ``sql …`` `` literal, `$lo` stands for the q name `lo`. PeachQ binds its value as a parameter when
the line runs, so values are never pasted into the SQL text:

```q
q)lo:300
q)h ``sql SELECT sym, price, size FROM trade WHERE size >= $lo ORDER BY size``
| sym    | price | size |
|        | float | long |
|--------|-------|------|
| "IBM"  | 182.1 | 300  |
| "MSFT" | 416.1 | 350  |
| "MSFT" | 414.8 | 400  |
| "AAPL" | 227.5 | 500  |
```

The name is resolved like any other name in the expression, so inside a function `$lo` is the argument:

```q
q)bigTrades:{[lo] h ``sql SELECT sym, sum(size) AS vol FROM trade WHERE size >= $lo GROUP BY sym ORDER BY sym``}
q)bigTrades 200
| sym    | vol  |
|        | long |
|--------|------|
| "AAPL" | 750  |
| "IBM"  | 300  |
| "MSFT" | 950  |
```

To build the parameters yourself, pass a `(sql;dict)` pair. A symbol vector binds as one list parameter, which
suits `IN`:

```q
q)h ("SELECT sym, size FROM trade WHERE sym IN $syms ORDER BY size";enlist[`syms]!enlist `IBM`AAPL)
| sym    | size |
|        | long |
|--------|------|
| "IBM"  | 100  |
| "AAPL" | 120  |
| "IBM"  | 150  |
| "AAPL" | 250  |
| "IBM"  | 300  |
| "AAPL" | 500  |
```

Positional `$1` and `?` markers take a `(sql;list)` pair; see [parameters](../basics/sql.md#parameters).

## See what ran

`.duckdb.sqllog` is a table of every statement PeachQ sent to DuckDB. Clear it, run a select, and read the
SQL. Here the symbol filter ran in DuckDB, which sent back the three `AAPL` rows; the float comparison
`price>228` ran in q, because q compares floats with a [tolerance](../basics/precision.md) and DuckDB does
not:

```q
q).duckdb.sqllog::0#.duckdb.sqllog
q)select from t where sym=`AAPL, price>228
| sym    | price | size |
| symbol | float | long |
|--------|-------|------|
| AAPL   | 228.4 | 120  |
q)-1 each exec sql from .duckdb.sqllog;
SELECT sym, price, size FROM trade WHERE sym = $pq1 ORDER BY i
q)select ok, rows, ncols from .duckdb.sqllog
| ok      | rows | ncols |
| boolean | long | long  |
|---------|------|-------|
| 1       | 3    | 3     |
```

The literal `` `AAPL `` travels as the parameter `$pq1`. Setting `.duckdb.pushdown:0b` turns this off, and
the same select fetches the whole table:

```q
q).duckdb.pushdown:0b
q).duckdb.sqllog::0#.duckdb.sqllog
q)select from t where sym=`AAPL, price>228
| sym    | price | size |
| symbol | float | long |
|--------|-------|------|
| AAPL   | 228.4 | 120  |
q)-1 each exec sql from .duckdb.sqllog;
SELECT "sym", "price", "size" FROM "trade" ORDER BY i
q).duckdb.pushdown:1b
```

`.pq.info` on the handle lists the tables the connection has read, with their row counts:

```q
q)(.pq.info h)`tables
| table  | origin | bound                         | rows |
| symbol | symbol | timestamp                     | long |
|--------|--------|-------------------------------|------|
| trade  | q      | 2026.10.21D22:05:46.972884165 | 9    |
```

On a large table, an unfiltered select would copy every row into q. `.duckdb.maxrows` guards against that:
a select on a table with more rows is refused with `'limit` before anything is fetched, unless a where term
runs in DuckDB. A float comparison alone does not count, because it runs in q:

```q
q).duckdb.maxrows:5
q)@[{select from x}; t; {"error: ",x}]
"error: limit"
q).duckdb.err[]
"trade: 9 rows exceed .duckdb.maxrows 5; a where term the translator can push is required"
q)select from t where sym=`AAPL
| sym    | price | size |
| symbol | float | long |
|--------|-------|------|
| AAPL   | 227.5 | 500  |
| AAPL   | 228   | 250  |
| AAPL   | 228.4 | 120  |
q)@[{select from x where price>400}; t; {"error: ",x}]
"error: limit"
q).duckdb.maxrows:0W
q)hclose h
```

`count` and `get` are never limited.

## Summary

You opened a DuckDB file from q and ran DuckDB SQL on it, stored a q table there, and used it as an external
table: the same data answered qSQL with q types and SQL with DuckDB's, and an insert through q was visible to
SQL at once. You bound a q function argument into SQL with `$lo`, and used `.duckdb.sqllog`, `.pq.info` and
`.duckdb.maxrows` to see and limit what crosses from DuckDB into q.

## Limitations

- **Some query shapes run in q.** Float comparisons, casts such as `time.minute`, `fby`, `med`, your own
  functions and joins run in q on the rows DuckDB returns. The answer is the same; only where the work
  happens changes. The [pushdown rules](../peachq/sql-duckdb-storage.md#pushdown-what-runs-in-duckdb-what-runs-in-q)
  list them.
- **External tables are not yet q tables in every respect.** `#`, indexing such as `t 0` and joins such as
  `lj` signal `'type` or give a wrong result. Select the rows you need first, for example `select from t`,
  and work on the in-memory result.
- **Tables created in SQL** carry no q type information. A qSQL select on one fetches the whole table, and
  `.duckdb.maxrows` does not apply.
- **Decimal literals in SQL** come back as longs holding the unscaled value: `h "SELECT 228.4 AS px"` answers
  `2284`. Cast to `DOUBLE` (`228.4::DOUBLE`) for a float.
- **`TIMESTAMPTZ_NS`** results are refused with `'duckdb`; `.duckdb.err[]` reports that the type has no
  mapping. Cast to `TIMESTAMP_NS` or `TIMESTAMPTZ` in the query.
- **`SELECT *`** on a table written from q also returns its stored row index column `i`. Name the columns,
  or use `SELECT * EXCLUDE (i)`.
- **`s)` lines** work at the console and in scripts, not inside a function body; use `.s.ex` there.
- **AVX2.** The bundled DuckDB 2.0 needs an x86-64 CPU with AVX2.
