---
title: Rust API
description: Query PeachQ from Rust, subscribe to live updates and send trades with a feed handler, using the kdbplus crate on Tokio.
integration_source: https://github.com/diamondrod/kdbplus/tree/v0.3.8
---

<!-- peachq: audience="You are a Rust developer comfortable with Cargo, ownership and async Rust on Tokio, who knows little q. You want to query PeachQ from Rust, write a feed handler that sends rows into it, or subscribe to live updates." goal="Connect, run a query and read it as Rust values, subscribe to updates and send data with a feed handler, having seen each step working on PeachQ; leave with the q-to-Rust type table, including the chrono mappings." -->

# Rust API

<video class="peachq-video" controls preload="none" playsinline src="/video/rust-api-FHD.mp4" poster="/recordings/rust-api/intro-frame.png"></video>

Connect Rust to PeachQ with [kdbplus](https://github.com/diamondrod/kdbplus), an
async q IPC client written in pure Rust on Tokio. One Cargo package with three
binaries streams random trades into PeachQ, queries them back as Rust vectors,
and prints every new batch as a subscriber receives it.

While the feed handler runs, the query binary asks PeachQ for a live summary of
the trades and prints it from `Vec<String>`, `Vec<i64>` and `Vec<i32>` columns:

```text
sym      trades     size
A            17     8148
GM           14     6112
GOOG         27    14962
KX           16    10049
```

The numbers change with every run because the feed generates random trades.
The [kdbplus API reference](https://docs.rs/kdbplus/0.3.8/kdbplus/ipc/index.html)
lists every type and method used below.

## Clients

Both crates speak q IPC from Rust to a separate PeachQ process and share most of
their API.

| Crate | Licence | Status | When to use it |
| --- | --- | --- | --- |
| [kdbplus](https://github.com/diamondrod/kdbplus) 0.3.8 | Apache-2.0 | Released December 2022; stay on 0.3.8 for now, see [Limitations](#limitations) | Start here. Used by this article. |
| [kxkdb](https://github.com/KxSystems/kxkdb) 0.1.0 | Apache-2.0 | KX's fork of kdbplus; no commits since June 2023 | Existing kxkdb code. |

kdbplus also has an `api` feature for building q extensions loaded with `2:`;
this article uses only its `ipc` feature.

## Run it

Use Linux x86-64, Bash, `curl`, `tar`, `unzip` and stable Rust with Cargo. The
same code also compiles for macOS with the matching PeachQ download; kdbplus
does not compile on Windows (see [Summary](#summary)). Start in a fresh
directory. The PeachQ server runs in one terminal; the Rust binaries run in
another.

**Terminal 1: download PeachQ and the examples, then start the server:**

```bash
mkdir peachq-rust-api && cd peachq-rust-api
mkdir peachq
curl -fL https://peachq.org/download/peachq-linux-x64.tar.gz | tar -xz -C peachq
curl -fLO https://peachq.org/docs/interfaces/examples/rust-api-examples.zip
unzip -q rust-api-examples.zip && cd rust-api-examples
../peachq/q rust-api-server.q -p 5005
```

**Terminal 2: build once, then stream trades, query them and subscribe:**

```bash
cd peachq-rust-api/rust-api-examples
cargo build --release
cargo run --release --bin feed > feed.log 2>&1 &
sleep 2
cargo run --release --bin query
cargo run --release --bin subscribe
```

`cargo build --release` downloads the crates pinned in `Cargo.lock` from
crates.io and compiles them, which takes a minute or two the first time; the
`cargo run` commands then start at once. The feed handler writes its progress,
and Cargo's messages, to `feed.log`; watch it with `tail -f feed.log`. Press
**Ctrl+C** to stop the subscriber, run `kill %1; wait` to stop the feed
handler, and type `exit 0` in terminal 1 to stop the server.

The [examples archive](examples/rust-api-examples.zip) holds one Cargo package,
`rust-api-examples`: `Cargo.toml` pins kdbplus 0.3.8 with the `ipc` feature and
Tokio 1.53.2, and adds chrono for the time column. The binaries are in
`src/bin/` and connect to `localhost:5005`. `rust-api-server.q` creates the
`trade` table, a minimal publisher and handlers that print each connection and
query.

## Connect

Add the crates the examples use to your own project with:

```bash
cargo add kdbplus@=0.3.8 --features ipc
cargo add tokio --features macros,rt-multi-thread,time
cargo add chrono
```

The client is in `kdbplus::ipc`, with the attribute constants in
`kdbplus::qattribute`. A `QStream` is one connection, opened with an async
constructor:

```rust
use kdbplus::ipc::*;

#[tokio::main]
async fn main() -> Result<()> {
    let mut q = QStream::connect(ConnectionMethod::TCP, "localhost", 5005, "rust:pass").await?;
```

The last argument is the `user:password` login. On the server,
[`.z.u`](../ref/dotz.md#zu-user-id) is the user name, here `` `rust ``. If a
[`.z.pw`](../ref/dotz.md#zpw-validate-user) check refuses the login, `connect`
returns the error `authentication failure`. kdbplus prints
`connected: 127.0.0.1:5005` on standard output when the connection opens, so
that line appears before each program's own output.

| Method | Description |
|---|---|
| `send_sync_message(&message)` | Sends a query and waits for the reply, returned as a `K`. |
| `send_async_message(&message)` | Sends a query and returns once it is written. q sends no reply. |
| `receive_message()` | Waits for the next message from the server, such as a published update, and returns its message type and the `K`. |
| `shutdown()` | Closes the connection. |

A message is either q text, `&"count trade"`, or a `K` value holding a
function call, described under [Call a function](#call-a-function). Each method
returns `kdbplus::ipc::Result`, so `?` propagates connection and decoding
errors. A q error is a reply, not an `Err`: it arrives as a `K` of type -128,
and `get_error_string()` returns its text. The query binary ends with one:

```rust
let failed = q.send_sync_message(&"1+`a").await?;
println!("1+`a failed with q error: {}", failed.get_error_string()?);
```

```text
1+`a failed with q error: type
```

The connection stays usable after a q error. `QStream` methods take `&mut self`,
so one task owns a connection at a time; give each task its own connection, or
share one behind a `tokio::sync::Mutex`.

## Query

`query` sends one query and reads three columns of the result:

```rust
let summary = q
    .send_sync_message(&"0!select trades:count i,sum size by sym from trade")
    .await?;
let syms = summary.get_column("sym")?.as_vec::<String>()?;
let trades = summary.get_column("trades")?.as_vec::<i64>()?;
let sizes = summary.get_column("size")?.as_vec::<i32>()?;
println!("{:<6} {:>8} {:>8}", "sym", "trades", "size");
for i in 0..syms.len() {
    println!("{:<6} {:>8} {:>8}", syms[i], trades[i], sizes[i]);
}
```

The query counts the trades and sums their sizes for each symbol; `i` is q's
built-in row index, so `count i` counts rows. Every q value arrives as a `K`.
`get_type()` returns its q type number, negative for an atom: the summary is a
table, type 98. `get_column` returns one column as another `K`, and
`as_vec::<T>()` borrows that column's elements as a `&Vec<T>`. `trades` is a
long column because `count` returns a long; `size` stays an int column because
the sum of ints is an int in q. A wrong `T` returns an error such as
`invalid cast from int list to list of generics T`, so check `get_type()` first
when the query is not fixed.

`K` implements `Display` in q notation, which helps while exploring. The
examples in the rest of this section use a three-row table,
`` trade:([]sym:`A`GM`A;size:10 20 30i) ``. For the table returned by
`0!select trades:count i by sym from trade`, `get_dictionary()` returns the
underlying dictionary of column names and columns, which prints as:

```text
`sym`trades!(`A`GM;2 1)
```

A dictionary's `as_vec::<K>()` holds two elements, the keys and the values, so
`` `a`b!1 2 `` reads as `["a", "b"]` and `[1, 2]`.

### Keyed tables

Without `0!`, `select trades:count i by sym from trade` returns a keyed table:
a dictionary, type 99, from a table of keys to a table of values. It prints as:

```text
(+,`sym!,`A`GM)!(+,`trades!,2 1)
```

`get_column` searches the key columns, then the value columns, so it works on
both forms. `unkey()` turns a keyed table into an ordinary table on the client;
the `0!` prefix does the same on the server, which keeps the reply a plain table.

### Call a function

To pass Rust values to q, send a general list whose first element is a function
and whose remaining elements are its arguments. q applies the function to the
arguments, so a lambda works as a parameterised query. This call is adapted from
the client example in the kdbplus README:

```rust
let call = K::new_compound_list(vec![
    K::new_string(
        String::from("{[s;n] n#select time,price,size from trade where sym=s}"),
        qattribute::NONE,
    ),
    K::new_symbol(String::from("GOOG")),
    K::new_long(-3),
]);
let recent = q.send_sync_message(&call).await?;
println!("last 3 GOOG prices: {}", recent.get_column("price")?);
```

```text
last 3 GOOG prices: 148.79 148.8 149.08
```

`K::new_string` makes a q char list, which q evaluates as code when it heads the
list. `K::new_symbol` sends a real symbol, so the lambda compares it with the
`sym` column directly, and `K::new_long(-3)` makes `n#` take the last three
rows. The first element can also be a symbol naming a function, such as
`` K::new_symbol(String::from(".u.upd")) `` in the feed handler below.

### q types in Rust

An atom is read with `get_*`, which converts to the Rust type in the second
column; `get_symbol()` returns a `&str`. A list's `as_vec::<T>()` returns q's
own representation, in the third column, and `K::new_*_list` builds a list from
the second column's type plus an attribute. Atoms and lists are built with the
matching `K::new_*` function, such as `K::new_date(NaiveDate)` or
`K::new_time_list(Vec<Duration>, qattribute::NONE)`.

| q type | Atom `get_*` and `K::new_*` | List `as_vec::<T>()` |
|---|---|---|
| boolean `b` | `bool` | `u8`, 0 or 1 |
| guid `g` | `[u8; 16]` | `[u8; 16]` |
| byte `x` | `u8` | `u8` |
| short `h`, int `i`, long `j` | `i16`, `i32`, `i64` | `i16`, `i32`, `i64` |
| real `e`, float `f` | `f32`, `f64` | `f32`, `f64` |
| char `c` | `char` | A char list is a string: `K::new_string`, read with `as_string()` |
| symbol `s` | `String`; `get_symbol()` returns `&str` | `String` |
| timestamp `p` | `chrono::DateTime<Utc>`, nanoseconds kept | `i64` nanoseconds since 2000.01.01 |
| month `m` | `chrono::NaiveDate`, first of the month | `i32` months since 2000.01 |
| date `d` | `chrono::NaiveDate` | `i32` days since 2000.01.01 |
| datetime `z` | `chrono::DateTime<Utc>`, milliseconds | `f64` days since 2000.01.01 |
| timespan `n` | `chrono::Duration` | `i64` nanoseconds |
| minute `u`, second `v`, time `t` | `chrono::Duration` | `i32` minutes, seconds or milliseconds |
| general list | `K::new_compound_list(Vec<K>)` | `K` |
| dictionary | `K::new_dictionary(keys, values)` | `K`: keys, then values |
| table | `K::new_dictionary(names, columns)?.flip()` | `get_column`, `get_dictionary` |
| keyed table | a table's `.enkey(n)` | `get_column`, `unkey()` |
| generic null `::` | `K::new_null()` | |

The getters are strict: `get_int()` on a long atom such as `5` returns
`invalid cast from long to int`. To convert list elements, add the offsets
yourself with chrono, as the subscriber below does for a time column. A
`get_timestamp()`
of `2001.02.03D04:05:06.123456789` returns `2001-02-03T04:05:06.123456789Z`,
and nanosecond timestamps round-trip unchanged.

Functions cannot be received. A reply holding a lambda, an operator such as
`+`, an iterator or a projection makes kdbplus panic with
`internal error: entered unreachable code`, and a unary primitive such as `til`
arrives as `::`. Return data, not functions, from the queries you send.

### Nulls and infinities

kdbplus names the null of every type in `qnull` and the infinities in `qinf` and
`qninf`, as the values the getters return and the constructors accept. Compare
with them directly:

```rust
let day = q.send_sync_message(&"0Nd").await?.get_date()?;
assert!(day == qnull::DATE);
```

`qnull::DATE` is `NaiveDate::MIN`, so a null date prints as `-262143-01-01`,
and `qinf::DATE` is `NaiveDate::MAX`. A null timestamp is
`1707-09-22T00:12:43.145224192Z` and `0Wp` is `2292-04-10T23:47:16.854775807Z`.
Float nulls are `NaN`; test them with `is_nan()`. In the vectors from
`as_vec`, nulls keep q's representation, such as `i32::MIN` for `0Ni` and `0Nd`
and `i64::MIN` for `0Np`; `kdbplus::qnull_base` names those values. Every null
and infinity in the type table round-trips between Rust and PeachQ unchanged.

## Subscribe

A subscriber registers with a publisher once, then waits for updates. The
server script contains a tiny publisher: `.u.sub` records the caller's handle,
and `.u.upd` inserts each batch into the table and forwards it to every
subscriber.

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
sends a message asynchronously on handle `x`. `subscribe` subscribes to all
symbols of the `trade` table with one synchronous call, then waits for messages
in a loop:

```rust
q.send_sync_message(&".u.sub[`trade;`]").await?;
loop {
    let (_, message) = q.receive_message().await?;
    let parts = message.as_vec::<K>()?;
    let (name, table) = (parts[1].get_symbol()?, &parts[2]);
    println!("{name} update. row 1/{} -> {}", table.len(), first_row(table)?);
}
```

Each update is the q list `` (`upd;`trade;table) ``: the function name, the
table name and a table of new rows. `receive_message` returns the message type,
0 for these asynchronous messages, with the list. `table.len()` is the number
of rows. `first_row` reads the first element of each column with the types
from the type table:

```rust
let millis = table.get_column("time")?.as_vec::<i32>()?[0];
let time = NaiveTime::MIN + Duration::milliseconds(millis.into());
```

A q time is a count of milliseconds since midnight, so adding it to midnight
gives a `chrono::NaiveTime` to format; `Duration` is `chrono::Duration`.

The `stop` column is read as `u8` and compared with 0, and the char columns
`cond` and `ex` are read with `as_string()`. The subscriber prints:

```text
trade update. row 1/6 -> time:19:45:53.047 sym:GM price:29.96 size:227 stop:false cond:A ex:O
trade update. row 1/9 -> time:19:45:53.537 sym:GOOG price:148.68 size:251 stop:false cond:B ex:L
trade update. row 1/4 -> time:19:45:54.040 sym:KX price:92.36 size:661 stop:false cond:A ex:O
trade update. row 1/7 -> time:19:45:54.542 sym:KX price:92.23 size:515 stop:false cond:A ex:N
```

`row 1/4` means the batch contained four rows. Press **Ctrl+C** to stop. Do not
send synchronous queries on the subscribing connection: if an update arrives
before the reply, `send_sync_message` returns the error
`` expected a response: (`upd;...) ``, and the reply that follows is left unread
on the connection. Open a second connection for queries. To process updates while doing other work, run the
loop in its own Tokio task and pass each table on a channel.

## Send data with a feed handler

A feed handler converts data from an external source into q objects and sends
them to q. `feed` builds between one and ten random trades every half second.
Each column is a typed list built with a `K::new_*_list` constructor, matching
the `trade` table's column types exactly:

```rust
let names = K::new_symbol_list(COLUMNS.map(String::from).to_vec(), NONE);
let columns = K::new_compound_list(vec![
    K::new_time_list(vec![now; n], NONE),
    K::new_symbol_list(sym, NONE),
    K::new_float_list(price, NONE),
    K::new_int_list(size, NONE),
    K::new_bool_list(stop, NONE),
    K::new_string(cond, NONE),
    K::new_string(ex, NONE),
]);
K::new_dictionary(names, columns)?.flip()
```

`COLUMNS` holds the seven column names, and `NONE` is `qattribute::NONE`.
`now` is the time of day in UTC as a `chrono::Duration` since midnight, which
`new_time_list` sends as a q time column. A q char column is a string, so `cond`
and `ex` are `String`s with one character per row. A dictionary from column
names to equal-length columns, flipped, is a table. The second argument of each
list constructor is an attribute: `qattribute::SORTED`, `UNIQUE`, `PARTED` or
`GROUPED` sends `` `s# ``, `` `u# ``, `` `p# `` or `` `g# ``.

The batch is sent as a call of `.u.upd` with the table name and the rows:

```rust
let update = K::new_compound_list(vec![
    K::new_symbol(String::from(".u.upd")),
    K::new_symbol(String::from("trade")),
    trades,
]);
q.send_async_message(&update).await?;
println!("Sent {rows} trades");
```

```text
Sent 4 trades
Sent 9 trades
Sent 9 trades
```

`send_async_message` suits a feed: it returns once the message is written, so
the feed handler never waits for q to insert the rows. It also receives no
error. If a batch does not match the table's columns, the insert fails on the
server and the Rust program carries on. In terminal 1, `count trade` grows each
time you run it; while developing a feed handler, check the table in q or send
the first batches with `send_sync_message`, whose reply carries any q error.

## Watch the server

The server script replaces three q event handlers so that it prints what the
Rust programs do. `.z.po` runs when a connection opens, `.z.pc` when it closes,
and `.z.pg` for each synchronous message, which it prints before evaluating.
Running the commands in [Run it](#run-it), then stopping the subscriber and the
feed handler, prints:

```text
open  handle 5
open  handle 6
query 0!select trades:count i,sum size by sym from trade
query ("{[s;n] n#select time,price,size from trade where sym=s}";`GOOG;-3)
query 1+`a
close handle 6
open  handle 6
query .u.sub[`trade;`]
close handle 6
close handle 5
```

Handle 5 is the feed handler, which stays connected until it is stopped. The
query and the subscriber each open their own connection, and q reuses handle 6
once the first has closed. The function call is printed as the list Rust sent:
the lambda as a char list, `` `GOOG `` as a symbol and `-3` as a long. The feed
handler's `.u.upd` messages are asynchronous, so `.z.pg` does not see them. See
[Observe connection and message handlers](../guides/interprocess-communication.md#observe-connection-and-message-handlers)
for all four IPC handlers.

## Limitations

As of 2026-10-08, with PeachQ v0.88 and kdbplus 0.3.8, two kdbplus connection
methods do not work with PeachQ. `ConnectionMethod::UDS` connects to the
abstract Unix domain socket `@/tmp/kx.PORT`, which kdb+ opens on Linux beside
the `-p` port; PeachQ listens on TCP only, so the connection is refused.
`ConnectionMethod::TLS` needs a TLS handshake, which the current PeachQ release
does not complete, so kdbplus panics with `failed to create TLS session`.

When the host is not `localhost` or `127.0.0.1`, kdbplus compresses messages
over 2000 bytes, as kdb+ does. PeachQ closes the connection on highly
compressible ones, such as 10,000 identical timestamps, and the call returns
`Connection dropped: early eof`. Small feed batches are not affected.

kdbplus 0.3.9, the latest release, corrupts replies that arrive in more than
one socket read, on loopback any reply over about 100 KB. An
[upstream fix](https://github.com/diamondrod/kdbplus/pull/15) is open; stay on
0.3.8 until a release includes it. kdbplus's own suite passed 169 of its 179
tests on PeachQ: the two UDS examples failed, and eight need the `api` feature.

## Summary

You have streamed trades into PeachQ from a Rust feed handler, queried them back
as Rust vectors, and received each new batch in a Rust subscriber.

Points to keep in mind with kdbplus 0.3.8:

- Pin it with `=0.3.8`; see [Limitations](#limitations) for why not 0.3.9.
- Its send and receive methods are not cancellation-safe, so do not race them
  in `tokio::select!` ([issue 8](https://github.com/diamondrod/kdbplus/issues/8));
  wrap a call in `tokio::time::timeout` only if you then drop the connection.
- It does not compile on Windows. Windows support was merged upstream in
  February 2026 but has not been released.
- Every q data type round-trips unchanged between Rust and PeachQ, including nulls,
  infinities, nested lists, keyed tables, GUIDs and unicode.
- A q error arrives as an `Ok` value of type -128, not an `Err`; check
  `get_type()` or `get_error_string()` on replies that may fail.
- Functions cannot be received; see [q types in Rust](#q-types-in-rust).
- UDS and TLS connections are not available with PeachQ yet; see
  [Limitations](#limitations).

Report problems at [PeachQ issues](https://github.com/peachq-org/peachq/issues).
