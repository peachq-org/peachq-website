---
title: PeachQ documentation
description: Learn q, use PeachQ and find the language reference.
---

# PeachQ documentation

PeachQ is an open-source implementation of q. Start with a few expressions in the
[browser REPL](/repl), explore the language reference, or find the features PeachQ adds.

## Start here

| What you want to do | Where to go |
|---|---|
| Run your first expressions and query a table | [Getting started](peachq/getting-started.md) |
| Use the terminal or browser editor | [REPL and console](peachq/repl.md) |
| Look up q syntax, operators and functions | [q language reference](ref/index.md) |
| Read files, use regular expressions, or call native code | [Using PeachQ](peachq/index.md) |
| Bring existing q code to PeachQ | [Compatibility and migration](peachq/compatibility.md) |
| Run an existing q framework | [TorQ on PeachQ](cookbook/torq.md) |
| Call Python from q | [Python with embedPy](cookbook/embedpy.md) |
| Load or write a C extension | [C extensions (`2:`)](peachq/c-extensions.md) |
| See measured implementation coverage | [Compatibility dashboard](/compatibility) |

## Coming from q?

Most familiar q concepts carry over. Begin with the [differences](peachq/compatibility.md),
particularly file-format inference, storage support and launch options. The inherited
q reference describes q; it is not a guarantee that every feature is implemented in PeachQ.
The dedicated PeachQ section explains additions, intentional differences and known limits.
