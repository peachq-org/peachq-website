---
title: Getting started with PeachQ
description: Calculate with lists, query tables and a remote CSV, then save and reload Parquet data.
---

# Getting started with PeachQ

<video class="peachq-video" controls preload="none" playsinline src="/video/getting-started-HD.mp4" poster="/recordings/getting-started/intro-frame.png"></video>

Query a CSV directly from its URL, filter its rows, and save the result as a local
Parquet file. Along the way, learn how q works with lists, functions and tables.
Use the player's fullscreen control for a larger view, or
[download the terminal recording](/recordings/getting-started/getting-started.cast).
Curl download waits are shortened.

## Start PeachQ

[Download PeachQ](/download) and choose the package **with DuckDB** to run the
whole example, including Parquet. On Linux x64 with glibc, start in a fresh directory:

```bash
mkdir peachq-demo
cd peachq-demo
curl -fL https://peachq.org/download/peachq-linux-x64-duckdb.tar.gz -o peachq.tar.gz
tar -xzf peachq.tar.gz
./q
```

Keep the bundled libraries beside `q`. Reading the remote sample needs an internet
connection. Enter the examples below in order at the `q)` prompt; the lines
underneath show the output. Do not type the prompts or output.

You can also try the calculations and in-memory tables in [Try Live](/repl).
The Parquet steps below use the native DuckDB package and write into its current
directory. Library namespaces load automatically when needed.

## Calculate with lists

Use `:` to assign a value. Spaces separate list items, and arithmetic applies to
every item without a loop. `sum` and `avg` reduce a list to one result.

<!-- peachq: title="Calculating with lists" -->
```q
q)2+3
5
q)numbers:10 20 30 40
q)numbers+1
11 21 31 41
q)sum numbers
100
q)avg numbers
25f
```

The `f` marks a floating-point value. Functions go inside braces; `x` is the
first argument. This function also works on an entire list:

<!-- peachq: title="Defining a function" -->
```q
q)double:{2*x}
q)double numbers
20 40 60 80
```

## Query a table

Create a table with three columns. Backticks introduce symbols, used here for
stock tickers. Entering the table's name displays its rows and column types.

<!-- peachq: title="Creating a table" -->
```q
q)trades:([]sym:`IBM`MSFT`IBM;price:100 200 110;size:10 5 20)
q)trades
| sym    | price | size |
| symbol | long  | long |
|--------|-------|------|
| IBM    | 100   | 10   |
| MSFT   | 200   | 5    |
| IBM    | 110   | 20   |
```

Select just the ticker and price for trades priced above 100:

<!-- peachq: title="Filtering a table" -->
```q
q)select sym,price from trades where price>100
| sym    | price |
| symbol | long  |
|--------|-------|
| MSFT   | 200   |
| IBM    | 110   |
```

`by sym` groups rows by ticker. Name the results `volume` and `notional`; the
latter sums price multiplied by size for each trade.

<!-- peachq: title="Grouping trades" -->
```q
q)select volume:sum size,notional:sum price*size by sym from trades
| sym    | volume | notional |
| symbol | long   | long     |
|========|--------|----------|
| IBM    | 30     | 3200     |
| MSFT   | 5      | 1000     |
```

## Query a remote CSV

A file symbol starts with a backtick and colon. It can name a URL as well as a
local file. `select from` reads this CSV into a table; `5#prices` takes its first
five rows. PeachQ infers the `Date` column as dates and `Price` as floats.

<!-- peachq: title="Reading a remote CSV" -->
```q
q)prices:select from `:https://peachq.org/repl/files/dowjones.csv
q)5#prices
| Date       | Price |
| date       | float |
|------------|-------|
| 1914.12.01 | 55    |
| 1915.01.01 | 56.55 |
| 1915.02.01 | 56    |
| 1915.03.01 | 58.3  |
| 1915.04.01 | 66.45 |
q)count prices
649
```

This [historical Dow Jones sample](/repl/files/dowjones.csv), supplied by
TimeStored, covers December 1914 to December 1968. It is not current market data.
Now calculate the range and average over all 649 rows:

<!-- peachq: title="Summarising remote data" -->
```q
q)select low:min Price,high:max Price,average:avg Price from prices
| low   | high   | average  |
| float | float  | float    |
|-------|--------|----------|
| 46.85 | 985.93 | 290.8073 |
```

## Save and reload Parquet

Keep the 12 rows from 1968. The `.parquet` suffix tells `set` which format to
write. This creates `selected.parquet` in the directory where you started q.

<!-- peachq: title="Saving filtered data as Parquet" -->
```q
q)filtered:select from prices where Date>=1968.01.01
q)count filtered
12
q)`:selected.parquet set filtered
`:selected.parquet
```

Read the local file using the same `select from` syntax, then compare the loaded
table with the original selection. `~` checks whether the values match;
`1b` means true.

<!-- peachq: title="Reading Parquet" -->
```q
q)loaded:select from `:selected.parquet
q)5#loaded
| Date       | Price  |
| date       | float  |
|------------|--------|
| 1968.01.01 | 884.77 |
| 1968.02.01 | 847.2  |
| 1968.03.01 | 834.76 |
| 1968.04.01 | 893.37 |
| 1968.05.01 | 905.22 |
q)loaded~filtered
1b
```

The date and floating-point column types survive the round trip. You can query
`selected.parquet` again in a new PeachQ session without downloading the CSV.
Enter `exit 0` to return to your shell.

## Next

Explore [qSQL](../basics/qsql.md), [CSV type selection](csv.md),
[Parquet options](parquet.md) or [loading data](loading.md).
Bringing an existing application? Read [compatibility and migration](compatibility.md).
