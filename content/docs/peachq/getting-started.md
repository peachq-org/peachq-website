---
title: Getting started with PeachQ
description: Run a few q expressions, query a table and find your next guide.
---

# Getting started with PeachQ

Open [Try Live](/repl) to use PeachQ in your browser, or [download PeachQ](/download)
and start the `q` executable in a terminal. The terminal shows a `q)` prompt; type
expressions after it. Do not include the prompt when copying code.

## Evaluate an expression

<!-- peachq: runnable -->
```q
q)sum 2 3 4
9
```

The result is `9`. Spaces separate the items of a list. Many q operations work on
whole lists, so you can express a calculation without a loop.

## Create and query a table

This example includes its own setup and can be pasted into a fresh session.

<!-- peachq: title="Querying a table" -->
```q
trades:([]sym:`IBM`MSFT`IBM;price:100 200 110;size:10 5 20)
select sum size by sym from trades
```

The result has one row per symbol: IBM has total size 30, and MSFT has total size 5.
See [qSQL](../basics/qsql.md) for the language and [table display](repl.md#reading-tables)
for how PeachQ presents it.

## Load the bundled standard library

In a native PeachQ session, enter `\l pq` to load the bundled library. Feature guides
state their prerequisites; DuckDB and FFI also depend on native libraries. Browser
builds have different capabilities, so use the native executable for those guides.

Start with [loading data](loading.md), then [CSV](csv.md), [JSON](json.md) or
[Parquet](parquet.md). The DuckDB distribution bundles dependencies for the DuckDB path;
check the [download page](/download) for platform packages. PeachQ’s DuckDB integration
is experimental; review the feature-specific limitations before adopting it.

## Bring existing q code

Read [compatibility and migration](compatibility.md) before moving an application.
In particular, recognised file suffixes change `get` and `set` behaviour, and storage
support differs. Use the [command-line guide](../basics/cmdline.md#peachq-specific-options) when choosing launch flags.
