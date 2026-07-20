#!/bin/sh
# Populate the server-only directories for local preview.
#
# /data/qdash, /file and /wasm are not in this repo. A PeachQ release uploads
# them straight to the server with `make q-upload`, and the deploy excludes them
# from --delete so a website deploy never removes them. That means a local build
# has no conformance data, no release metadata and no WebAssembly runtime, so
# the compatibility chart is empty and the download page shows its fallback
# version.
#
# This fetches the live copies into site/ purely so preview looks like
# production. They are wiped by the next tools/build.sh and are never committed.
#
# Usage: ./tools/build.sh && ./tools/dev-fixtures.sh
set -eu

cd "$(dirname "$0")/.."

BASE=${PEACHQ_FIXTURE_BASE:-https://peachq.org}

if [ ! -d site ]; then
  echo "error: site/ not found - run ./tools/build.sh first" >&2
  exit 1
fi

fetch() {
  url="$BASE/$1"
  dest="site/$1"
  mkdir -p "$(dirname "$dest")"
  if curl -sfL --max-time 30 -o "$dest" "$url"; then
    echo "  ok    $1 ($(wc -c < "$dest") bytes)"
  else
    rm -f "$dest"
    echo "  skip  $1 (not reachable at $url)"
  fi
}

echo "fetching preview fixtures from $BASE"
fetch data/qdash/data.js
fetch data/qdash/data.json
fetch file/latest.json

# The browser REPL needs the WebAssembly runtime. Its scripts are named in the
# manifest rather than fixed, so read them from there rather than guessing.
fetch wasm/latest/manifest.json
if [ -f site/wasm/latest/manifest.json ]; then
  scripts=$(sed -n 's/.*"script"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' site/wasm/latest/manifest.json)
  for s in $scripts; do
    fetch "wasm/latest/$s"
    # Emscripten ships a .js loader beside a .wasm binary of the same stem.
    case "$s" in
      *.js) fetch "wasm/latest/$(basename "$s" .js).wasm" ;;
    esac
  done
fi

echo "done. These are preview-only and are removed by the next build."
