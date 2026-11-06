---
date: 2026-09-29
categories:
  - News
authors:
  - ryan
title: TorQ loads on PeachQ 0.88
slug: torq-loads-on-peachq-0-88
description: TorQ, Kola, embedPy, javakdb, C extensions and qYaml on PeachQ, plus new guides and everything since 0.77.
---

# TorQ loads on PeachQ 0.88

The best test of q compatibility is other people's code: frameworks, client
libraries and extensions written for kdb+. Since 0.77, a lot of that code now
loads on PeachQ.

<!-- more -->

## TorQ by Data Intellect

[![TorQ's Finance Starter Pack on PeachQ](/img/news/torq.png)](/docs/cookbook/torq/)

Data Intellect's [TorQ](https://github.com/DataIntellectTech/TorQ) is an
open-source framework for building kdb+ applications. Its Finance Starter Pack
now installs with its own scripts and loads on PeachQ, with a one-line change
to its monitor page. Wooi Kent Lee asked for this in
[issue #56](https://github.com/peachq-org/peachq/issues/56); the
[TorQ recipe](/docs/cookbook/torq/) walks through the live trade path.

## Built by the community, running on PeachQ

<div class="grid cards" markdown>

-   [![Kola querying PeachQ from Python](/img/news/kola.png)](/docs/interfaces/python-api/)

    **Python with Kola**, by [Jo Shinonome](https://github.com/jshinonome/kola).
    Upload a Polars DataFrame, aggregate it in PeachQ and bring the result back.
    [Recipe](/docs/interfaces/python-api/)

-   [![Syntax highlighting in the PeachQ REPL](/img/news/repl-highlighting.png)](https://github.com/peachq-org/peachq/issues/64)

    **Syntax highlighting**, from [Maurice Lim](https://github.com/mau-mauricelim).
    His [highlighting pull request](https://github.com/peachq-org/peachq/issues/64)
    was the basis of the REPL colouring PeachQ ships today, and his 19 issues
    pointed us at real gaps. Thank you, Maurice.

</div>

- **YAML with qYaml**, by [Andrew Steele](https://github.com/drewsteele/qYaml),
  is now part of PeachQ's standard library as `.yml.load` and `.yml.dump`.

## The wider q ecosystem

embedPy and javakdb are open-source projects published by KX, and C
extensions build against KX's `k.h`. All three work with PeachQ through the
same C API and IPC protocol they use with kdb+.

<div class="grid cards" markdown>

-   [![embedPy running NumPy and pandas from q](/img/news/embedpy.png)](/docs/interfaces/embedpy/)

    **embedPy**: NumPy, pandas, SciPy and matplotlib from a q session. It passes
    its own test suite on PeachQ. [Recipe](/docs/interfaces/embedpy/)

-   [![A Java feed handler streaming trades into PeachQ](/img/news/javakdb.png)](/docs/interfaces/java-api/)

    **javakdb**: query from Java, subscribe to updates and stream trades in
    with a feed handler. [Recipe](/docs/interfaces/java-api/)

-   [![A C extension loaded with 2:](/img/news/c-extensions.png)](/docs/interfaces/c-extensions/)

    **C extensions with `2:`**: build against `k.h`, load with `2:`, pass a
    vector and call back into q. [Recipe](/docs/interfaces/c-extensions/)

</div>

## New guides for q beginners

Each guide comes with a recording you can follow along with.

- [Data types](/docs/guides/data-types/): atoms, lists and the type numbers behind them.
- [Casting and parsing](/docs/guides/casting-parsing/): converting between types and reading text.
- [IPC](/docs/guides/interprocess-communication/): connecting processes, sync and async calls, and credentials.

## Also new since 0.77

q conformance has risen from **77.3% to 88.0%** across 0.78 to 0.88.

- **Parquet, DuckDB and S3**: `-duckdb` downloads bundle DuckDB, so
  `` select from `:trades.parquet `` works locally, over HTTPS and from S3.
- **kdb splayed data**: `get` and `\l` read splayed tables and database roots, mapping columns on demand.
- **Enumerations** are real `20h` values, including in splayed data.
- **Readers**: streaming `.csv.read`, a JSON reader, and `read0`/`read1` over HTTP.
- **Linux arm64** downloads, and a glibc x86-64 build that loads C extensions.
- **The browser REPL** runs in a Web Worker and can call DuckDB.
- **Markdown and YAML** libraries, and standard library namespaces load on first use.
- **Comparisons** run up to 200x faster per element.
- **Breaking in 0.88**: `:pq:` handles are spelled `:pq:<kind>:<alias>` and
  opened by `.pq.hopen_<kind>`; new `qfork` and `qspawn` kinds open q workers.

## What should run next?

TorQ is on this list because someone asked. Tell us which framework, library
or client you want to see running on PeachQ in the
[issue tracker](https://github.com/peachq-org/peachq/issues).

[Download](/download) · [Try live](/repl) · [Release notes](https://github.com/peachq-org/peachq/releases/tag/v0.88)
