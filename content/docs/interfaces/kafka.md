---
title: Kafka
description: Subscribe a Kafka JSON topic into a q table, keep the bad messages, query the topic with select, commit offsets yourself, and publish JSON and q IPC messages for another q process.
---

<!-- peachq: audience="You are an engineer who already moves data over Kafka and knows topics, partitions, offsets and consumer groups. You know basic q and want to store and query that data in PeachQ." goal="Subscribe a Kafka JSON topic into a q table without losing bad messages, query the table and the topic itself with select, commit offsets only after rows are saved, and publish from q as JSON and as q IPC bytes for a second q process to consume." -->

# Kafka

<video class="peachq-video" controls preload="none" playsinline src="/video/kafka-FHD.mp4" poster="/recordings/kafka/intro-frame.png"></video>

Watch rpk feed JSON trades into Kafka, PeachQ land and query them, and a second
q process commit its offsets and receive JSON and IPC copies of a result.
Use the player's fullscreen control for a larger view.

PeachQ's `.kafka` namespace subscribes a Kafka topic straight into a q table,
reads a topic like a table, and publishes from q. You'll feed JSON trades into
Kafka with `rpk`, land them in a q table with one bad message kept aside, query
both the table and the topic, and buffer trades in a second q process that
commits its offsets only when told to. Then you'll publish volume-weighted
average prices to that second process, first as JSON and then as q IPC bytes.

[API reference: `.kafka`](/docs/api/kafka.q.html): signatures, options, return values and errors.

This is where it ends. Consumer B received the same VWAP table twice. The
values match, but only the copy sent as q IPC bytes kept `sym` as a symbol:

```q
q)ipcvwap[`vwap]~vwap`vwap
1b
q)(exec t from meta vwap;exec t from meta ipcvwap)
"Cfjp"
"sfjp"
```

## Run it

You need:

- A Kafka broker on `localhost:9092`. The recording uses Redpanda. With
  Docker, this starts a single-node Redpanda broker:

    ```bash
    docker run -d --name redpanda -p 9092:9092 redpandadata/redpanda redpanda start --overprovisioned --smp 1 --kafka-addr 0.0.0.0:9092 --advertise-kafka-addr localhost:9092
    ```

- `rpk`, Redpanda's command-line client, to create topics and produce messages.
  With the container above, `alias rpk='docker exec -i redpanda rpk'` runs the
  container's copy.
- PeachQ's Linux x64 download with DuckDB, which carries librdkafka 2.12.1
  beside `q`. In a fresh directory:

    ```bash
    mkdir peachq-kafka && cd peachq-kafka
    curl -fL https://peachq.org/download/peachq-linux-x64-duckdb.tar.gz | tar -xz
    ```

    The standard static Linux build cannot load librdkafka. With another glibc
    build, point `PEACHQ_KAFKA_LIB` at librdkafka 2.0 or later; older system
    copies, such as the 1.8 packaged with Ubuntu 22.04, are refused.

Open three terminals in the same directory. In the first, create the topics
and produce five keyed JSON trades. The fourth message is cut off:

```bash
rpk topic create demo.trades demo.vwap demo.vwap.ipc
```

```bash
rpk topic produce demo.trades -f '%k %v\n' <<'EOF'
AAPL {"sym":"AAPL","px":187.2,"qty":100}
MSFT {"sym":"MSFT","px":421.5,"qty":50}
AAPL {"sym":"AAPL","px":187.6,"qty":200}
IBM {"sym":"IBM","px":231.
MSFT {"sym":"MSFT","px":420.9,"qty":150}
EOF
```

In the second terminal, start `./q` as ingest process A and subscribe:

```q
.kafka.version[]
cfg:`bootstrap.servers`group.id`auto.offset.reset!`localhost:9092`ingest`earliest
h:hopen (`:pq:kafka:a;cfg)
opts:`types`meta`store_rejects!(`sym`px`qty!"sfj";enlist`msgtime;1b)
.kafka.sub[h;`demo.trades;(`trade;opts)]
trade
select n:count i, avg px by sym from trade
select offset,bytes:"c"$bytes from reject_errors
-1 exec first error from reject_errors;
```

Deliveries land between prompt lines. If you paste a whole block and a query
such as `trade` fails or comes back empty, run it again once the batch has
landed. If an error leaves q at the `q))` prompt, type `\` to return to `q)`:
deliveries wait while q is at that prompt.

Back in the first terminal, produce a second batch:

```bash
rpk topic produce demo.trades -f '%k %v\n' <<'EOF'
IBM {"sym":"IBM","px":231.4,"qty":300}
AAPL {"sym":"AAPL","px":188.1,"qty":120}
IBM {"sym":"IBM","px":231.8,"qty":100}
EOF
```

In A, query the table and the topic:

```q
count trade
select offset,sym,px from `:pq:kafka:a:demo.trades/ where offset>4
count .kafka.read[h;(`demo.trades;(enlist`ignore_errors)!enlist 1b)]
```

In the third terminal, start `./q` as consumer B. It buffers the trades and
commits their offsets itself:

```q
cfg:`bootstrap.servers`group.id`auto.offset.reset!`localhost:9092`desk`earliest
b:hopen (`:pq:kafka:b;cfg)
buf:()
keep:{[rows;bad;misc] buf::buf,enlist rows}
mo:`commit`meta`ignore_errors!(`manual;`topic`partition`offset;1b)
.kafka.sub[b;`demo.trades;(keep;mo)]
count raze buf
```

Once `count raze buf` shows `7`, commit the buffered rows and compare the
offsets before and after:

```q
select topic,committed,position from .kafka.offsets b
.kafka.commit[b;raze buf]
select topic,committed,position from .kafka.offsets b
```

In A, compute VWAP and publish it as JSON:

```q
vwap:0!select vwap:qty wavg px,volume:sum qty,time:max msgtime by sym from trade
`:pq:kafka:a:demo.vwap/ upsert vwap
```

In B, subscribe to the JSON topic:

```q
.kafka.sub[b;`demo.vwap;`vwap]
vwap
```

In A, publish the same table as q IPC bytes:

```q
.kafka.pub[h;`demo.vwap.ipc;`;-8!vwap]
.kafka.flush[h;5000]
```

In B, subscribe to that topic and compare:

```q
.kafka.sub[b;`demo.vwap.ipc;{[m] `ipcvwap upsert raze -9!'m`data}]
ipcvwap
meta ipcvwap
ipcvwap[`vwap]~vwap`vwap
(exec t from meta vwap;exec t from meta ipcvwap)
```

Finally run `hclose h` in A and `hclose b` in B, exit both with `\\`, and
delete the demo groups and topics from the first terminal:

```bash
rpk group delete ingest desk
```

```bash
rpk topic delete demo.trades demo.vwap demo.vwap.ipc
```

The rest of this page walks through the same run with its output. Your `msgtime`
and `time` values will differ.

## Produce a feed with rpk

`rpk topic produce -f '%k %v\n'` reads one message per line: the key up to the
first space, then the value. Each message is keyed by symbol, as a feed handler
would key it to keep one symbol on one partition:

```text
Produced to partition 0 at offset 0 with timestamp 1792414354579.
Produced to partition 0 at offset 1 with timestamp 1792414354579.
Produced to partition 0 at offset 2 with timestamp 1792414354579.
Produced to partition 0 at offset 3 with timestamp 1792414354579.
Produced to partition 0 at offset 4 with timestamp 1792414354579.
```

Offset 3 is the truncated message. Kafka stores it like any other; deciding
what to do with it is the consumer's job.

## Subscribe a topic into a table

The `.kafka` namespace loads on first use. `.kafka.version[]` loads it and
reports the librdkafka version it found:

```q
q).kafka.version[]
"2.12.1"
```

`hopen` of a `` `:pq:kafka:NAME `` alias opens a connection. Its configuration is
librdkafka's, passed through unchanged, so `bootstrap.servers`, `group.id`,
`auto.offset.reset` and any other key you already use with Kafka clients apply
as written. One handle both consumes and publishes. `group.id` is needed to
subscribe, and `earliest` makes this new group start at the beginning of the topic.

```q
q)cfg:`bootstrap.servers`group.id`auto.offset.reset!`localhost:9092`ingest`earliest
q)h:hopen (`:pq:kafka:a;cfg)
q)opts:`types`meta`store_rejects!(`sym`px`qty!"sfj";enlist`msgtime;1b)
q).kafka.sub[h;`demo.trades;(`trade;opts)]
```

A symbol target such as `` `trade `` names a table: each batch is decoded from
JSON and upserted into it, creating the table on the first batch. Each message
must be one JSON object. The options:

- `types` is a dictionary of column name to type character, such as
  `` `sym`px`qty!"sfj" ``. Without it, JSON
  strings arrive as strings. PeachQ never turns incoming strings into symbols on
  a guess, because symbols stay interned for the life of the process; name the
  columns you want as symbols. Types convert numbers: `100.75` lands in a long
  column as `101`.
- `meta` adds message columns beside the decoded ones, here Kafka's message
  timestamp `msgtime`. The others are `topic`, `partition`, `offset` and
  `msgkey`. `headers` is not accepted here; a function of one argument receives
  each message's headers, as [Publish q IPC bytes](#publish-q-ipc-bytes) shows.
- `store_rejects` keeps messages that fail to decode in a table; the next section covers it.

```q
q)trade
| msgtime                       | sym    | px    | qty  |
| timestamp                     | symbol | float | long |
|-------------------------------|--------|-------|------|
| 2026.10.19D12:52:34.579000000 | AAPL   | 187.2 | 100  |
| 2026.10.19D12:52:34.579000000 | MSFT   | 421.5 | 50   |
| 2026.10.19D12:52:34.579000000 | AAPL   | 187.6 | 200  |
| 2026.10.19D12:52:34.579000000 | MSFT   | 420.9 | 150  |
q)select n:count i, avg px by sym from trade
| sym    | n    | px    |
| symbol | long | float |
|========|------|-------|
| AAPL   | 2    | 187.4 |
| MSFT   | 2    | 421.2 |
```

By default the subscription commits each batch's offsets after the target
returns, so a restarted consumer in the same group continues from the last batch
it landed. [Commit offsets yourself](#commit-offsets-yourself) shows the
alternative.

## Keep the bad messages

By default a subscription is strict. A message that fails to decode holds its
whole batch uncommitted and pauses the topic, so a bad message stops the stream
instead of disappearing. The default `.kafka.errcb` prints one line to standard
error naming the topic, partition, offset and reason, and `.kafka.subs h` shows
the topic as paused. Calling `.kafka.sub` again resumes it, and the held batch
is delivered again. Replace `.kafka.errcb` to send the alert somewhere else; if
your handler signals, the original error is still printed:

```q
.kafka.errcb:{[h;code;reason] -2 "kafka ",string[code]," ",.Q.s1 reason;}
```

`store_rejects` keeps the stream moving instead. A bad message goes to
`reject_errors` with its topic, partition, offset, message time, key, error and
original bytes, and the rest of the batch lands:

```q
q)select offset,bytes:"c"$bytes from reject_errors
| offset | bytes                          |
| long   |                                |
|--------|--------------------------------|
| 3      | "{\"sym\":\"IBM\",\"px\":231." |
q)-1 exec first error from reject_errors;
parse: not JSON: "{\"sym\":\"IBM\",\"px\":231."
```

The error says why the message failed. Other reasons include
`parse: more than one JSON document`, `type: not a JSON object` for a bare
`null`, number or string, and `type: sym px qty missing, wanted sym px qty` for
an object without the columns. The bytes are exactly what Kafka delivered, so
you can fix and replay them. The table is keyed by topic, partition and offset,
so a message rejected again replaces its row. Name a different table with the
`rejects_table` option, or use `ignore_errors` to drop bad messages and only
count them.

## New batches arrive on their own

There is no poll call. Batches are delivered on q's main event loop, between
lines at a prompt and between requests in a server. After the second batch was
produced, A's table had grown without anything typed in A:

```q
q)count trade
7
```

A script needs the process to stay up for deliveries to arrive: run it at a
terminal, with a listening port (`-p`), or with standard input held open.

## Query the topic as a table

`` `:pq:kafka:a:demo.trades/ `` is the topic itself as an append-only table,
decoded the way the topic's subscription decodes it, with message columns
first. `select` pushes `partition`, `offset` and `msgtime` constraints down
into a bounded read from Kafka, so this reads only the new messages:

```q
q)select offset,sym,px from `:pq:kafka:a:demo.trades/ where offset>4
| offset | sym    | px    |
| long   | symbol | float |
|--------|--------|-------|
| 5      | IBM    | 231.4 |
| 6      | AAPL   | 188.1 |
| 7      | IBM    | 231.8 |
```

A read stops at the high-water mark at the time of the call; it never waits for
more messages. Name the columns you want, as here: the message key, `msgkey`,
arrives as bytes.

Reads are strict whatever the subscription does with bad messages. Without the
`offset>4` bound, a read of this topic reaches offset 3 and signals, naming the
message and the way past it:

```q
q)count select from `:pq:kafka:a:demo.trades/
'kafka: demo.trades partition 0 offset 3 does not decode (parse: not JSON: "{\"sym\":\"IBM\",\"px\":231."); .kafka.read[h;(`demo.trades;(enlist `ignore_errors)!enlist 1b)] skips bad messages, store_rejects keeps them
```

As the message says, `.kafka.read` with `ignore_errors` skips the bad message,
so counting its result counts the trades that decode:

```q
q)count .kafka.read[h;(`demo.trades;(enlist`ignore_errors)!enlist 1b)]
7
```

With `store_rejects` instead, the read also records the bad message. A `select`
of the topic never writes a rejects table. Count a read, not the topic: Kafka
knows a topic's offsets, not its rows, so `count get` of the topic returns `0N`.

## Commit offsets yourself

With the `commit` option set to `` `manual ``, nothing commits by itself. That
suits a consumer that holds rows before it makes them durable: it commits only
the rows it has saved, so a crash before the save gets them again. Consumer B
buffers each batch:

```q
q)cfg:`bootstrap.servers`group.id`auto.offset.reset!`localhost:9092`desk`earliest
q)b:hopen (`:pq:kafka:b;cfg)
q)buf:()
q)keep:{[rows;bad;misc] buf::buf,enlist rows}
q)mo:`commit`meta`ignore_errors!(`manual;`topic`partition`offset;1b)
q).kafka.sub[b;`demo.trades;(keep;mo)]
```

`keep` is a function of three arguments: the decoded rows, the batch's rejects
and a summary of the batch. `meta` adds the `topic`, `partition` and `offset`
columns that `.kafka.commit` needs, and `ignore_errors` skips the truncated
message. All seven trades arrived, but nothing is committed yet:

```q
q)count raze buf
7
q)select topic,committed,position from .kafka.offsets b
| topic       | committed | position |
| symbol      | long      | long     |
|-------------|-----------|----------|
| demo.trades |           | 8        |
```

In a real consumer you would save the rows first. Then hand `.kafka.commit` the
rows that were saved; it commits synchronously, and the library adds the
customary +1:

```q
q).kafka.commit[b;raze buf]
q)select topic,committed,position from .kafka.offsets b
| topic       | committed | position |
| symbol      | long      | long     |
|-------------|-----------|----------|
| demo.trades | 8         | 8        |
```

## Publish JSON to another q

A computes VWAP by symbol from the landed trades:

```q
q)vwap:0!select vwap:qty wavg px,volume:sum qty,time:max msgtime by sym from trade
q)vwap
| sym    | vwap     | volume | time                          |
| symbol | float    | long   | timestamp                     |
|--------|----------|--------|-------------------------------|
| AAPL   | 187.6476 | 420    | 2026.10.19D12:53:05.973000000 |
| IBM    | 231.5    | 400    | 2026.10.19D12:53:05.973000000 |
| MSFT   | 421.05   | 200    | 2026.10.19D12:52:34.579000000 |
q)`:pq:kafka:a:demo.vwap/ upsert vwap
`demo.vwap
```

`upsert` on the topic publishes each row as one JSON message, with floats at
full precision and timestamps in ISO 8601, so consumers in other languages can
read them. In a separate run of the same steps, `rpk topic consume demo.vwap`
showed AAPL's message as:

```text
{"sym":"AAPL","vwap":187.64761904761906,"volume":420,"time":"2026-10-19T14:41:41.270000000"}
```

`upsert` takes an unkeyed table, hence `0!`. B subscribes to the topic with no
options:

```q
q).kafka.sub[b;`demo.vwap;`vwap]
q)vwap
| sym    | vwap     | volume | time                          |
|        | float    | long   | timestamp                     |
|--------|----------|--------|-------------------------------|
| "AAPL" | 187.6476 | 420    | 2026.10.19D12:53:05.973000000 |
| "IBM"  | 231.5    | 400    | 2026.10.19D12:53:05.973000000 |
| "MSFT" | 421.05   | 200    | 2026.10.19D12:52:34.579000000 |
```

The JSON arrived and `time` was recognised as a timestamp, but `sym` is a
string, as the subscription section explains. Passing
`` (`vwap;(enlist`types)!enlist`sym`vwap`volume`time!"sfjp") `` as the target
would make it a symbol.

JSON suits consumers written in other languages. Between q processes, every
consumer has to restate the column types.

## Publish q IPC bytes

`-8!` serialises any q value to bytes in q's IPC format. `.kafka.pub` publishes
them as one message, here with an empty key, and `.kafka.flush` waits up to 5000
milliseconds for delivery:

```q
q).kafka.pub[h;`demo.vwap.ipc;`;-8!vwap]
q).kafka.flush[h;5000]
```

On the consumer, a function of one argument receives each batch raw: a table of
`topic partition offset msgtime msgkey headers data`, with each payload as
bytes and each message's headers as a dictionary of header name to bytes, such
as `` `src`desk!(0x72706b;0x6571) ``. `-9!` turns each payload back into the table it was, and `raze` joins
them in case a batch holds several:

```q
q).kafka.sub[b;`demo.vwap.ipc;{[m] `ipcvwap upsert raze -9!'m`data}]
q)ipcvwap
| sym    | vwap     | volume | time                          |
| symbol | float    | long   | timestamp                     |
|--------|----------|--------|-------------------------------|
| AAPL   | 187.6476 | 420    | 2026.10.19D12:53:05.973000000 |
| IBM    | 231.5    | 400    | 2026.10.19D12:53:05.973000000 |
| MSFT   | 421.05   | 200    | 2026.10.19D12:52:34.579000000 |
q)meta ipcvwap
| c      | t    | f      | a      |
| symbol | char | symbol | symbol |
|========|------|--------|--------|
| sym    | s    |        |        |
| vwap   | f    |        |        |
| volume | j    |        |        |
| time   | p    |        |        |
q)ipcvwap[`vwap]~vwap`vwap
1b
q)(exec t from meta vwap;exec t from meta ipcvwap)
"Cfjp"
"sfjp"
```

Both copies carry the same values: the JSON floats went out at full precision.
The difference is the types. Without a `types` option, the JSON copy has `sym`
as strings (`C`), while the IPC copy kept every q type, `sfjp`, because the
bytes carry them. Use IPC when both ends are q.

## Clean up

`hclose` closes a connection. Before it does, a producer delivers the messages
it still has queued, and a subscription with the default `` `auto `` commit
commits its last delivered positions, so a restart starts after them. Exiting q
does the same. Close both connections, then delete the groups and topics:

```bash
rpk group delete ingest desk
```

```bash
rpk topic delete demo.trades demo.vwap demo.vwap.ipc
```

## Summary

You've subscribed a Kafka topic into a q table with symbol types and Kafka's
message time, kept a bad message with its offset, bytes and reason instead of
losing it, and queried both the table and the topic. You've buffered trades in
a second process and committed their offsets only when told to. Then you
published a q result back to Kafka: as JSON, which needs `types` on the
consumer, and as q IPC bytes, which keep the table's types as they were.

- Pass `types` for every column, and always for columns that should be symbols.
- Choose `store_rejects` or `ignore_errors`, or keep the strict default and
  watch `.kafka.errcb`.
- Bound topic reads with `offset`, `partition` or `msgtime`, or use
  `.kafka.read` with `ignore_errors` or `store_rejects`, when a topic holds bad
  messages. Count a read, not the topic.
- Use `` `manual `` commit when rows are saved after delivery, and commit only
  what was saved.
- Publish q-to-q data with `-8!` and read it with `-9!`; use JSON for consumers
  in other languages.
- `hclose` before exiting, so queued messages are delivered and the consumer
  group can be deleted at once.

## Limitations

- **Unkeyed tables only:** `upsert` of a keyed table to a topic fails with
  `'type`. Unkey it with `0!`.
- **Committing rows stops at the last row:** `.kafka.commit` with rows commits
  up to the last row it is given. If the last messages of a partition were
  skipped with `ignore_errors` or stored as rejects, they stay uncommitted and
  are read again after a restart.
- **Give `types` for a new table:** when a symbol target creates its table from
  the first batch, it takes the columns from that batch. A batch that mixes
  shapes, or puts a string in a numeric field, lands with the union of columns
  and a general list instead of being rejected. Once the table exists, later
  messages that do not match it are rejected. Pass `types` for every column so
  that the first batch is checked too.
