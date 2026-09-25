---
title: "Loading a file"
peachq_source: user-docs/loading.md
peachq_revision: 49be5a234a51c44a393cf353c0ff0f3f85c9cc4c
---

# Loading a file

API references: [`.csv`](/docs/api/csv.q.html) · [`.j`](/docs/api/j.q.html).
See these for signatures, supported options, return values and errors.

CSV and JSON readers share a workflow: choose a source, inspect its schema, then
load it with any type or column-name changes. Load the library with `\l pq`.

## Choose a source

A symbol names a file or URL; a string contains the data itself.

| Source | Example |
|---|---|
| File | `` `:trades.csv `` |
| URL | `` `:https://www.timestored.com/data/sample/dowjones.csv `` |
| Text | `"sym,qty\nAAPL,100\n"` |

A list of strings is joined with newlines before parsing. Convert a byte vector
to text with `"c"$` if needed.

For a file, the basic calls are:

```q
\l pq
.csv.read[`:trades.csv;::;::;()!()]
.j.read[`:trades.json;::;::;()!()]
```

The arguments are source, target, types and options. Here, `::` returns the table
and lets the reader infer types; `()!()` supplies no options.

## Inspect and set types

Use `.csv.info` or `.j.info` to inspect the sampled schema before loading:

```q
q)\l pq
q)src:"sym,px,qty\nAAPL,171.4,100\nMSFT,402.3,250\n"
q).csv.info[src;()!()]
sym| s
px | f
qty| j
```

Text normally loads as strings. Request symbols for a column used as a key or
category; a type dictionary overrides only the columns it names:

```q
q).csv.read[src;::;(enlist `sym)!enlist "s";()!()]
| sym    | px    | qty  |
| symbol | float | long |
|--------|-------|------|
| AAPL   | 171.4 | 100  |
| MSFT   | 402.3 | 250  |
```

Types are fixed after sampling. A later value that does not fit stops the load.
Increase `sample_size` to inspect more records, or state the intended types.
The `info` functions inspect a sample; they do not validate the whole source.
`.csv.info` may suggest `"s"` for low-cardinality text, even though `.csv.read`
would otherwise retain strings.

## Rename columns while loading

Use `xcol` to map source names to the names your application uses:

```q
q)opts:(enlist `xcol)!enlist (`sym`px!`ticker`price)
q).csv.read[src;::;(enlist `sym)!enlist "s";opts]
| ticker | price | qty  |
| symbol | float | long |
|--------|-------|------|
| AAPL   | 171.4 | 100  |
| MSFT   | 402.3 | 250  |
```

The type dictionary uses the original column names. Renaming happens before rows
are passed to the target, so this also works when loading an existing table.

## Choose where rows go

Use `::` to return a table, a table name to insert rows, or a callback to process
a batch. The [CSV guide](csv.md#load-into-a-keyed-table) shows named targets and
batch processing. JSON callbacks receive the whole document in one batch.

A named target or callback returns a load summary instead of the data.
A failed load may leave rows already inserted into a target table.

See [Reading CSV](csv.md) for delimited files, [Reading JSON](json.md) for documents
and nested records, and [Bad rows](bad-rows.md) for diagnosing rejected data.
