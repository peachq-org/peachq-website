---
title: Interfaces
description: Connect to PeachQ from other programming languages, or call other languages from q.
---

<!-- peachq: audience="You program in a language other than q and want to send queries or data to PeachQ, or call that language from q." goal="Find the client library or embedding for your language and the article that shows it working on PeachQ." -->

# Interfaces

Each article shows one client library or embedding working against PeachQ, with
a recording, a complete run sequence and the caveats found while testing it.

## Connect to PeachQ over IPC

| Language | Library | Version tested | Article |
|---|---|---|---|
| Python | [Kola](https://github.com/jshinonome/kola), [qPython](https://github.com/exxeleron/qpython) | Kola 2.6.1, qPython 2.0.0 | [Query PeachQ from Python](python-api.md) |
| Java | [javakdb](https://github.com/KxSystems/javakdb) | 2.2 | [Java API](java-api.md) |
| C# | [CSharpKDB](https://github.com/KxSystems/csharpkdb) | 1.7.0 | [C# API](csharp-api.md) |
| Node.js | [jkdb](https://github.com/jshinonome/jkdb), [node-q](https://github.com/michaelwittig/node-q) | jkdb 1.4.0, node-q 2.7.0 | [Node.js API](nodejs-api.md) |
| Go | [kdbgo](https://github.com/sv/kdbgo) | 0.20.0 | [Go API](go-api.md) |
| Rust | [kdbplus](https://github.com/diamondrod/kdbplus) | 0.3.8 | [Rust API](rust-api.md) |

## Call other languages from q

| Language | Library | Version tested | Article |
|---|---|---|---|
| Python | [embedPy](https://github.com/KxSystems/embedPy) | 1.5.0 | [Python from q with embedPy](embedpy.md) |
| R | [embedR](https://github.com/KxSystems/embedr) | 1.5.1 | [R from q with embedR](embedr.md) |
| C | `2:` with [`k.h`](https://github.com/KxSystems/kdb) | `k.h` from the master branch | [C extensions with 2:](c-extensions.md) |

For the q side of a connection, see
[IPC: Interprocess Communication](../guides/interprocess-communication.md).
