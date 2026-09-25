---
title: Recent changes in the reviewed source
description: Highlights from the PeachQ 0.84 and 0.83 changelog.
---

# Recent changes in the reviewed source

These highlights come from the C project's changelog at the [recorded revision](sync.md).
They describe that source snapshot; use [Downloads](/download) for currently published packages.

## 0.84 — 17 September 2026

- Library-loading fixes cover constructs used by TorQ, kdb-common, qutil/reQ, funq,
  qtips and qspec. This is progress on their load-time requirements, not a promise
  that every workload in those libraries is supported.
- Namespace handling follows a lambda's scope when it loads a file, and trapped
  failures restore the current namespace.
- Script loading echoes unterminated top-level statement values. A startup-script
  failure on a terminal enters the debug prompt, with source locations in frames.
- Further corrections cover temporal arithmetic, float-family attributes, lookup,
  iteration and qSQL. Consult the compatibility dashboard for measured coverage.

## 0.83 — 16 September 2026

- The DuckDB distribution bundles DuckDB and its transport extensions beside PeachQ.
- Parquet reading and writing share the resource model, including q schema metadata
  for supported round trips. See [Parquet](parquet.md).
- Recognised file endings select formats for both reading and writing. This deliberately
  differs from q's binary `set` behaviour. See [compatibility](compatibility.md).
- Remote resources such as S3 use DuckDB transport, with the appropriate reader decoding
  their contents. See [handles and resources](handles.md) for prerequisites and limits.

## Before upgrading an application

Review [compatibility](compatibility.md), confirm required [launch options](../basics/cmdline.md#peachq-specific-options),
and test your own workload. The [coverage dashboard](/compatibility) reports corpus results;
its percentage is not a guarantee about an arbitrary application.
