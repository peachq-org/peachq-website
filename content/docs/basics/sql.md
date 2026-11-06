---
title: SQL | Basics | PeachQ
description: Run DuckDB SQL from PeachQ with s) lines, DuckDB handles, SQL text literals and bound parameters, and how SQL results and qSQL pushdown differ.
keywords: duckdb, peachq, q, s), sql, parameters, pushdown
---

<!-- peachq: audience="You know q and qSQL and want to run SQL statements from PeachQ." goal="Find the SQL entry points, parameter forms, result types and pushdown controls." -->

# SQL

--8<-- "includes/experimental.md"

--8<-- "includes/duckdb-download.md"

PeachQ runs SQL through the DuckDB 2.0 library bundled with the `-duckdb` download. On x86-64, that
library needs a CPU with AVX2.

For a worked example, see the [SQL and DuckDB storage guide](../guides/sql-duckdb.md). For storing and
querying q tables in a DuckDB file, see [Storing tables in DuckDB](../peachq/sql-duckdb-storage.md).
Function signatures are in the [`.duckdb` library API](/docs/api/duckdb.q.html).

<div markdown="1" class="typewriter">
h sql                  run sql on the DuckDB handle h
.duckdb.exec[h;sql]    the same, as a function
s)sql                  run sql on the main DuckDB instance (a console or script line)
.s.ex sql              the same, as a function
``sql …``              SQL text literal; $name markers bind q names
(sql;dict)             bind $name markers by name
(sql;list)             bind $1, $2 … or ? markers by position
.duckdb.params sql     the markers a statement declares
.duckdb.err[]          the reason for the last 'duckdb
.duckdb.sqllog         every statement sent to DuckDB
.duckdb.pushdown       1b: run qSQL inside DuckDB where possible
.duckdb.maxrows        refuse unfiltered selects on larger tables
</div>

## Handles

```syntax
h:hopen (`:pq:duckdb:alias;path)
hclose h
```

Opens the DuckDB database file `path` (created if missing), or an in-memory database when `path` is
`":memory:"`, under the symbol `alias`. The result is the symbol `` `:pq:duckdb:alias ``. Each table is
also reachable as the coordinate `` `:pq:duckdb:alias:table/ ``, used with `set`, `upsert`, `get`,
`select` and `hdel`. [`hopen`](../ref/hopen.md) lists every DuckDB form, and the
[API reference](/docs/api/pq.q.html#-pq-hopen_duckdb) documents `.pq.hopen_duckdb[alias;path]`, the same opener as a function.

```q
q)h:hopen (`:pq:duckdb:mkt;"mkt.duckdb")
q)`:pq:duckdb:mkt:trade/ set ([] sym:`IBM`MSFT`IBM; price:182.1 415.3 183.0; size:300 200 150)
`trade
```

## External tables

```syntax
t:get `:pq:duckdb:alias:table/
```

`get` of a table coordinate gives an **external table**: a q table whose data stays in DuckDB. qSQL and SQL
both work on it, and writes such as `` `t insert … `` go through to DuckDB. In `s)` and `.s.ex` it is
visible under its q name.

```q
q)t:get `:pq:duckdb:mkt:trade/
q)select sum size by sym from t
| sym    | size |
| symbol | long |
|========|------|
| IBM    | 450  |
| MSFT   | 200  |
q)s)SELECT count(*) AS n FROM t
| n    |
| long |
|------|
| 3    |
```

In v0.89, `#`, indexing and joins such as `lj` on an external table signal `'type` or give a wrong result;
select into memory first.

## Running SQL

`h sql` and `.duckdb.exec[h;sql]` run `sql` on the handle `h`, where the alias's tables are visible by name.
The result is a table. A statement without a result, such as `CREATE TABLE`, answers `::`.

```q
q)h "SELECT sym, size FROM trade WHERE size > 160"
| sym    | size |
|        | long |
|--------|------|
| "IBM"  | 300  |
| "MSFT" | 200  |
q).duckdb.exec[h;"SELECT count(*) AS n FROM trade"]
| n    |
| long |
|------|
| 3    |
```

A line starting `s)` passes the rest of the line to the main DuckDB instance. `.s.ex` does the same from
a function; an `s)` line inside a function body is a `'parse` error. On the main instance a table of an
alias opened on a file is `alias.table`:

```q
q)s)SELECT max(price) AS hi FROM mkt.trade
| hi    |
| float |
|-------|
| 415.3 |
q).s.ex "SELECT max(price) AS hi FROM mkt.trade"
| hi    |
| float |
|-------|
| 415.3 |
```

An alias opened on `":memory:"` is not reachable under its own name from `s)`: it is attached as
`"default"`, so its tables are `"default".table`.

`s)CREATE TABLE …` also binds a q name for each new table of the main instance. The main instance is
in-memory unless q is started with [`-duckdb path`](cmdline.md#peachq-specific-options).

Text holding several statements runs them in order and answers the last statement's result.

## SQL text literals

A double-backtick literal is verbatim text, so SQL needs no escaping of quotes or backslashes:

```q
q)``SELECT 1 AS a``
"SELECT 1 AS a"
q)``raw SELECT $x``
"SELECT $x"
```

A literal starting `sql` or `SELECT` whose text contains `$name` markers parses to a `(sql;dict)` pair,
with each `name` referenced as an ordinary q name: a function argument, a local or a global, resolved
when the expression runs. `` ``raw …`` `` and text with only positional markers stay strings.

```q
q)parse "``sql SELECT $lo AS a``"
enlist
"SELECT $lo AS a"
(!;(`enlist;,`lo);(`enlist;`lo))
```

A marker that is not a q name (`$_y`), or two markers that differ only in case (`$x` and `$X`), is a
`'parse` error, because DuckDB treats names case-insensitively.

## Parameters

Every SQL entry point (`h`, `.duckdb.exec`, `.s.ex`, `s)`) takes a pair in place of a string.
Values are bound by DuckDB; they are never pasted into the SQL text.

| Form | Binds |
|---|---|
| `(sql;dict)` | each `$name` from the key `name` |
| `(sql;list)` | `$1`, `$2` … or `?`, one list item per marker |
| `(sql;())` | nothing: the same as `sql` |

```q
q)h ("SELECT sym FROM trade WHERE size > $lo";enlist[`lo]!enlist 160)
| sym    |
|        |
|--------|
| "IBM"  |
| "MSFT" |
q)h ("SELECT sym FROM trade WHERE size > $1 AND sym = $2";(160;`IBM))
| sym   |
|       |
|-------|
| "IBM" |
q)h ("SELECT sym, size FROM trade WHERE sym IN $syms";enlist[`syms]!enlist `IBM`AAPL)
| sym   | size |
|       | long |
|-------|------|
| "IBM" | 300  |
| "IBM" | 150  |
```

A symbol or string binds as `VARCHAR`. A vector binds as a DuckDB `LIST`, so in a positional list a single
string or vector must be enlisted: `("SELECT $1";"AAPL")` supplies four parameters and fails.

With a literal, the markers capture q names directly:

```q
q)lo:160
q)h ``sql SELECT sym FROM trade WHERE size > $lo``
| sym    |
|        |
|--------|
| "IBM"  |
| "MSFT" |
q)above:{[lo] .s.ex ``sql SELECT sym FROM mkt.trade WHERE size > $lo``}
q)above 250
| sym   |
|       |
|-------|
| "IBM" |
q).duckdb.params "SELECT * FROM trade WHERE size > $lo AND size < $hi"
`lo`hi
```

## Result types

SQL answers in DuckDB's types, converted to q; qSQL on a table written from q answers in the table's own
q types. `.duckdb.types[]` lists the conversions.

```q
q)meta select from `:pq:duckdb:mkt:trade/
| c      | t    | f      | a      |
| symbol | char | symbol | symbol |
|========|------|--------|--------|
| sym    | s    |        |        |
| price  | f    |        |        |
| size   | j    |        |        |
q)meta h "SELECT sym, size FROM trade"
| c      | t    | f      | a      |
| symbol | char | symbol | symbol |
|========|------|--------|--------|
| sym    | C    |        |        |
| size   | j    |        |        |
```

| SQL result | q result |
|---|---|
| `VARCHAR`, including a symbol column written from q | string (`C`) |
| `INTEGER`, such as an integer literal | int |
| `BIGINT`, and `HUGEINT` such as `sum` of a `BIGINT` column | long |
| `DECIMAL`, such as the literal `182.1` | long holding the unscaled value: cast to `DOUBLE` for a float |
| `TIMESTAMP WITH TIME ZONE` | timestamp, plus a `<col>_q_tzoff` int column |
| `TIMESTAMPTZ_NS` | not supported: `'duckdb`, "has no mapping" |

```q
q)h "SELECT 182.1 AS dec, 182.1::DOUBLE AS dbl"
| dec  | dbl   |
| long | float |
|------|-------|
| 1821 | 182.1 |
```

A table written from q also stores its row index as a column `i`, which `SELECT *` returns.

## qSQL on DuckDB tables

`select` on a coordinate runs in DuckDB the where terms, `by` and aggregates it can answer exactly as q
would, and q runs the rest. The answer is always q's. The rules are listed under
[pushdown](../peachq/sql-duckdb-storage.md#pushdown-what-runs-in-duckdb-what-runs-in-q).

| Name | Default | Meaning |
|---|---|---|
| `.duckdb.pushdown` | `1b` | `0b` fetches the whole table and runs every select in q |
| `.duckdb.maxrows` | `0W` | a select on a larger q-written table with no where term DuckDB can run is `'limit` |
| `.duckdb.sqllog` | | table of statements sent: `time dur ok conn rows ncols sql err` |
| `.duckdb.sqllogmax` | `4096` | size cap for `.duckdb.sqllog`; `0` turns logging off |

Below, the symbol filter runs in DuckDB and the float comparison runs in q, which compares floats with a
[tolerance](precision.md):

```q
q).duckdb.sqllog::0#.duckdb.sqllog
q)select from `:pq:duckdb:mkt:trade/ where sym=`IBM, price>182.5
| sym    | price | size |
| symbol | float | long |
|--------|-------|------|
| IBM    | 183   | 150  |
q)exec sql from .duckdb.sqllog
"SELECT sym, price, size FROM trade WHERE sym = $pq1 ORDER BY i"
q).duckdb.pushdown:0b
q)select from `:pq:duckdb:mkt:trade/ where sym=`IBM, price>182.5
| sym    | price | size |
| symbol | float | long |
|--------|-------|------|
| IBM    | 183   | 150  |
q)last exec sql from .duckdb.sqllog
"SELECT \"sym\", \"price\", \"size\" FROM \"trade\" ORDER BY i"
q).duckdb.pushdown:1b
q).duckdb.maxrows:2
q)@[{select from x}; `:pq:duckdb:mkt:trade/; {"error: ",x}]
"error: limit"
q).duckdb.err[]
"trade: 3 rows exceed .duckdb.maxrows 2; a where term the translator can push is required"
```

The first select on a table after it is opened also logs the catalog queries that read its schema.

## Errors

| Error | Cause |
|---|---|
| `'duckdb` | DuckDB refused the statement or a value could not be converted; `.duckdb.err[]` has the reason |
| `'limit` | `.duckdb.maxrows` refused a select before any statement ran |
| `'type` | a list on a handle that is not a `(sql;params)` pair |
| `'parse` | an `s)` line inside a function, or an invalid `$name` marker in a literal |

----
:fontawesome-solid-book-open:
[qSQL](qsql.md),
[Functional qSQL](funsql.md),
[Storing tables in DuckDB](../peachq/sql-duckdb-storage.md),
[Parquet](../peachq/parquet.md)
<br>
:fontawesome-solid-graduation-cap:
[SQL and DuckDB storage guide](../guides/sql-duckdb.md)
