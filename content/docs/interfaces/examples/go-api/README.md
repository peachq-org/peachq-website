# Go API examples for PeachQ

Examples for the [Go API article](https://peachq.org/docs/interfaces/go-api/),
using the [kdbgo](https://github.com/sv/kdbgo) client, version 0.20.0.

| Path | Contents |
|---|---|
| `go-api-server.q` | Server script: a `trade` table filled by a timer every 500 ms, a `quote` table, a small publisher (`.u.sub`, `.u.upd`) and connection logging. |
| `cmd/query/` | Runs a query and reads the result as Go slices and structs. |
| `cmd/subscribe/` | Subscribes to `trade` and prints the first row of each update. |
| `cmd/send/` | Builds a table in Go and upserts it into `quote`. |
| `LICENSE-kdbgo` | The kdbgo MIT licence. |

## Run

Requires Go 1.22 or later. Start PeachQ with the server script on port 5004:

```sh
q go-api-server.q -p 5004
```

In a second terminal, from this directory:

```sh
go run ./cmd/query
go run ./cmd/subscribe
go run ./cmd/send
```

The first `go run` downloads kdbgo from the Go module proxy.

## Source

Written for the PeachQ website. The `til` call in `cmd/query` is adapted from
`ExampleDialKDB` in kdbgo's `example_test.go`, Copyright (c) 2017 Sergey
Vidyuk, under the MIT licence in `LICENSE-kdbgo`.
