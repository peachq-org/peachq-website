---
title: PeachQ Roadmap
description: Where PeachQ is going and how to read the version number.
---

# The version number is the score.

Until 1.0, PeachQ's version is its q-conformance pass rate.
<code id="roadmapVersionExample">0.41</code> means
<span id="roadmapScoreExample">41%</span> of the conformance suite passes today.
The suite grows as PeachQ covers more of q, so the number tracks tested
behaviour, not a marketing target.

## Watch it climb.

Every new q behaviour needs tests. As more of the corpus turns green, the version
number moves with it. New tests can raise the bar, so progress is measured
against the current public suite.

## Useful, but early.

PeachQ is already useful for experiments, coding challenges and exploring a free
q-like environment. It also has strong performance foundations through Rayforce.
It is not yet a drop-in q replacement: important areas such as char and string
semantics, on-disk storage, and parts of the long-term architecture are still
undecided or unimplemented.

We are looking for people who want to discuss those choices, try real workloads,
and help shape the roadmap. If that sounds useful, please
[get in touch](https://peachq.org/contact).

## 1.0 - q compatibility

**The goal: pass every test we have.** 1.0 lands when PeachQ runs the full
conformance corpus green: language, datatypes, qSQL, tables, joins, and IPC.

- **qSQL depth** - `select`, `exec`, `update`, `delete`, grouping, functional queries
- **Joins** - the `lj`, `ij`, `uj`, `aj` family on keyed tables
- **Core model** - strings, keyed tables, and temporal types
- **IPC** - the kdb wire protocol, client and server
- **Developer experience** - in-REPL help, docs, and clearer table display

## After 1.0 - real workloads

With the language solid, PeachQ will be tested with partners against real
platforms and their own suites: the behaviours that matter in production, not
only the reference docs.

## 2.0 - DuckDB storage, solid

PeachQ aims to pair the in-memory q engine with DuckDB as its storage layer:
durable storage, SQL, Parquet, and access to a fast-growing data ecosystem.

Pieces may land earlier, but 2.0 is when the DuckDB story should be
production-solid: q tables backed by DuckDB, query pushdown, and drivers that
speak the kdb wire.

## Next areas of work

- **Cross-platform IPC** - client and server support on Linux, macOS and Windows using the kdb wire protocol
- **Broader qSQL and joins** - more query forms, grouped updates and the full join family
- **DuckDB-backed storage** - durable q tables, SQL access, Parquet workflows and query pushdown
- **More q, release by release** - keep raising the conformance score until PeachQ reaches 1.0

## Clear boundaries

Not a target:

- **kdb+ on-disk binary compatibility** - PeachQ stores durable data through DuckDB rather than chasing a proprietary file format
- **The `k)` language beneath q** - PeachQ targets q, not the underlying k dialect and escape hatch
- **Undocumented internals** - the aim is published q behaviour, not bug-for-bug parity with private quirks

---

PeachQ is built in public. The compatibility page tracks the score, suite by
suite, from the current build.

[View compatibility](https://peachq.org/compatibility) &middot;
[Try Live](https://peachq.org/repl)
