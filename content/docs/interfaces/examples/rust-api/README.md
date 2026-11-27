# Rust API examples

Examples for the [Rust API article](https://peachq.org/docs/interfaces/rust-api/)
on peachq.org. They connect to a PeachQ server started with `rust-api-server.q`
on port 5005.

| File | What it does |
|---|---|
| `src/bin/query.rs` | Runs a query, a function call and a failing query, printing the results. |
| `src/bin/feed.rs` | Sends a random batch of trades to `.u.upd` every half second. |
| `src/bin/subscribe.rs` | Subscribes to `trade` and prints the first row of each update. |
| `rust-api-server.q` | Creates the `trade` table, a minimal publisher and handlers that print each connection and query. |

```sh
../peachq/q rust-api-server.q -p 5005
cargo build --release
cargo run --release --bin feed > feed.log 2>&1 &
cargo run --release --bin query
cargo run --release --bin subscribe
```

Requires stable Rust with Cargo. Dependencies, pinned in `Cargo.lock`:
[kdbplus](https://github.com/diamondrod/kdbplus) 0.3.8 (Apache-2.0) with the `ipc`
feature, [Tokio](https://tokio.rs/) 1.53.2 (MIT) and [chrono](https://github.com/chronotope/chrono)
0.4 (MIT or Apache-2.0). The functional query in `query.rs` is adapted from the
client example in the kdbplus README.
