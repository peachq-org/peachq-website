#!/bin/sh
# Rebuild ../nodejs-api-examples.zip (or the path given) from these files with fixed timestamps.
set -eu

out=${1:-$(dirname "$0")/../nodejs-api-examples.zip}
out=$(cd "$(dirname "$out")" && pwd)/$(basename "$out")
cd "$(dirname "$0")"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

mkdir "$work/nodejs-api-examples"
cp package.json query.mjs feed.mjs relay.mjs index.html README.md "$work/nodejs-api-examples/"
find "$work" -exec touch -d 2026-10-08T00:00:00Z {} +

rm -f "$out"
cd "$work"
find nodejs-api-examples | LC_ALL=C sort | TZ=UTC zip -X -q "$out" -@
echo "built $out"
