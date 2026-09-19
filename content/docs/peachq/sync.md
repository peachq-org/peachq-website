---
title: Documentation source and sync notes
description: Source revision, provenance and open questions for the first PeachQ docs draft.
---

# Documentation source and sync notes

This first draft was synced on **19 September 2026** from the C project's `user-docs/`.

| Field | Value |
|---|---|
| Source version file | **0.84** |
| Reviewed source commit | `49be5a234a51c44a393cf353c0ff0f3f85c9cc4c` |
| Imported user guides | 13 |
| Additional review | Changelog, native REPL startup and terminal editing code |
| Machine-readable record | [sync.json](sync.json) |

The commit identifies the reviewed C-project snapshot. It does not claim that every
example was executed, or that every described feature has shipped in a release.
The original KX reference has its own [provenance record](../../thanks.md#kx-documentation).

## What was adapted

The imported user guides retain their source text with a snapshot notice. Internal
“Notes for dev” at the end of the command-line guide are omitted. Book links in the
system-command guide point to the original hosted book, and an FFI heading link is corrected.
The compatibility guide leads with additions, then separates behaviour changes from unsupported
features. It omits the unchanged CSV operator, links the REPL guide and labels typed parameters as a design preview.
Resource and Parquet summaries are qualified by their supported operations and types.
The website labels the PeachQ DuckDB integration experimental and states its native-runtime
requirements on the handles and Parquet guides; this does not label DuckDB itself experimental.
The sync record contains
source and rendered hashes and lists these adaptations for each page.

Getting started, this section's index, the REPL guide and recent-change highlights
are website-authored. The REPL guide draws on issue #62; contributor credit is recorded
on the [Thanks page](../../thanks.md).

## Open questions and status

- The typed-parameter guide describes staged work, including features marked not yet shipped.
  Its status table takes precedence over the compatibility index's short description.
- Some individual resource operations are explicitly planned. Read their local status notes
  rather than treating a whole guide as a released-feature promise.
- The imported guides have not had a complete executable documentation test run.
  The C project owns that checker and its results. The website's marked arithmetic
  example has passed the C project's existing `qdoctest`; unverified examples remain unmarked.
- The inherited q reference remains unchanged. Some of its links target unimported sections.

## Updating this snapshot

The C project owns behavioural documentation. Website changes should carry source corrections
back there rather than accumulating an independent description of the same behaviour.
The website's contributing guide describes the review-and-sync procedure. No executable
code-block checker is implemented here.
