---
title: Go API
description: Query PeachQ from Go, subscribe to live updates and send a table into it, using the kdbgo client.
integration_source: https://github.com/sv/kdbgo/tree/v0.20.0
---

<!-- peachq: audience="You are a Go developer who writes idiomatic Go and knows modules and goroutines, but knows little q. You want to query PeachQ from Go, send a table into it, or subscribe to live updates." goal="Connect to PeachQ from Go, run a query and read the result as Go types, subscribe to updates and send a table, having seen each step working on PeachQ; leave with the q-to-Go type table for your own work." -->

# Go API

<video class="peachq-video" controls preload="none" playsinline src="/video/go-api-FHD.mp4" poster="/recordings/go-api/intro-frame.png"></video>

Connect Go to PeachQ with [kdbgo](https://github.com/sv/kdbgo), a pure Go
client for the q IPC protocol. One Go module with three small programs runs a
query, subscribes to live trades and sends a table, against a PeachQ server
whose timer generates trades every half second.

The query program asks the server for a live summary of its trades and prints
the result from Go slices:

```text
sym      trades     size
A            30    15077
GM           18     9391
GOOG         17     9306
KX           34    18213
```

The counts change with every run because the timer keeps adding trades. The
[kdbgo API reference](https://pkg.go.dev/github.com/sv/kdbgo@v0.20.0) lists
every function and type used below.

## Run it

Use Linux x86-64, Bash, `curl`, `tar`, `unzip` and [Go](https://go.dev/dl/)
1.22 or later. kdbgo is pure Go, so the same module also builds on Windows and
macOS with the matching PeachQ download; the commands on this page are for
Linux. Start in a fresh directory. The PeachQ server runs in one terminal; the
Go programs run in another.

**Terminal 1: download PeachQ and the examples, then start the server:**

```bash
mkdir peachq-go-api && cd peachq-go-api
mkdir peachq
curl -fL https://peachq.org/download/peachq-linux-x64.tar.gz | tar -xz -C peachq
curl -fLO https://peachq.org/docs/interfaces/examples/go-api-examples.zip
unzip go-api-examples.zip
cd go-api-examples
../peachq/q go-api-server.q -p 5004
```

**Terminal 2: query, subscribe and send:**

```bash
cd peachq-go-api/go-api-examples
go run ./cmd/query
go run ./cmd/subscribe
go run ./cmd/send
```

The first `go run` downloads kdbgo and its one dependency from the Go module
proxy, checked against the archive's `go.sum`. Press **Ctrl+C** to stop the
subscriber, and type `exit 0` in terminal 1 to stop the server.

The [examples archive](examples/go-api-examples.zip) holds one Go module,
`go-api-examples`. Each program under `cmd/` is a `main` package with the
server address `localhost:5004` written into it. `go-api-server.q` creates the
`trade` and `quote` tables, adds random trades on a timer and prints each
connection and query it receives.

## Connect

kdbgo's package name is `kdb`. Add it to your own module with:

```bash
go get github.com/sv/kdbgo@v0.20.0
```

```go
import kdb "github.com/sv/kdbgo"
```

A `*kdb.KDBConn` is one connection. Open it with one of these functions:

| Function | Notes |
|---|---|
| `DialKDB(host string, port int, auth string)` | Connects and logs in. `auth` is `"username:password"`, or `""` for no login. |
| `DialKDBTimeout(host, port, auth, timeout time.Duration)` | The same, with a limit on the time to connect. |

On the server, [`.z.u`](../ref/dotz.md#zu-user-id) is the user name from
`auth`. If a [`.z.pw`](../ref/dotz.md#zpw-validate-user) check refuses the
login, the server closes the connection and `DialKDB` returns the error `EOF`.
`DialTLS` and `DialUnix` also exist, but PeachQ does not serve TLS or Unix
domain socket connections yet; see [Limitations](#limitations).

Send messages with these methods:

| Method | Description |
|---|---|
| `Call(cmd string, args ...*kdb.K) (*kdb.K, error)` | Synchronous. With no `args`, sends `cmd` as q text. With `args`, sends the list `(cmd; arg1; ...)`, which q evaluates as a call of the function named or written in `cmd`. Waits for the reply. |
| `AsyncCall(cmd string, args ...*kdb.K) error` | Asynchronous. Sends the same message and returns once it is written. |
| `ReadMessage() (*kdb.K, kdb.ReqType, error)` | Waits for the next message from the server, such as a published update. |
| `Close() error` | Closes the connection. |

The query program ends with the call from kdbgo's own documentation example,
which passes a Go value as an argument:

```go
res, err = con.Call("til", kdb.Int(10))
```

```text
til 10: [0 1 2 3 4 5 6 7 8 9]
```

If q signals an error, `Call` returns it as a Go `error` whose text is the q
error: `` con.Call("1+`a") `` returns the error `type`, and the connection stays
usable. `AsyncCall` never reports q errors. `Call` returns the next message
it reads, so do not make synchronous calls on a connection that is also
receiving published updates: an update that arrives first is returned as the
reply. kdbgo sets no read deadline, so
`Call` and `ReadMessage` wait until the server replies or the connection
closes. A `KDBConn` has no locking: use it from one goroutine at a time, or
guard it with a `sync.Mutex`.

## Query

`cmd/query` connects, sends one query and checks that the result is a table:

```go
con, err := kdb.DialKDB("localhost", 5004, "username:password")
if err != nil {
	log.Fatal("connect: ", err)
}
defer con.Close()

res, err := con.Call("0!select trades:count i,sum size by sym from trade")
if err != nil {
	log.Fatal("query: ", err)
}
table, ok := res.Data.(kdb.Table)
if !ok {
	log.Fatalf("not a table: q type %d", res.Type)
}
```

The query counts the trades and sums their sizes for each symbol; `i` is q's
built-in row index, so `count i` counts rows. `0!` is explained under
[Keyed tables](#keyed-tables).

Every q value arrives as a `*kdb.K`: `Type` is the q type number (negative for
an atom), `Attr` the attribute and `Data` the Go value. A table's `Data` is a
`kdb.Table`, which holds the column names in `Columns` and one `*kdb.K` per
column in `Data`. Assert each column's `Data` to its Go slice type:

```go
syms := table.Data[0].Data.([]string)
trades := table.Data[1].Data.([]int64)
sizes := table.Data[2].Data.([]int32)
fmt.Printf("%-6s %8s %8s\n", table.Columns[0], table.Columns[1], table.Columns[2])
for i := range syms {
	fmt.Printf("%-6s %8d %8d\n", syms[i], trades[i], sizes[i])
}
```

`trades` is a long column because `count` returns a long; `size` stays an int
column because `sum` of ints is an int in q. A wrong assertion panics, so check
with `, ok` or a type switch when the query is not fixed.

`kdb.UnmarshalTable` fills a slice of structs instead. It matches each column
to the exported field whose name is the column name with its first letter
upper-cased, and sets a field only when the Go types match exactly:

```go
type summary struct {
	Sym    string
	Trades int64
	Size   int32
}

var rows []summary
out, err := kdb.UnmarshalTable(table, &rows)
fmt.Printf("as structs: %+v\n", out.([]summary)[0])
```

```text
as structs: {Sym:A Trades:30 Size:15077}
```

Use the returned slice: `UnmarshalTable` appends to a copy, so `rows` itself
stays empty.

### Keyed tables

A query grouped with `by`, such as `select trades:count i by sym from trade`,
returns a keyed table. kdbgo returns it as a `kdb.Dict` whose `Key` and `Value`
are tables, so the assertion to `kdb.Table` fails:

```text
without 0!: kdb.Dict
```

Prefix the query with `0!` to unkey it, as `cmd/query` does, or read the key
and value tables from the `kdb.Dict`.

### q types in Go

The second column is the Go type in `Data` for an atom and for a vector of
that type. The third says how to send a value of that type from Go, with a
helper function or a `*kdb.K` built directly, such as
`&kdb.K{Type: kdb.KB, Data: []bool{true, false}}`. Type constants such as
`kdb.KB` are positive; an atom uses the negative, for example `-kdb.KB`.

| q type | Received as (atom / vector) | Send from Go |
|---|---|---|
| boolean `b` | `bool` / `[]bool` | `&kdb.K{Type: -kdb.KB, Data: true}`, `&kdb.K{Type: kdb.KB, Data: []bool{...}}` |
| guid `g` | `uuid.UUID` / `[]uuid.UUID` | `&kdb.K` of type `-kdb.UU` or `kdb.UU`, using [gouuid](https://github.com/nu7hatch/gouuid) |
| byte `x` | `byte` / `[]byte` | `&kdb.K` of type `-kdb.KG` or `kdb.KG` |
| short `h` | `int16` / `[]int16` | Atom: `&kdb.K{Type: -kdb.KH, Data: int16(5)}`. A short vector cannot be sent. |
| int `i` | `int32` / `[]int32` | `kdb.Int`, `kdb.IntV` |
| long `j` | `int64` / `[]int64` | `kdb.Long`, `kdb.LongV` |
| real `e` | `float32` / `[]float32` | `kdb.Real`, `kdb.RealV` |
| float `f` | `float64` / `[]float64` | `kdb.Float`, `kdb.FloatV` |
| char `c` | `byte` / `string` | A q string: `&kdb.K{Type: kdb.KC, Data: "text"}`. A char atom cannot be sent. |
| symbol `s` | `string` / `[]string` | `kdb.Symbol`, `kdb.SymbolV` |
| timestamp `p` | `time.Time` / `[]time.Time`, UTC, nanoseconds kept | `&kdb.K` of type `-kdb.KP` or `kdb.KP` with `time.Time` |
| month `m` | `kdb.Month` / `[]kdb.Month`, months since 2000.01 | Vector only, `kdb.KM` with `[]int32` |
| date `d` | `int32` days since 2000.01.01 / `[]time.Time` | Vector only, `kdb.KD` with `[]int32` days. `kdb.Date` and `kdb.DateV` fail. |
| datetime `z` | `float64` days / `[]time.Time` | Vector only, `kdb.KZ` with `[]float64` days |
| timespan `n` | `time.Duration` / `[]time.Duration` | Vector only, `kdb.KN` with `[]time.Duration` |
| minute `u` | `int32` / `[]kdb.Minute` | Vector only, `kdb.KU` with `[]int32` minutes |
| second `v` | `int32` / `[]kdb.Second` | Vector only, `kdb.KV` with `[]int32` seconds |
| time `t` | Atom: error `Bad Message` / `[]kdb.Time` | Vector only, `kdb.KT` with `[]int32` milliseconds |
| general list | `[]*kdb.K` | `kdb.NewList` |
| dictionary | `kdb.Dict` | `kdb.NewDict(keys, values)` |
| table | `kdb.Table` | `kdb.NewTable(columns, data)` |
| keyed table | `kdb.Dict` of two `kdb.Table` | `kdb.NewDict` of two tables |
| function | `kdb.Function` for a lambda | `kdb.NewFunc("", "{x+1}")` |
| primitive, such as `+` or `::` | `byte`, with `Type` from `kdb.KFUNCUP` to `kdb.KEACHLEFT` | |

The month, date, datetime, minute, second and time vectors you receive cannot
be sent back as they are: convert them to the `[]int32` or `[]float64` form
first. Sending a type that kdbgo cannot encode returns an error such as
`unknown type 5`, or an incomplete message that q answers with `badmsg`.

Nulls and infinities of the numeric types are ordinary values; kdbgo names them
`kdb.Nh`, `kdb.Ni`, `kdb.Nj`, `kdb.Ne` and `kdb.Nf` (both NaN), and `kdb.Wh`,
`kdb.Wi`, `kdb.Wj`, `kdb.We` and `kdb.Wf`. They round-trip unchanged. Temporal
nulls have no constants and look like ordinary dates: `0Np` arrives as
`1707-09-22 00:12:43.145224192 +0000 UTC`, and a null in a date vector
overflows into a meaningless `time.Time`. Test for nulls in q with `null`, or
fill them, before reading temporal columns in Go. `kdb.Month`'s `String`
method prints the month one too low (`2001.02m` prints as `2001.01m`); the
value itself is correct.

## Subscribe

A subscriber registers with a publisher once, then waits for updates. The
server script contains a tiny publisher: `.u.sub` registers the caller, and
`.u.upd` inserts each batch of trades and forwards it to every subscriber. A
timer calls `.u.upd` with up to five random trades every 500 ms:

```q
trade:([]time:`time$();sym:`symbol$();price:`float$();size:`int$();stop:`boolean$();cond:`char$();ex:`char$())
quote:([]sym:`symbol$();bid:`float$();size:`long$())
subs:`int$()
.u.sub:{[t;s] subs,:.z.w; 0#value t}
.u.upd:{[t;x] t insert x; {neg[x] (`upd;y;z)}[;t;x] each subs;}

.z.po:{-1 "open  handle ",string x;}
.z.pc:{subs::subs except x; -1 "close handle ",string x;}
.z.pg:{-1 "query ",$[10h=type x;x;-3!x]; value x}

.z.ts:{n:1+rand 5; .u.upd[`trade;([]time:n#.z.t;sym:n?`A`GM`GOOG`KX;price:(floor 10000*n?1f)%100;size:n?1000i;stop:n?0b;cond:n?"BS";ex:n?"LN")]}
\t 500
```

`.z.w` is the handle of the connection that called `.u.sub`, and `neg[x]`
sends a message asynchronously on handle `x`. `cmd/subscribe` subscribes to
all symbols of the `trade` table with one synchronous call, then calls
`ReadMessage` in a loop. Each call blocks until the next update arrives:

```go
if _, err := con.Call(".u.sub[`trade;`]"); err != nil {
	log.Fatal("subscribe: ", err)
}
for {
	msg, _, err := con.ReadMessage()
	if err != nil {
		log.Fatal("read: ", err)
	}
	parts := msg.Data.([]*kdb.K)
	name := parts[1].Data.(string)
	rows := parts[2].Data.(kdb.Table)
	fmt.Printf("%s update. row 1/%d -> %s\n", name, parts[2].Len(), firstRow(rows))
}
```

Each update is the q list `` (`upd;`trade;table) ``, a general list that
arrives as `[]*kdb.K`: the function name, the table name and a `kdb.Table`
holding the new rows. `ReadMessage` also returns the message type, which is
`kdb.ASYNC` for these updates. `firstRow` formats the first value of each
column with `col.Index(0)`; a char column's `Data` is a Go `string`, so it
takes one byte of it instead. The subscriber prints:

```text
trade update. row 1/3 -> time:14:11:45.936 sym:GM price:50.21 size:855 stop:false cond:B ex:N
trade update. row 1/4 -> time:14:11:46.436 sym:A price:47.97 size:920 stop:true cond:B ex:L
trade update. row 1/2 -> time:14:11:46.936 sym:A price:15.93 size:989 stop:false cond:B ex:L
trade update. row 1/3 -> time:14:11:47.438 sym:GM price:98.53 size:993 stop:true cond:S ex:N
```

`row 1/4` means the batch contained four rows. Press **Ctrl+C** to stop. If the
server stops first, `ReadMessage` returns an error and the program exits with
`read: Failed to read message header:EOF`. To process updates while doing
other work, run the loop in its own goroutine and pass each table to the rest
of the program on a channel.

## Send data

`cmd/send` builds a three-row table from Go slices and upserts it into the
`quote` table, which the server script defines with symbol, float and long
columns:

```go
quotes := kdb.NewTable(
	[]string{"sym", "bid", "size"},
	[]*kdb.K{
		kdb.SymbolV([]string{"A", "GM", "KX"}),
		kdb.FloatV([]float64{101.25, 37.5, 12.75}),
		kdb.LongV([]int64{300, 1200, 50}),
	})
if err := con.AsyncCall("upsert", kdb.Symbol("quote"), quotes); err != nil {
	log.Fatal("send: ", err)
}

count, err := con.Call("count quote")
```

q receives `` ("upsert";`quote;table) `` and calls `upsert` with the table name and
the rows. `AsyncCall` returns as soon as the message is written, and q reports
no errors back: if the columns did not match `quote`, the upsert would fail on
the server and the Go program would carry on. q handles the messages on one
connection in order, so the synchronous `count quote` that follows runs after
the upsert and confirms it:

```text
sent 3 rows; quote now has 3 rows
```

In terminal 1, the rows are in the table:

```text
q)quote
| sym    | bid    | size |
| symbol | float  | long |
|--------|--------|------|
| A      | 101.25 | 300  |
| GM     | 37.5   | 1200 |
| KX     | 12.75  | 50   |
```

The typed helpers cover symbol, int, long, real and float vectors. Columns of
other types, such as time, boolean, char and date, need a `*kdb.K` built
directly, as listed in [q types in Go](#q-types-in-go) and the
[`K` type reference](https://pkg.go.dev/github.com/sv/kdbgo@v0.20.0#K).

## Watch the server

The server script replaces three q event handlers so that the server prints
what the Go programs do. `.z.po` runs when a connection opens, `.z.pc` when it
closes, and `.z.pg` for each synchronous message, which it prints before
evaluating. Running the three programs in turn prints:

```text
open  handle 5
query 0!select trades:count i,sum size by sym from trade
query select trades:count i by sym from trade
query ("til";10i)
close handle 5
open  handle 5
query .u.sub[`trade;`]
close handle 5
open  handle 5
query count quote
close handle 5
```

Each program opens its own connection, and q reuses the handle number once
the previous connection has closed. `("til";10i)` is the list `Call` sends when
it has arguments. The upsert from `cmd/send` and the subscriber's updates are
asynchronous, so they are not printed. `.z.ts` runs on the timer set with
`\t 500`; see [Observe connection and message handlers](../guides/interprocess-communication.md#observe-connection-and-message-handlers)
for all four IPC handlers.

## Limitations

As of 2026-10-08, with PeachQ v0.88, two kdbgo connection types do not work.
`DialUnix` connects to the abstract Unix domain socket `@/tmp/kx.PORT`, which
kdb+ opens on Linux alongside the port given with `-p`. PeachQ listens on TCP
only, so `DialUnix` fails with `connection refused`. `DialTLS` needs a server
that accepts TLS connections, and the current PeachQ release does not
complete a TLS handshake, so `DialTLS` fails. Use `DialKDB` or `DialKDBTimeout` over TCP.

kdbgo's own test suite also contains two tests, `TestDecoding` and
`TestEncoding`, that run without a server and fail inside kdbgo 0.20.0
whichever q they are run against. They compare kdbgo's encoder and decoder
with byte sequences stored in kdbgo's test file that no longer match how
kdbgo represents date and time values. The type gaps that matter in practice
are listed in [q types in Go](#q-types-in-go), which was checked by sending a
value of every q type to PeachQ and back.

## Summary

You have queried PeachQ from Go and read the result as Go slices and structs,
received live updates in a Go subscriber, and sent a table from Go into a
PeachQ table.

Points to keep in mind:

- kdbgo 0.20.0, from June 2019, is the latest release, and the repository has
  had no commits since. Check its
  [open issues](https://github.com/sv/kdbgo/issues) before relying on it, and
  pin the version in `go.mod`.
- Some q types can be received but not sent, or need a `*kdb.K` built
  directly; see [q types in Go](#q-types-in-go). Temporal nulls arrive as
  ordinary-looking `time.Time` values.
- kdbgo compresses each outgoing message larger than 17 bytes when that makes
  it smaller, including on localhost, and PeachQ accepts these messages.
  PeachQ compresses replies over 2000 bytes to clients on other hosts, as kdb+
  does, and kdbgo decompresses them.
- TLS and Unix domain socket connections are not available with PeachQ yet;
  use TCP. See [Limitations](#limitations).

Report problems at [PeachQ issues](https://github.com/peachq-org/peachq/issues).
