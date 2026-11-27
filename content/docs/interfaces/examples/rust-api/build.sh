#!/bin/sh
# Rebuild ../rust-api-examples.zip (or the path given) from these files with fixed timestamps.
set -eu

out=${1:-$(dirname "$0")/../rust-api-examples.zip}
out=$(cd "$(dirname "$out")" && pwd)/$(basename "$out")
cd "$(dirname "$0")"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

mkdir -p "$work/rust-api-examples/src/bin"
cp Cargo.toml Cargo.lock README.md rust-api-server.q "$work/rust-api-examples/"
cp src/bin/query.rs src/bin/feed.rs src/bin/subscribe.rs "$work/rust-api-examples/src/bin/"
find "$work" -exec touch -d 2026-10-08T00:00:00Z {} +

rm -f "$out"
cd "$work"
find rust-api-examples | LC_ALL=C sort | TZ=UTC zip -X -q "$out" -@
echo "built $out"
