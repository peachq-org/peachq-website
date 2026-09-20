---
title: "Reading CSV"
peachq_source: user-docs/csv.md
peachq_revision: 49be5a234a51c44a393cf353c0ff0f3f85c9cc4c
---

# Reading CSV

[API reference: `.csv`](/docs/api/csv.q.html) — signatures, options, return values and errors.

Use `.csv.read` for delimited files, URLs or text. This guide shows common loading
patterns; [Loading a file](loading.md) explains sources, schema inference and renaming.

## Read a table

Pass `::` for the target and types to return a table with inferred column types:

```q
q)\l pq
q).csv.read["sym,px,qty\nAAPL,171.4,100\nMSFT,402.3,250\n";::;::;()!()]
| sym    | px    | qty  |
|        | float | long |
|--------|-------|------|
| "AAPL" | 171.4 | 100  |
| "MSFT" | 402.3 | 250  |
```

Here `sym` contains strings. To make it a symbol column, pass
`` (enlist `sym)!enlist "s" `` as the third argument.
Replace the text with `` `:trades.csv `` to read a file.

## Read an export with a preamble

This export has a descriptive first line, then a semicolon-delimited header.
Skip the preamble and state the delimiter and header explicitly:

```q
q)src:"daily export\nsym;px\nAAPL;171.4\nMSFT;402.3\n"
q)opts:`skip`delim`header!(1;";";1b)
q).csv.read[src;::;::;opts]
| sym    | px    |
|        | float |
|--------|-------|
| "AAPL" | 171.4 |
| "MSFT" | 402.3 |
```

The reader can infer common delimiters. State `quote`, `escape` or `comment` when
the file uses a non-default dialect. See the [API reference](/docs/api/csv.q.html#-csv-read)
for the complete option list.

## Load into a keyed table

A named target receives rows directly. For a keyed table, matching keys are updated:

```q
q)quotes:([sym:`symbol$()]px:`float$())
q).csv.read["sym,px\nAAPL,171.4\nMSFT,402.3\n";`quotes;::;()!()];
q).csv.read["sym,px\nAAPL,172.0\n";`quotes;::;()!()];
q)quotes
| sym    | px    |
| symbol | float |
|========|-------|
| AAPL   | 172   |
| MSFT   | 402.3 |
```

The existing table supplies the column types. An unkeyed target inserts rows.
These calls suppress the returned load summary with `;`.

## Process batches

A callback receives each batch, its rejected rows and progress information.
For example, calculate a total for each batch without retaining the whole file:

```q
q)src:"sym,qty\nAAPL,100\nMSFT,250\n"
q).csv.read[src;{[data;rejects;stats] show select total:sum qty from data};::;()!()];
| total |
| long  |
|-------|
| 350   |
```

This small input fits in one batch. Larger inputs can produce several totals;
combine them in the callback if you need a total for the whole file.
`rejects` contains that batch’s rejected rows and `stats` records progress.

For input problems, see [Bad rows](bad-rows.md). For schema overrides and column
renaming, see [Loading a file](loading.md).
