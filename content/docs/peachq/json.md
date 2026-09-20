---
title: "Reading JSON"
peachq_source: user-docs/json.md
peachq_revision: 49be5a234a51c44a393cf353c0ff0f3f85c9cc4c
---

# Reading JSON

[API reference: `.j`](/docs/api/j.q.html) — signatures, options, return values and errors.

Use `.j.read` to load JSON records as a table and `.j.info` to inspect their
sampled schema. [Loading a file](loading.md) covers sources, types and targets.
For general JSON serialization and parsing, use [`.j.j` and `.j.k`](../ref/dotj.md).

## Read records

An array of objects gives one row per object. Numeric forms are retained:
`100` loads as a long, while `100.0` loads as a float.

```q
q)\l pq
q).j.read["[{\"sym\":\"AAPL\",\"qty\":100},{\"sym\":\"MSFT\",\"qty\":250}]";::;::;()!()]
| sym    | qty  |
|        | long |
|--------|------|
| "AAPL" | 100  |
| "MSFT" | 250  |
```

Replace the text with `` `:trades.json `` to read a file. An individual object
gives a one-row table; other root shapes are described in the API reference.

## Read JSON Lines

The default format detects a single document or JSON Lines. State the format
when the input is required to contain one record per line:

```q
q)src:"{\"sym\":\"AAPL\",\"qty\":100}\n{\"sym\":\"MSFT\",\"qty\":250}\n"
q).j.read[src;::;::;(enlist `format)!enlist `newline_delimited]
| sym    | qty  |
|        | long |
|--------|------|
| "AAPL" | 100  |
| "MSFT" | 250  |
```

## Select records inside an envelope

An API response often wraps its records in a field such as `results`. Select
that field with `path`, then apply types to the selected records:

```q
q)src:"{\"status\":\"OK\",\"results\":[{\"sym\":\"AAPL\",\"px\":171.4}]}"
q).j.read[src;::;(enlist `sym)!enlist "s";(enlist `path)!enlist `results]
| sym    | px    |
| symbol | float |
|--------|-------|
| AAPL   | 171.4 |
```

Use a symbol list such as `` `data`items `` to descend through several fields.
A path can also contain numeric array indices; see the
[API reference](/docs/api/j.q.html#-j-read) for accepted forms.

## Missing fields

Records match by field name. A missing field receives its column’s null:

```q
q).j.read["[{\"a\":1},{\"b\":2}]";::;::;()!()]
| a    | b    |
| long | long |
|------|------|
| 1    |      |
|      | 2    |
```

The column set and types come from the sample. A new field appearing after that
sample can fail the load; increase `sample_size` when the early records are
not representative. See [Bad rows](bad-rows.md).

## Work with nested records

Nested objects retain their structure. Extract a nested table using normal q
column selection:

```q
q)src:"[{\"id\":1,\"quote\":{\"px\":171.4,\"qty\":100}},{\"id\":2,\"quote\":{\"px\":402.3,\"qty\":250}}]"
q)t:.j.read[src;::;::;()!()]
q)t`quote
| px    | qty  |
| float | long |
|-------|------|
| 171.4 | 100  |
| 402.3 | 250  |
```

Use `path` when the desired table is inside a document envelope; use q indexing
when working with nested values after loading.
