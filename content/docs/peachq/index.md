---
title: Using PeachQ
description: Work with the console, load data and use PeachQ libraries.
---

# Using PeachQ

Use the console, load data and connect PeachQ to other systems. Start with the
guides below, or look up syntax and functions in the [q language reference](../reference.md).

## Working with PeachQ

| Guide | Covers |
|---|---|
| [Getting started](getting-started.md) | First expressions, tables and the standard library |
| [REPL and console](repl.md) | Terminal editing, richer tables and the browser editor |
| [Command line](../basics/cmdline.md#peachq-specific-options) | Standard launch flags and PeachQ-specific options |
| [System commands](../basics/syscmds.md#peachq-specific-commands) | Commands within a running session |
| [Compatibility and migration](compatibility.md) | Deliberate differences, unsupported features and additions |

## Data and integrations

| Guide | Covers |
|---|---|
| [Loading data](loading.md) | Shared reader rules, inference and schemas |
| [CSV](csv.md) / [JSON](json.md) | Readers, options and streaming targets |
| [Bad rows](bad-rows.md) | Error handling and tolerances |
| [Handles and resources](handles.md) | Files, URLs, providers and format inference |
| [Parquet](parquet.md) | Reading and writing through the experimental PeachQ DuckDB integration |
| [Library API](/docs/api/) | Function reference generated from the PeachQ library source |
| [Regular expressions](regexp.md) | RE2 matching, extraction and replacement |
| [Foreign functions](ffi.md) | Calling native shared libraries |
| [C extensions (`2:`)](c-extensions.md) | Loading extensions built with the `k.h` interface |

## Design preview

[Typed parameters](typed-parameters.md) describes staged work. Its source marks type
checks as in review, and defaults, varargs and named apply as not yet shipped. Do not
assume that a documented design is available in your downloaded runtime.
