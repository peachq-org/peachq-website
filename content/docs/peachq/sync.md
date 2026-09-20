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
| Imported user guides retained | 11 |
| Additional review | Changelog, native REPL startup and terminal editing code |
| Machine-readable record | [sync.json](sync.json) |

The commit identifies the reviewed C-project snapshot. It does not claim that every
example was executed, or that every described feature has shipped in a release.
The original KX reference has its own [provenance record](../../thanks.md#kx-documentation).

## What was adapted

Imported user guides record their source in front matter without a snapshot banner.
The separate command-line and system-command guides have been removed from the website
and import list. PeachQ help and display commands are documented at the top of the
[system-command reference](../basics/syscmds.md#peachq-specific-commands), based on
`user-docs/syscmds.md` for version 0.84. The older compatibility-status table is not carried over.
A marked PeachQ-specific section in the [command-line reference](../basics/cmdline.md#peachq-specific-options)
lists the additions checked against the local 0.84 binary’s `-h` output. The existing command-line and system-command reference text is unchanged. An FFI heading link is corrected.
The compatibility guide leads with additions, then separates behaviour changes from unsupported
features. It omits the unchanged CSV operator, links the REPL guide and labels typed parameters as a design preview.
Loading, CSV and JSON are concise example guides linking to the generated API reference
for exact specifications. Their transcripts were checked with the local 0.84 binary.
The regular-expression guide links to its API reference and has a shortened DuckDB comparison.
Resource and Parquet summaries are qualified by their supported operations and types.
The website labels the PeachQ DuckDB integration experimental and states its native-runtime
requirements on the handles and Parquet guides; this does not label DuckDB itself experimental.
The sync record retains source and website hashes from the last import, with its
per-page adaptations. Subsequent website edits are described here and recorded in
Git; their differing hashes prevent the importer from silently overwriting them.

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
