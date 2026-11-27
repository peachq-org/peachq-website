---
date: 2026-10-08
categories:
  - News
authors:
  - ryan
title: Five more languages talk to PeachQ
slug: five-more-languages-on-peachq
description: C#, Node.js, Go and Rust clients and R via embedR now have working, recorded articles on PeachQ, in a new Interfaces section.
---

# Five more languages talk to PeachQ

A q database is only as useful as the languages that can reach it. This week
we took the client libraries people already use with kdb+, pointed each at
PeachQ, recorded what happened, and wrote it up. Five more languages now have
a complete, recorded article: C#, Node.js, Go, Rust, and R through embedR.

<!-- more -->

Every article follows the same pattern. Download PeachQ, download the
examples, run three programs: a feed handler that streams trades in, a query
that reads them back, and a subscriber that receives each new batch. The
server logs every connection and query so you can see both sides. Each page
has a video of the whole thing running, the complete setup commands, and a
dated list of what does not work yet.

## Clients

<div class="grid cards" markdown>

-   [![C# query and subscriber output beside the PeachQ server log](/img/news/csharp.png)](/docs/interfaces/csharp-api/)

    **C#** with [CSharpKDB](https://github.com/KxSystems/csharpkdb) 1.7.0,
    KX's .NET client, on .NET 8. Feed, query and subscribe from one console
    project. [Article](/docs/interfaces/csharp-api/)

-   [![A browser page with live price charts and a trade tape fed from PeachQ through Node.js](/img/news/nodejs.jpg)](/docs/interfaces/nodejs-api/)

    **Node.js** with [jkdb](https://github.com/jshinonome/jkdb) 1.4.0 by Jo
    Shinonome. A Node relay subscribes to trades and pushes them to a browser
    page with live charts. [Article](/docs/interfaces/nodejs-api/)

-   [![The Go API recording's title card](/img/news/go.png)](/docs/interfaces/go-api/)

    **Go** with [kdbgo](https://github.com/sv/kdbgo) 0.20.0. Query live
    trades, subscribe to updates and send a table, against a server that
    ticks on its own timer. [Article](/docs/interfaces/go-api/)

-   [![Rust feed, query and subscriber beside the PeachQ server log](/img/news/rust.png)](/docs/interfaces/rust-api/)

    **Rust** with [kdbplus](https://github.com/diamondrod/kdbplus) 0.3.8 on
    Tokio. A typed feed handler, a query and an async subscriber.
    [Article](/docs/interfaces/rust-api/)

</div>

## R from q

<div class="grid cards" markdown>

-   [![An R chart of trade prices per symbol with fitted lines, drawn from q data](/img/news/embedr.png)](/docs/interfaces/embedr/)

    **embedR** 1.5.1, built from KX's source, starts R inside the q process.
    Send a q table to R, fit a model, call R functions with q arguments and
    draw a chart. embedR's own test script passes 285 of its 286 checks on
    PeachQ; the one failure depends on the installed R version.
    [Article](/docs/interfaces/embedr/)

</div>

## Tested, not just demonstrated

Each library's own test suite was run against PeachQ where one exists, along
with a round trip of every q type through each client. node-q's 158
integration tests, kdbgo's suite, jkdb's and kdbplus's 179 tests all ran. The
results are in each article's limitations section, with the date and PeachQ
version, so you know what to expect before you start. The gaps found have gone
to the PeachQ developers; the ones that matter most are TLS, which the current
release does not serve, and abstract Unix domain sockets, which it does not
open.

## A new home: Interfaces

All language clients and embeddings now live in one
[Interfaces section](/docs/interfaces/), including the earlier Python, Java,
embedPy and C extension articles. The index lists every library with the
version tested and a link to its repository. Old cookbook links redirect.

## Thanks

These articles stand on other people's work: Jo Shinonome for jkdb and Kola,
diamondrod for kdbplus, sv for kdbgo, Michael Wittig for node-q, and KX for
CSharpKDB, javakdb, embedPy and embedR, all published under open licences.

Alexander Unterrainer of DefconQ has also published a
[Getting Started with PeachQ](https://www.defconq.tech/docs/peachq/intro)
video tutorial, now linked from our own
[Getting started](/docs/peachq/getting-started/) page.

## What should run next?

Tell us which library or framework you want to see on PeachQ in the
[issue tracker](https://github.com/peachq-org/peachq/issues).

[Download](/download) · [Try live](/repl) · [Interfaces](/docs/interfaces/)
