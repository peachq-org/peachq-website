---
title: C# API
description: Query PeachQ from C#, subscribe to live updates and stream trades into it with a feed handler, using the CSharpKDB client.
integration_source: https://github.com/KxSystems/csharpkdb/tree/1.7.0
---

<!-- peachq: audience="You are a C# developer on .NET 8 who knows C# well and q only a little. You want to run queries from .NET and consume the results as .NET types, or write a feed handler that pushes rows into PeachQ." goal="Connect to PeachQ from C#, run a query and read it as .NET types, subscribe to updates, and send data with a feed handler, having seen each step working on PeachQ; leave with the q-to-.NET type mapping table." -->

# C# API

<video class="peachq-video" controls preload="none" playsinline src="/video/csharp-api-FHD.mp4" poster="/recordings/csharp-api/intro-frame.png"></video>

Connect C# to PeachQ with [CSharpKDB](https://github.com/KxSystems/csharpkdb),
KX's .NET client for q. One console project with three commands covers the
common jobs: a feed handler streams trades into a PeachQ table, a query reads a
table back into .NET, and a subscriber receives every new batch of trades as it
arrives.

The query below is sent from C# while the feed runs. It returns a live summary
of the trades, printed by C#:

```text
sym           trades        size
A             100           52561
GM            92            46836
GOOG          83            46676
KX            91            43116
4 rows
```

The values change with every run because the feed generates random trades.

## Run it

Use Linux x86-64, Bash, `curl`, `tar` and the
[.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0). CSharpKDB and
the example project target .NET 8, which also runs on Windows and macOS; the
commands on this page were run on Linux. Start in a fresh directory. The
PeachQ server runs in one terminal; the C# commands run in another.

**Terminal 1: download PeachQ and the examples, then start the server:**

```bash
mkdir peachq-csharp-api && cd peachq-csharp-api
mkdir peachq
curl -fL https://peachq.org/download/peachq-linux-x64.tar.gz | tar -xz -C peachq
curl -fL https://peachq.org/docs/interfaces/examples/csharp-api-examples.tar.gz | tar -xz
curl -fLO https://peachq.org/docs/interfaces/examples/csharp-api-server.q
./peachq/q csharp-api-server.q -p 5002
```

**Terminal 2: build once, then stream trades, query them and subscribe:**

```bash
cd peachq-csharp-api/csharp-api-examples
dotnet build
dotnet run --no-build -- feed > feed.log &
dotnet run --no-build -- query '0!select trades:count i,sum size by sym from trade'
dotnet run --no-build -- subscribe
```

`dotnet build` downloads the CSharpKDB package from NuGet and compiles the
project; `--no-build` then runs the compiled program without rebuilding it.
Press **Ctrl+C** to stop the subscriber, run `kill %1` to stop the feed
handler, and press **Ctrl+C** in terminal 1 to stop the server.

The [examples archive](examples/csharp-api-examples.tar.gz) contains one .NET
console project. `Program.cs` dispatches the `feed`, `query` and `subscribe`
commands to `FeedHandler.cs`, `TableQuery.cs` and `Subscriber.cs`, and the
project file references the CSharpKDB package. The
[server script](examples/csharp-api-server.q) creates the `trade` table and
prints each connection and query it receives.

## Connect

CSharpKDB is a single class, `kx.c`. Creating an instance opens a connection:

| Constructor | Notes |
|---|---|
| `c(string host, int port, string userPassword)` | Logs in with `"username:password"`. Throws `KException` with the message `access` if the server refuses the login. |
| `c(string host, int port)` | Logs in with `Environment.UserName`. |

Further overloads add a buffer size, TLS and IP version options and Unix
domain sockets. Each instance is one connection. Send messages with these methods:

| Communication | Method | Description |
|---|---|---|
| Synchronous | `object k(string s)` | Send a q expression, wait and return the result. |
| | `object k(object x)` | Send a q object, such as a list holding a function name and its arguments, and return the result. |
| | `object k(string s, object x, ...)` | Call function `s` with up to three arguments and return the result. |
| | `object k()` | Wait for the next incoming message, without sending anything. |
| Asynchronous | `void ks(string s)` | Send a q expression and do not wait. |
| | `void ks(object x)` | Send a q object and do not wait. |
| | `void ks(string s, object x, ...)` | Call function `s` with up to two arguments and do not wait. |

`ksAsync` and `kAsync()` are `Task`-based variants of `ks` and `k()`, each
taking an optional `CancellationToken`. There is no `Task`-based variant of a
synchronous query; wrap `k(s)` in `Task.Run` if you need one.

A synchronous call blocks until the server replies. If the server signals an
error, `k` throws `KException` with the q error message, for example `type`
for `` 1+`a ``. An asynchronous call returns as soon as the message is sent.
It is faster, but you receive no result and no error. `c` implements
`IDisposable`: a `using` block, or `Close()`, closes the connection.
`SendTimeout` and `ReceiveTimeout` set the socket timeouts in milliseconds;
they are zero (wait forever) by default. A receive that times out throws
`IOException` and closes the connection.

To use CSharpKDB in your own project, add the package from NuGet:

```bash
dotnet add package CSharpKDB --version 1.7.0
```

## Query

`TableQuery` connects, sends one query and casts the result to `c.Flip`,
CSharpKDB's representation of a q table:

```csharp
const string DefaultQuery = "0!select trades:count i,sum size by sym from trade";

object result;
using (var conn = new c(host, port, "username:password"))
{
    result = conn.k(query ?? DefaultQuery);
}
if (result is not c.Flip table)
{
    Console.Error.WriteLine($"not a table: {result?.GetType().Name ?? "null"}; unkey a keyed table with 0!");
    return 1;
}
Print(table, 5);
```

Without an argument it sends the summary query shown at the top of this
page. Any q expression can be passed instead, for example the last five
trades:

```bash
dotnet run --no-build -- query '-5#select from trade'
```

```text
time          sym           price         size          stop          cond          ex
13:19:09.392  GM            72.0080       50            true          B             N
13:19:09.894  KX            27.5328       504           true          S             N
13:19:09.894  GM            14.1284       209           true          S             N
13:19:09.894  GOOG          17.5018       934           false         B             N
13:19:09.894  GM            41.5664       220           true          B             L
5 rows
```

A `c.Flip` holds the column names in `x` (a `string[]`) and one array per
column in `y` (an `object[]`). `c.at(column, row)` reads a single value,
returning `null` for a q null, and `c.n(column)` returns a column's length, as
the example's printer does:

```csharp
int rows = c.n(table.y[0]);
for (int row = 0; row < Math.Min(maxRows, rows); row++)
{
    var cells = table.y.Select(column => Format(c.at(column, row)).PadRight(14));
    Console.WriteLine(string.Concat(cells).TrimEnd());
}
```

`table.at("sym")` returns a column by name. Each q type arrives as the .NET
type below; a q vector arrives as an array of that type, so a time column is a
`TimeSpan[]` and a symbol column a `string[]`. Sending works the other way: a
.NET value or array of one of these types becomes the q type in the same row.
Inside the arrays, nulls are the sentinel values in the notes column.

| q type | .NET type | Notes |
|---|---|---|
| boolean `b` | `bool` | |
| guid `g` | `Guid` | |
| byte `x` | `byte` | |
| short `h` | `short` | `0Nh` is `short.MinValue` |
| int `i` | `int` | `0Ni` is `int.MinValue` |
| long `j` | `long` | `0N` is `long.MinValue` |
| real `e` | `float` | `0Ne` is `float.NaN` |
| float `f` | `double` | `0n` is `double.NaN` |
| char `c` | `char` | A q string is a `char[]`. |
| symbol `s` | `string` | A C# `string` is sent as a symbol. |
| timestamp `p` | `DateTime` | `DateTime` resolves 100 ns, so finer digits are lost. |
| month `m` | `c.Month` | |
| date `d` | `c.Date` | `DateTime()` converts it. |
| datetime `z` | `DateTime` | Sent back from C#, a `DateTime` is a timestamp. |
| timespan `n` | `c.KTimespan` | Holds a `TimeSpan`, so 100 ns resolution. |
| minute `u` | `c.Minute` | |
| second `v` | `c.Second` | |
| time `t` | `TimeSpan` | q time holds milliseconds; finer ticks are dropped when sending. |
| general list | `object[]` | |
| dictionary | `c.Dict` | Keys in `x`, values in `y`. |
| table | `c.Flip` | |
| keyed table | `c.Dict` of two `c.Flip` | `c.td(result)` unkeys it. |
| `::` | `null` | A C# `null` cannot be sent. |
| function | `KException` with the message `func` | |

`c.qn(value)` tests any of these for the q null and `c.NULL('j')` creates one
for the given type character. Nulls, infinities and empty vectors of every
type round-trip between PeachQ and C#, with two exceptions: a datetime comes
back as a timestamp, and the datetime, timestamp and timespan infinities
(`0Wz`, `0Wp`, `0Wn` and their negatives) have no .NET equivalent.

A query grouped with `by`, such as `select trades:count i by sym from trade`,
returns a keyed table. CSharpKDB returns a keyed table as a `c.Dict` of two
tables, so the cast to `c.Flip` fails. Prefix the query with `0!` to unkey it,
as the command in [Run it](#run-it) does, or call `c.td` on the result.

## Subscribe

A subscriber registers with a publisher once, then waits for updates. The
server script contains a tiny publisher: `.u.sub` registers the caller, and
`.u.upd` inserts each batch of trades and forwards it to every subscriber.

```q
trade:([]time:`time$();sym:`symbol$();price:`float$();size:`int$();stop:`boolean$();cond:`char$();ex:`char$())
subs:`int$()
.u.sub:{[t;s] subs,:.z.w; 0#value t}
.u.upd:{[t;x] t insert x; {neg[x] (`upd;y;z)}[;t;x] each subs;}

.z.po:{-1 "open  handle ",string x;}
.z.pc:{subs::subs except x; -1 "close handle ",string x;}
.z.pg:{-1 "query ",$[10h=type x;x;-3!x]; value x}
```

`.z.w` is the handle of the connection that called `.u.sub`, and `neg[x]`
sends a message asynchronously on handle `x`. `Subscriber` subscribes to all
symbols of the `trade` table with one synchronous call. It then calls `k()` in a loop. Each call blocks until the
next update arrives:

```csharp
using var conn = new c(host, port);
conn.k(".u.sub[`trade;`]");
while (true)
{
    var message = (object[])conn.k();
    var table = (string)message[1];
    var rows = (c.Flip)message[2];
    var first = rows.x.Zip(rows.y, (name, column) => $"{name}:{TableQuery.Format(c.at(column, 0))}");
    Console.WriteLine($"{table} update. row 1/{c.n(rows.y[0])} -> {string.Join(" ", first)}");
}
```

Each update is the q list `` (`upd;`trade;table) ``, which arrives as an
`object[]`: the function name, the table name and a `c.Flip` holding the new
rows. With the feed handler running, the subscriber prints the first row of
each batch:

```bash
dotnet run --no-build -- subscribe
```

```text
trade update. row 1/3 -> time:12:25:19.151 sym:A price:81.6429 size:654 stop:true cond:B ex:N
trade update. row 1/3 -> time:12:25:19.657 sym:A price:63.6096 size:440 stop:false cond:S ex:L
trade update. row 1/8 -> time:12:25:20.170 sym:KX price:58.9988 size:846 stop:true cond:S ex:L
```

`row 1/8` means the batch contained eight rows. Press **Ctrl+C** to stop. When
the server closes the connection, `k()` throws `KException` with the message
`read`; the example catches it and exits.

## Send data with a feed handler

A feed handler receives data from an external source, converts it to q objects
and forwards it to q. `FeedDemo` passes a `FeedHandler` to `FakeFeed`, which
generates between one and ten random trades every half second:

```csharp
using var handler = new FeedHandler(host, port);
FakeFeed.Run(handler.TradeEvent);
```

For each batch, `FeedHandler` builds one array per column, wraps them in a
`c.Flip` and sends `.u.upd` asynchronously:

```csharp
var table = new c.Flip(new c.Dict(Columns, new object[] { time, sym, price, size, stop, cond, ex }));
conn.ks(new object[] { ".u.upd", "trade", table });
```

The .NET array types set the q column types:

| .NET array | q column |
|---|---|
| `TimeSpan[]` | time |
| `string[]` | symbol |
| `double[]` | float |
| `int[]` | int |
| `bool[]` | boolean |
| `char[]` | char |

These match the empty `trade` table defined in the server script. The strings
`".u.upd"` and `"trade"` are sent as q symbols, so q calls `.u.upd` with the
table name and the new rows. `.u.upd` is also the name a kdb+ tickerplant
uses for incoming data.

Run the feed handler in the foreground to watch it:

```bash
dotnet run --no-build -- feed
```

```text
Received 7 records from fakefeed. Sent 7 records to q server
Received 5 records from fakefeed. Sent 5 records to q server
Received 6 records from fakefeed. Sent 6 records to q server
```

In terminal 1, `count trade` grows each time you run it. Press **Ctrl+C** to
stop the feed handler.

`ks` suits a feed: the handler does not wait for q to process each batch. It
also means q errors are not reported back. If a batch does not match the
table's columns, the insert fails on the server and the C# program carries on.
Check the table in q while developing a feed handler.

## Watch the server

The server script replaces three q event handlers so that the server prints
what the C# commands do. `.z.po` runs when a connection opens, `.z.pc` when it
closes, and `.z.pg` for each synchronous message, which it prints before
evaluating. Running the commands in [Run it](#run-it), then stopping the
subscriber and the feed handler, prints:

```text
open  handle 5
open  handle 6
query 0!select trades:count i,sum size by sym from trade
close handle 6
open  handle 6
query .u.sub[`trade;`]
close handle 6
close handle 5
```

Handle 5 is the feed handler, which stays connected until it is stopped.
The query and the subscriber each open their own connection.

The feed handler's `.u.upd` messages are asynchronous, so they are not printed.
See [Observe connection and message handlers](../guides/interprocess-communication.md#observe-connection-and-message-handlers)
for all four IPC handlers.

## Summary

You have streamed trades into PeachQ from C#, queried them back as a
`c.Flip`, and received live updates in a C# subscriber.

Points to keep in mind:

- On the server, [`.z.u`](../ref/dotz.md#zu-user-id) is the user name from the
  login string: `username` for `"username:password"`, and `Environment.UserName`
  for the two-argument constructor. With a [`.z.pw`](../ref/dotz.md#zpw-validate-user)
  password check installed, a refused login throws `KException` with the
  message `access`.
- CSharpKDB encodes strings and symbols with `c.e`, which is ASCII by default,
  so characters outside ASCII become `?`. Set `c.e = Encoding.UTF8` before
  connecting to exchange UTF-8 text with PeachQ unchanged.
- PeachQ compresses large replies to clients on other hosts, as kdb+ does, and
  CSharpKDB decompresses them. To compress what you send, set
  `IsZipEnabled = true`; it applies to messages above 2000 bytes on
  connections that are not to `localhost`.

Report problems at [PeachQ issues](https://github.com/peachq-org/peachq/issues).
