---
title: Interprocess communication
description: Connect two PeachQ processes, query a remote table, send updates and observe IPC event handlers.
source: https://www.timestored.com/kdb-guides/interprocess-communication
---

<!-- peachq: audience="You know basic q and have used it for a few days or weeks, but are new to IPC." goal="Connect two processes and send queries and data between them." -->

# Interprocess communication

<video class="peachq-video" controls preload="none" playsinline src="/video/interprocess-communication-FHD.mp4" poster="/recordings/interprocess-communication/intro-frame.png"></video>

The server runs on the left; client commands run on the right.

Keep a table in one PeachQ process and query it from another. This guide uses two
terminals to show synchronous requests, asynchronous updates and the handlers
that receive connections and messages. The examples use deterministic trade
data so you can check each result.

See the [IPC reference](../basics/ipc.md) for related operations and the
[Python API recipe](../cookbook/python-api.md) for Python clients.

## Start a server and a client

Start with [PeachQ installed](/download) and two terminals. In the first
terminal, start the **server**:

```bash
q -q -p 5011
```

`-p 5011` starts an IPC listener. `-q` suppresses the startup banner. Leave this
process running. Use an unused port and keep the example on a trusted machine or
network; the default handlers execute incoming q expressions.

In the second terminal, start the **client**:

```bash
q -q
```

The client does not need its own listening port.

## Query a remote table

Create a small table and a function on the **server**:

<!-- peachq: title="Server: create a table and function" -->
```q
trade:([]sym:`AAPL`MSFT;price:185.5 420.0;size:10 20)
double:{2*x}
```

On the **client**, open a connection. `hopen` returns a handle; store it in `h`.
The connection string names the host, port, username and password. Here we use
`userjim` and the illustrative password `password`. Supplying credentials does
not by itself make the server validate them. We will inspect the username
later inside a remote call.

<!-- peachq: title="Client: connect and query" -->
```q
q)h:hopen `:localhost:5011:userjim:password
q)h "2+2"
4
q)h "select from trade"
| sym    | price | size |
| symbol | float | long |
|--------|-------|------|
| AAPL   | 185.5 | 10   |
| MSFT   | 420   | 20   |
```

Applying the positive handle to a string sends a **synchronous** request. The
server evaluates the expression and the client waits for its result. `trade`
exists on the server; the returned table is a value in the client process.
You can retain a local copy with `localTrade:h "trade"`.

## Send functions and arguments

Strings are convenient at the console. A message can also be a list whose first
item is a function or a function name, followed by its arguments. This avoids
building a query string just to pass values.

Run both forms on the **client**:

<!-- peachq: title="Client: function messages" -->
```q
q)h (`double;21)
42
q)h ({x+y};20;22)
42
```

The symbol `` `double `` asks the server to call its named function. The second
message supplies the function itself. Both calls execute on the server and
return their results to the client.

## Send an asynchronous update

Use the negative handle to send a message without requesting a result. On the
**client**, insert one trade, then make a synchronous request to check it:

<!-- peachq: title="Client: insert and confirm" -->
```q
q)neg[h] (`insert;`trade;(`AAPL;186.0;5));
q)h "count trade"
3
q)h "select volume:sum size by sym from trade"
| sym    | volume |
| symbol | long   |
|========|--------|
| AAPL   | 15     |
| MSFT   | 20     |
```

The semicolon suppresses the local expression's return value. The asynchronous
send alone is not an acknowledgement that the update succeeded. The following
synchronous request on the same connection checks the server after that message.

Enter `trade` on the **server** to inspect all three rows independently:

<!-- peachq: title="Server: inspect the inserted row" -->
```q
q)trade
| sym    | price | size |
| symbol | float | long |
|--------|-------|------|
| AAPL   | 185.5 | 10   |
| MSFT   | 420   | 20   |
| AAPL   | 186   | 5    |
```

## Inspect the caller

Within a remote call, `.z.w` identifies the connection, `.z.a` gives the caller's
IPv4 address as an integer, and `.z.u` gives its username. On the **client**,
enter `h "(.z.w;.z.a;.z.u)"`.

The connection handle varies between sessions. For this localhost connection,
the remaining values are `2130706433i` (127.0.0.1) and `` `userjim ``. These values
are useful when recording which connection made a request.

Close this connection with `hclose h` before installing the handlers in the
next section.

## Observe connection and message handlers

PeachQ calls these functions for IPC events:

| Handler | Event | Argument |
|---|---|---|
| `.z.po` | Connection opened | Connection handle |
| `.z.pg` | Synchronous message | Received message |
| `.z.ps` | Asynchronous message | Received message |
| `.z.pc` | Connection closed | Connection handle |

On the **server**, create an event log and install four handlers:

<!-- peachq: title="Server: install IPC handlers" -->
```q
events:([]event:`symbol$();handle:`int$())
.z.po:{`events insert (`open;x);}
.z.pc:{`events insert (`close;x);}
.z.pg:{`events insert (`sync;.z.w);value x}
.z.ps:{`events insert (`async;.z.w);value x;}
```

The message handlers append to `events` and then call `value x` to evaluate the
incoming message. The synchronous handler returns that value to the caller.
The asynchronous handler ends with a semicolon because no reply is requested.
Replacing a handler also replaces its normal behaviour: omitting `value x`
would stop these handlers from evaluating the message.

On the **client**, connect again, request a total, update one row and read it back:

<!-- peachq: title="Client: exercise all four handlers" -->
```q
q)h:hopen `:localhost:5011:userjim:password
q)h "sum trade.size"
35
q)neg[h] "update size:30 from `trade where sym=`MSFT";
q)h "select from trade where sym=`MSFT"
| sym    | price | size |
| symbol | float | long |
|--------|-------|------|
| MSFT   | 420   | 30   |
q)hclose h
```

Back on the **server**, inspect `events`. It contains five rows in this order:
`open`, `sync`, `async`, `sync`, `close`, all for the same connection handle.
The second synchronous request both returns the updated row and produces another
`sync` event. Check the sequence directly:

<!-- peachq: title="Server: verify the event sequence" -->
```q
q)events.event~`open`sync`async`sync`close
1b
```

The `1b` result confirms that all four handlers ran. Enter `exit 0` in each
terminal when finished. Restart the server for a fresh demo; the table and
custom handlers belong to this process.
