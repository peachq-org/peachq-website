---
title: Java API
description: Query PeachQ from Java, subscribe to live updates and stream trades into it with a feed handler, using the javakdb client.
integration_source: https://github.com/KxSystems/javakdb/tree/2.2
---

<!-- peachq: audience="You are a Java developer who wants to query PeachQ from Java or write a feed handler that sends data into it. You know Java; you know q basics or will pick them up." goal="Connect to PeachQ from Java, run a query and read the result, subscribe to updates, and send data with a feed handler, having seen each step working on PeachQ." -->

# Java API

<video class="peachq-video" controls preload="none" playsinline src="/video/java-api-FHD.mp4" poster="/recordings/java-api/intro-frame.png"></video>

Connect Java to PeachQ with [javakdb](https://github.com/KxSystems/javakdb), KX's
Java client for q. Three small programs cover the common jobs: a feed handler
streams trades into a PeachQ table, a query reads a table back into Java, and a
subscriber receives every new batch of trades as it arrives.

The query below is sent from Java while the feed runs. It returns a live summary
of the trades, printed by Java:

```text
sym           trades        size
A             66            34063
GM            57            27035
GOOG          71            36622
KX            66            30854
4 rows
```

The values change with every run because the feed generates random trades.

## Run it

Use Linux x86-64, Bash, `curl`, `tar` and Java 8 or newer. A Java runtime runs
the examples; install a Java Development Kit (JDK) to compile your own programs.
Start in a fresh directory. The PeachQ server runs in one terminal; the Java
programs run in another.

**Terminal 1: download PeachQ and the examples, then start the server:**

```bash
mkdir peachq-java-api && cd peachq-java-api
mkdir peachq
curl -fL https://peachq.org/download/peachq-linux-x64.tar.gz | tar -xz -C peachq
curl -fLO https://peachq.org/docs/interfaces/examples/java-api-examples.jar
curl -fLO https://peachq.org/docs/interfaces/examples/java-api-server.q
./peachq/q java-api-server.q -p 5001
```

**Terminal 2: stream trades, query them and subscribe:**

```bash
cd peachq-java-api
java -cp java-api-examples.jar com.timestored.kdb.examples.feedhandler.FeedDemo > feed.log &
sleep 2
java -cp java-api-examples.jar com.timestored.kdb.examples.TableQueryExample \
  '0!select trades:count i,sum size by sym from trade'
java -cp java-api-examples.jar com.timestored.kdb.examples.SubscriberExample localhost 5001
```

Press **Ctrl+C** to stop the subscriber, run `kill %1` to stop the feed handler,
and press **Ctrl+C** in terminal 1 to stop the server.

The [examples jar](examples/java-api-examples.jar) contains the compiled
examples, their Java source and the javakdb client (package `com.kx`), so it is
the only file Java needs. The [server script](examples/java-api-server.q)
creates the `trade` table and prints each connection and query it receives.

## Connect

javakdb is a single class, `com.kx.c`. Creating an instance opens a connection:

| Constructor | Notes |
|---|---|
| `c(String host, int port, String usernameAndPassword)` | Logs in with `"username:password"`. Throws `c.KException` if the server refuses access. |
| `c(String host, int port)` | Logs in with the `user.name` system property. |

Each instance is one connection. Send messages with these methods:

| Communication | Method | Description |
|---|---|---|
| Synchronous | `Object k(String s)` | Send a q expression, wait and return the result. |
| | `Object k(Object x)` | Send a q object, such as a list holding a function and its arguments, and return the result. |
| | `Object k(String s, Object x, ...)` | Call function `s` with up to five arguments and return the result. |
| | `Object k()` | Wait for the next incoming message, without sending anything. |
| Asynchronous | `void ks(String s)` | Send a q expression and do not wait. |
| | `void ks(Object x)` | Send a q object and do not wait. |
| | `void ks(String s, Object x, ...)` | Call function `s` with up to five arguments and do not wait. |

A synchronous call blocks until the server replies. If the server signals an
error, `k` throws `c.KException` with the q error message, for example `type`
for `1+`a`. An asynchronous call returns as soon as the message is sent. It is
faster, but you receive no result and no error. Call `close()` when you have
finished with a connection.

To use javakdb in your own project, add `com.kx:javakdb:2.2` from Maven Central,
or put `java-api-examples.jar` on your class path.

## Query

`TableQueryExample` connects, sends one query and casts the result to `c.Flip`,
javakdb's representation of a q table:

```java
c = new c("localhost", 5001,"username:password");
final String TAB_Q = "([]date:2000.01.01+til n; time:.z.T; sym:n?`8; price:`float$n?500.0; size:(n:100)?100)";
// if argument supplied use it as query, otherwise use default table.
String query = (args!=null && args.length>0) ? args[0] : TAB_Q;

tableResult = (c.Flip) c.k(query);
```

Run it without an argument to fetch a generated table of 100 random rows:

```bash
java -cp java-api-examples.jar com.timestored.kdb.examples.TableQueryExample
```

```text
date          time          sym           price         size
2000-01-01    21:14:40.613  jlijehbl      273.8681      4
2000-01-02    21:14:40.613  kleonjpk      181.7077      80
2000-01-03    21:14:40.613  abpkjknb      215.0177      71
2000-01-04    21:14:40.613  mbpkhplf      88.3965       87
2000-01-05    21:14:40.613  alnhlgmj      67.9869       16
100 rows
```

The example prints the first five rows. On a desktop it also opens the whole
table in a Swing window; close the window to end the program.

A `c.Flip` holds the column names in `x` (a `String[]`) and one array per column
in `y`. `c.at(column, row)` reads a single value, as the example's table model does:

```java
public Object getValueAt(int rowIndex, int columnIndex) {
    return c.at(flip.y[columnIndex], rowIndex);
}
```

Each q type arrives as a Java array of the matching type. For example, a long
column is a `long[]`, a float column a `double[]`, a symbol column a `String[]`,
a date column a `java.time.LocalDate[]` and a time column a
`java.time.LocalTime[]`.

A query grouped with `by`, such as `select trades:count i by sym from trade`,
returns a keyed table. javakdb returns a keyed table as a `c.Dict` of two
tables, so the cast to `c.Flip` fails. Prefix the query with `0!` to unkey it,
as the command in [Run it](#run-it) does.

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

`SubscriberExample` subscribes to all symbols of the `trade` table with one
synchronous call. It then calls `k()` in a loop. Each call blocks until the
next update arrives:

```java
c con = new c(host, port);
con.k(".u.sub[`trade;`]");

while (true) {
    Object r = con.k();
    if (r != null) {
        Object[] data = (Object[]) r;

        String tblname = (data[1]).toString();
        c.Flip tbl = (c.Flip) data[2];
        String[] colNames = tbl.x;
        Object[] colData = tbl.y;
        // print the first row of the update
    }
}
```

Each update is the q list `` (`upd;`trade;table) ``, which arrives as an
`Object[]`: the function name, the table name and a `c.Flip` holding the new
rows. With the feed handler running, the subscriber prints the first row of
each batch:

```bash
java -cp java-api-examples.jar com.timestored.kdb.examples.SubscriberExample localhost 5001
```

```text
trade update. row 1/2 -> time:21:24:29.600 sym:A price:41.54317546859274 size:80 stop:true cond:S ex:L
trade update. row 1/7 -> time:21:24:30.103 sym:A price:86.54665342457197 size:602 stop:true cond:S ex:L
trade update. row 1/9 -> time:21:24:30.608 sym:A price:43.31608140476251 size:948 stop:false cond:B ex:L
```

`row 1/7` means the batch contained seven rows. Press **Ctrl+C** to stop.

## Send data with a feed handler

A feed handler receives data from an external source, converts it to q objects
and forwards it to q. `FeedDemo` attaches a `FeedHandler` to `FakeFeed`, which
generates between one and ten random trades every half second:

```java
FeedHandler feedHandler = new FeedHandler("localhost", 5001);
FakeFeed.INSTANCE.addListener(feedHandler);
```

For each batch, `FeedHandler` builds one array per column, wraps them in a
`c.Flip` and sends `.u.upd` asynchronously:

```java
// create the table itself from the separate columns
Object[] data = new Object[] { t, sym, price, size, stop, cond, ex };
c.Flip tab = new c.Flip(new c.Dict(COL_NAMES, data));
// create the command to insert the table of data into the named table.
Object[] updStatement = new Object[] { ".u.upd", "trade", tab };
try {
    conn.ks(updStatement); // send asynchronously
```

The Java array types set the q column types:

| Java array | q column |
|---|---|
| `LocalTime[]` | time |
| `String[]` | symbol |
| `double[]` | float |
| `int[]` | int |
| `boolean[]` | boolean |
| `char[]` | char |

These match the empty `trade` table defined in the server script. The strings
`".u.upd"` and `"trade"` are sent as q symbols, so q calls `.u.upd` with the
table name and the new rows. `.u.upd` is also the name a kdb+ tickerplant
uses for incoming data.

Run the feed handler in the foreground to watch it:

```bash
java -cp java-api-examples.jar com.timestored.kdb.examples.feedhandler.FeedDemo
```

```text
Received 2 records from fakefeed. Sent 2 records to q server
Received 9 records from fakefeed. Sent 9 records to q server
Received 7 records from fakefeed. Sent 7 records to q server
```

In terminal 1, `count trade` grows each time you run it. Press **Ctrl+C** to
stop the feed handler.

`ks` suits a feed: the handler does not wait for q to process each batch. It
also means q errors are not reported back. If a batch does not match the table's
columns, the insert fails on the server and the Java program carries on.
Check the table in q while developing a feed handler.

## Watch the server

The server script replaces three q event handlers so that the server prints
what the Java programs do. `.z.po` runs when a connection opens, `.z.pc` when it
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

You have streamed trades into PeachQ from Java, queried them back as a
`c.Flip`, and received live updates in a Java subscriber.

On the server, [`.z.u`](../ref/dotz.md#zu-user-id) is the user ID the client
sent when it connected. PeachQ currently sets `.z.u` only when the login string
contains a colon, such as `"username:password"` or `"username:"`; otherwise
`.z.u` is empty. This applies to Java clients and to q's own `hopen` alike.
`new c(host, port)` logs in with the `user.name` system property, which has no
colon, so `.z.u` is empty. Pass `"username:password"` if your server code relies
on `.z.u`.

Report problems at [PeachQ issues](https://github.com/peachq-org/peachq/issues).
