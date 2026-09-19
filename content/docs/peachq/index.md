---
title: PeachQ additions and differences
description: PeachQ-specific guides, extensions and migration notes.
---

# PeachQ additions and differences

This section collects PeachQ-specific documentation. It is separate from the
[inherited q reference](../reference.md), so additions and differences are easy to find.

## Working with PeachQ

| Guide | Covers |
|---|---|
| [Getting started](getting-started.md) | First expressions, tables and the standard library |
| [REPL and table display](repl.md) | Terminal editing, richer tables and the browser editor |
| [Command line](cmdline.md) | Launch flags and their compatibility status |
| [System commands](syscmds.md) | Commands within a running session |
| [Compatibility and migration](compatibility.md) | Deliberate differences, unsupported features and additions |
| [Recent changes](recent-changes.md) | Changes highlighted in the reviewed changelog |

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
| [Writing resource providers](resource-handle-implementer.md) | The provider contract for implementers |

## Design preview

[Typed parameters](typed-parameters.md) describes staged work. Its source marks type
checks as in review, and defaults, varargs and named apply as not yet shipped. Do not
assume that a documented design is available in your downloaded runtime.

See [source and sync notes](sync.md) for the version behind this draft.
