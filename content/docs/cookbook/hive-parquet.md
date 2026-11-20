---
title: Hive-partitioned parquet with qSQL
description: Query a hive-partitioned parquet lake with qSQL, let DuckDB skip the files your where clause rules out, and see what ran where, then ask the same question in SQL, through a DuckDB view and on S3.
source_notes: Website-authored recipe. The example lake is generated in the recipe. The S3 example reads green_tripdata_2024-02.parquet, a copy of the NYC Taxi and Limousine Commission's February 2024 green taxi trip records, from KX's public demo bucket kxs-prd-cxt-twg-roinsightsdemo; the file is not copied to this site.
---

<!-- peachq: audience="You know q well and keep parquet files in a hive-partitioned layout, perhaps on S3. You know a little DuckDB and are new to PeachQ." goal="Query a hive-partitioned parquet lake with ordinary qSQL, confirm that DuckDB reads only the matching files, see which filters run in DuckDB and which in q, and ask the same question in SQL, through a view and on S3." -->

# Hive-partitioned parquet with qSQL

A parquet lake in hive layout, `lake/region=emea/market=LDN/date=2026-11-09/sym=BBB/data_0.parquet`, already
holds the partitioning that a where clause needs. PeachQ hands a qSQL select on such a lake to DuckDB, which uses
the directory names to skip whole files. This recipe builds a 450-file lake and asks one question of it:

```q
q)lake:`$":lake/**/*.parquet"
q)\t r:select ct:count sym by date,market from lake where date within 2026.11.09 2026.11.13,market=`LDN,region=`emea,sym=`BBB
63
q)r
| date       | market | ct   |
| date       |        | long |
|============|========|------|
| 2026.11.09 | "LDN"  | 2000 |
| 2026.11.10 | "LDN"  | 2000 |
| 2026.11.11 | "LDN"  | 2000 |
| 2026.11.12 | "LDN"  | 2000 |
| 2026.11.13 | "LDN"  | 2000 |
```

DuckDB opened 5 of the 450 files, counted inside DuckDB and sent five rows back to q. The first query of a session
took 55 to 150 ms in our runs, including reading the lake's schema; a repeat took about 20 ms. With pushdown
turned off (`.duckdb.set_pushdown 0b`), the same select read all 900,000 rows into q and took about 300 ms.
Without pushdown every row of the lake comes back to q, so that cost grows with the lake; the pushed query reads
only the files its partitions name. These timings are from a Linux x86-64 virtual machine with
10 virtual cores on an Intel Core i7-12700H host and the lake on local disk.

<video class="peachq-video" controls preload="none" playsinline src="/video/hive-parquet-FHD.mp4" poster="/recordings/hive-parquet/intro-frame.png"></video>

## What you need

- **PeachQ 0.92.20261120 or later**, in the Linux x64 download with DuckDB. Check with `` .z.v`version ``.
- Linux x86-64 with glibc. The DuckDB download bundles DuckDB with its `httpfs` and `aws` extensions.
- Network access for the S3 step only. Everything else runs on local files.

The [qSQL on DuckDB tables and parquet files](../peachq/qsql-foreign-tables.md) reference lists every type
mapping and pushdown rule used below. [Parquet](../peachq/parquet.md) covers `.parquet.read`, writing and S3
credentials.

## Copy and run

Download PeachQ with DuckDB into a fresh directory and start it:

```sh
mkdir hive-parquet && cd hive-parquet
curl -fL https://peachq.org/download/peachq-linux-x64-duckdb.tar.gz | tar -xz
./q
```

Paste this into the q session. Run it in a directory without a `lake` folder: DuckDB's partitioned write refuses
a directory that is not empty.

```q
mk:`emea`amer`apac!(`LDN`PAR;`NYC`CHI;`TYO`HKG)
syms:`AAA`BBB`CCC`DDD`EEE; dates:2026.11.02+til 15; n:2000
day:{[r;m;d;s] ([] region:n#r; market:n#m; date:n#d; sym:n#s; time:d+asc n?1D; level:n?5i; bid:100+n?1f; ask:101+n?1f; bsz:n?1000; asz:n?1000)}
book:raze day ./: raze {(enlist x) cross mk[x] cross dates cross syms} each key mk
g:hopen (`:pq:duckdb:gen;":memory:")
`:pq:duckdb:gen:book/ set book
g "COPY (SELECT * EXCLUDE (i) FROM book) TO 'lake' (FORMAT PARQUET, PARTITION_BY (region, market, date, sym))"
g "SELECT count(*) AS files FROM glob('lake/**/*.parquet')"
lake:`$":lake/**/*.parquet"
\t r:select ct:count sym by date,market from lake where date within 2026.11.09 2026.11.13,market=`LDN,region=`emea,sym=`BBB
r
select dur,rows from -1#.duckdb.sqllog
sent:{s:last exec sql from .duckdb.sqllog; (first s ss "WHERE")_s}
-1 sent[];
select n:count i,mx:max bid by date from lake where date within 2026.11.09 2026.11.10,market=`LDN,sym=`BBB,bid>100.99
-1 sent[];
h:hopen (`:pq:duckdb:lake;"lake.duckdb")
h "CREATE OR REPLACE VIEW quotes AS SELECT * FROM read_parquet('lake/**/*.parquet', hive_partitioning=true)"
quotes:get `:pq:duckdb:lake:quotes/
select ct:count sym by date,market from quotes where date within 2026.11.09 2026.11.13,market=`LDN,region=`emea,sym=`BBB
taxi:`$":s3://kxs-prd-cxt-twg-roinsightsdemo/green_tripdata_2024-02.parquet"
select trips:count i,fare:avg fare_amount by payment_type from taxi where payment_type in 1 2
d0:2026.11.09; d1:2026.11.13; mkt:`LDN; s:`BBB
h ``sql SELECT date, market, count(*) AS ct FROM read_parquet('lake/**/*.parquet') WHERE date BETWEEN $d0 AND $d1 AND market = $mkt AND region = 'emea' AND sym = $s GROUP BY date, market ORDER BY date``
p:h ``sql EXPLAIN ANALYZE SELECT count(*) FROM read_parquet('lake/**/*.parquet') WHERE date BETWEEN $d0 AND $d1 AND market = $mkt AND region = 'emea' AND sym = $s``
-1 {trim -3_4_x} each l where (l:"\n" vs first p`explain_value) like "*Files*";
```

The sections below walk through each part.

## Generate a hive-partitioned lake

The lake is a depth-of-book style quote table: three regions with two markets each, five symbols and 15 days.
`day` builds one partition of 2,000 quotes, and `book` joins all 450 of them, 900,000 rows in all:

```q
mk:`emea`amer`apac!(`LDN`PAR;`NYC`CHI;`TYO`HKG)
syms:`AAA`BBB`CCC`DDD`EEE; dates:2026.11.02+til 15; n:2000
day:{[r;m;d;s] ([] region:n#r; market:n#m; date:n#d; sym:n#s; time:d+asc n?1D; level:n?5i; bid:100+n?1f; ask:101+n?1f; bsz:n?1000; asz:n?1000)}
book:raze day ./: raze {(enlist x) cross mk[x] cross dates cross syms} each key mk
```

DuckDB writes the lake. `` hopen (`:pq:duckdb:gen;":memory:") `` opens a DuckDB database (here in memory, or a
file path) under the name `gen`, so `` `:pq:duckdb:gen:book/ `` names a table in it. The table is stored there,
and one `COPY` with `PARTITION_BY`
writes a directory level per partition column. `EXCLUDE (i)` leaves out the row index column that PeachQ keeps with
a q table in DuckDB:

```q
q)g:hopen (`:pq:duckdb:gen;":memory:")
q)`:pq:duckdb:gen:book/ set book
`book
q)g "COPY (SELECT * EXCLUDE (i) FROM book) TO 'lake' (FORMAT PARQUET, PARTITION_BY (region, market, date, sym))"
| Count  |
| long   |
|--------|
| 900000 |
q)g "SELECT count(*) AS files FROM glob('lake/**/*.parquet')"
| files |
| long  |
|-------|
| 450   |
```

Files written this way carry no q type information, like files written by Spark, pandas or another tool. That is
the case this recipe is about. A file written by `.parquet.write` records its q types and reads back exactly as
written; see [Parquet](../peachq/parquet.md).

## Query the glob with qSQL

A file symbol ending `.parquet` is a table to qSQL, and so is a glob. `*` is not a symbol character, so build the
symbol from a string. DuckDB recognises the `name=value` directories and adds `region`, `market`, `date` and `sym`
as columns:

```q
q)lake:`$":lake/**/*.parquet"
q)\t r:select ct:count sym by date,market from lake where date within 2026.11.09 2026.11.13,market=`LDN,region=`emea,sym=`BBB
63
```

`market` comes back as a string, `"LDN"`. A text column from a file PeachQ did not write is a string column, never
a symbol, and the `date=2026-11-09` directories read as dates. In the where clause, `` market=`LDN `` still works:
on these columns a symbol compares with the whole string. To get symbols in a result, cast in the select phrase:

```q
q)select ct:count i by date,`$market from lake where date=2026.11.09,region=`emea
| date       | market | ct    |
| date       | symbol | long  |
|============|========|-------|
| 2026.11.09 | LDN    | 10000 |
| 2026.11.09 | PAR    | 10000 |
```

The same select can go through `.parquet.read`, which takes `read_parquet` options as a dictionary and a parsed
select. The table name in the parsed text is ignored. It returns the same answer:

```q
q).parquet.read[lake;enlist[`hive_partitioning]!enlist 1b;parse "select ct:count sym by date,market from t where date within 2026.11.09 2026.11.13,market=`LDN,region=`emea,sym=`BBB"]
| date       | market | ct   |
| date       |        | long |
|============|========|------|
| 2026.11.09 | "LDN"  | 2000 |
| 2026.11.10 | "LDN"  | 2000 |
| 2026.11.11 | "LDN"  | 2000 |
| 2026.11.12 | "LDN"  | 2000 |
| 2026.11.13 | "LDN"  | 2000 |
```

DuckDB detects hive directories in a glob by itself; `hive_partitioning` makes that explicit. Pass other
`read_parquet` options, such as `union_by_name`, the same way.

## See what DuckDB was sent

`.duckdb.sqllog` records every statement PeachQ sends to DuckDB, how long it took and how many rows came back:

```q
q)select dur,rows from -1#.duckdb.sqllog
| dur                  | rows |
| timespan             | long |
|----------------------|------|
| 0D00:00:00.019722853 | 5    |
q)sent:{s:last exec sql from .duckdb.sqllog; (first s ss "WHERE")_s}
q)-1 sent[];
WHERE _q_raw_date BETWEEN $pq1 AND $pq2 AND _q_raw_market = $pq3 AND _q_raw_region = $pq4 AND _q_raw_sym = $pq5 GROUP BY date, market ORDER BY date NULLS FIRST, market NULLS FIRST
```

`sent` prints the end of the statement. Every where term became SQL, with the q values bound as parameters
(`$pq1` to `$pq5`), and the count and grouping ran in DuckDB. Filters on the partition columns are what let DuckDB
skip files. `.duckdb.lastpush` holds the translation of the last select, or `::` when nothing could move to DuckDB.

### What q finishes

PeachQ moves a part of the query to DuckDB only when DuckDB gives exactly q's answer. Anything else runs in q, on the
rows DuckDB returns. A float comparison is the common case, because q compares floats with a
[tolerance](../basics/precision.md) and DuckDB does not:

```q
q)select n:count i,mx:max bid by date from lake where date within 2026.11.09 2026.11.10,market=`LDN,sym=`BBB,bid>100.99
| date       | n    | mx       |
| date       | long | float    |
|============|------|----------|
| 2026.11.09 | 16   | 100.9989 |
| 2026.11.10 | 14   | 100.9992 |
q)-1 sent[];
WHERE _q_raw_date BETWEEN $pq1 AND $pq2 AND _q_raw_market = $pq3 AND _q_raw_sym = $pq4 AND _q_raw_bid > $pq5 ORDER BY i
```

`bid>100.99` narrows the rows in DuckDB and q applies its own comparison to what comes back, so the statement has
no `GROUP BY`: q counted and grouped. The partition filters still pruned the files. The same pattern applies to:

- **`like` with a `*` in the middle.** `sym like "A*A"` is narrowed in DuckDB by its prefix,
  `starts_with(_q_raw_sym, $pq3)`, and finished in q. A pattern with only a leading or trailing `*` runs in DuckDB.
- **Grouping by an expression.** `by level mod 2` sends the where terms to DuckDB and groups in q. Grouping by a
  column runs in DuckDB.
- **Arithmetic in the select phrase.** `select spread:avg ask-bid by sym` fetches `ask`, `bid` and `sym` for the
  matching rows and computes in q.

A select with no term DuckDB can run reads every row it names. Here `bid within 100 100.001` is run by q, so
nothing was pushed and the whole lake came back to be filtered:

```q
q)select n:count i from lake where bid within 100 100.001
| n    |
| long |
|------|
| 883  |
q).duckdb.lastpush~(::)
1b
```

Put a partition filter in every query on a large lake. PeachQ never refuses a parquet select for its size.

## Ask the same question in SQL

The same question can be written as SQL against the files. Inside a `` ``sql … `` `` literal, `$name` binds the q
variable `name` as a parameter: dates, symbols and numbers keep their types, and nothing is pasted into the SQL
text. Any DuckDB handle can read the files; this one opens `lake.duckdb`, which the next section uses for a view:

```q
q)h:hopen (`:pq:duckdb:lake;"lake.duckdb")
q)d0:2026.11.09; d1:2026.11.13; mkt:`LDN; s:`BBB
q)h ``sql SELECT date, market, count(*) AS ct FROM read_parquet('lake/**/*.parquet') WHERE date BETWEEN $d0 AND $d1 AND market = $mkt AND region = 'emea' AND sym = $s GROUP BY date, market ORDER BY date``
| date       | market | ct   |
| date       |        | long |
|------------|--------|------|
| 2026.11.09 | "LDN"  | 2000 |
| 2026.11.10 | "LDN"  | 2000 |
| 2026.11.11 | "LDN"  | 2000 |
| 2026.11.12 | "LDN"  | 2000 |
| 2026.11.13 | "LDN"  | 2000 |
```

DuckDB's `EXPLAIN ANALYZE` reports how many files a query opened. Its result is one text block; the last line keeps
the lines that mention files:

```q
q)p:h ``sql EXPLAIN ANALYZE SELECT count(*) FROM read_parquet('lake/**/*.parquet') WHERE date BETWEEN $d0 AND $d1 AND market = $mkt AND region = 'emea' AND sym = $s``
q)-1 {trim -3_4_x} each l where (l:"\n" vs first p`explain_value) like "*Files*";
Scanning Files: 5/450
Total Files Read: 5
```

Five files: one symbol in one market and region, for five days. SQL answers in DuckDB's own types, and a SQL answer
can include extra columns that qSQL never shows; the
[reference](../peachq/qsql-foreign-tables.md#gotchas) lists the differences.

## Name the lake once with a view

Rather than repeat the glob, create a DuckDB view in `lake.duckdb` and bind it to a q name. `quotes` is an
external table: the data stays in the parquet files, and qSQL on `quotes` is pushed down exactly as on the glob:

```q
q)h "CREATE OR REPLACE VIEW quotes AS SELECT * FROM read_parquet('lake/**/*.parquet', hive_partitioning=true)"
q)quotes:get `:pq:duckdb:lake:quotes/
q)select ct:count sym by date,market from quotes where date within 2026.11.09 2026.11.13,market=`LDN,region=`emea,sym=`BBB
| date       | market | ct   |
| date       |        | long |
|============|========|------|
| 2026.11.09 | "LDN"  | 2000 |
| 2026.11.10 | "LDN"  | 2000 |
| 2026.11.11 | "LDN"  | 2000 |
| 2026.11.12 | "LDN"  | 2000 |
| 2026.11.13 | "LDN"  | 2000 |
```

The view is saved in `lake.duckdb`. In a later session, `hopen` the file again and `get` the view. The path in the
view is relative, so start q in the same directory, or write an absolute path in `CREATE VIEW`.

## Read parquet from S3

An `s3://` path works wherever a local path does. KX's public demo bucket holds a copy of the NYC Taxi and
Limousine Commission's green taxi trips for February 2024, which DuckDB reads without credentials:

```q
q)taxi:`$":s3://kxs-prd-cxt-twg-roinsightsdemo/green_tripdata_2024-02.parquet"
q)select trips:count i,fare:avg fare_amount by payment_type from taxi where payment_type in 1 2
| payment_type | trips | fare     |
| long         | long  | float    |
|==============|-------|----------|
| 1            | 35404 | 16.6783  |
| 2            | 14757 | 16.81753 |
```

The query took about half a second from our test machine, depending on the network. For a private bucket, create a DuckDB
secret once per session, then query a glob over the bucket exactly as over `lake/` above:

```q
.duckdb.secret[`lake;`s3;`key_id`secret`region!("YOUR_KEY_ID";"YOUR_SECRET";"eu-west-1")]
select ct:count sym by date,market from `$":s3://your-bucket/lake/**/*.parquet" where date within 2026.11.09 2026.11.13,market=`LDN,region=`emea,sym=`BBB
```

[Parquet](../peachq/parquet.md#s3) lists the secret functions and other ways to supply credentials, such as the
AWS credential chain.

## Summary and limitations

You queried a 450-file hive-partitioned lake with an ordinary qSQL select, checked from `.duckdb.sqllog` and
DuckDB's plan that only five files were read, asked the same question in SQL with q variables bound as parameters,
named the lake with a view and read parquet from S3.

Current limitations that affect this kind of lake:

- **Text is strings.** Text columns, including partition columns such as `market`, read as strings. Compare them
  with symbols in the where clause, and cast with `` `$ `` in the select phrase when you need symbols.
- **Some work is finished in q.** Float comparisons, `like` patterns with a `*` in the middle, grouping by an
  expression and arithmetic in the select phrase run in q on the rows DuckDB returns. Keep a partition filter in the
  query so those rows are few.
- **Row order is not promised.** `first`, `last`, `i` and `select[n]` depend on the order rows arrive in. Sort or
  group on a real column when order matters.
- **External tables are not rows.** `quotes` answers qSQL, but `` `sym xkey quotes `` or `t lj quotes` signal
  `'type`. Select the rows you need first, then key or join that result.
- **Columns are read once per session.** If another program rewrites files with new or retyped columns, run
  `.parquet.refresh[]`. New files in a glob appear by themselves.
- **Some DuckDB types are hidden.** Columns q cannot hold, such as `HUGEINT` or `STRUCT`, do not appear in `cols`
  or `select`. `.parquet.inspect[lake;()]` lists every column that does not read exactly.
