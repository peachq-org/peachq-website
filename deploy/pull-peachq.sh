#!/bin/sh
# Pull the built site from GitHub and sync it into the Apache document root.
# Runs from cron on timestored.com. Holds no credentials: the repo is public.
#
#   TARGET=/tmp/somewhere ./pull-peachq.sh    dry-run into a scratch directory
#   FORCE=1 ./pull-peachq.sh                  redeploy even if the SHA is unchanged
set -eu

REPO=${REPO:-https://github.com/peachq-org/peachq-website.git}
BRANCH=${BRANCH:-built}
CACHE=${CACHE:-/srv/cache/peachq-website}
TARGET=${TARGET:-/srv/rsync/peachq.org/public_html}
# Kept beside the checkout, not inside it, so it is never rsynced to the web root.
STAMP="$CACHE.last-deployed"

# Set ownership on the files rsync writes rather than chowning the whole tree
# afterwards: a recursive chown would also walk the release binaries under
# file/, which this script has no business touching. Only meaningful as root.
if [ "$(id -u)" = "0" ]; then
  OWNER=${OWNER:-www-data:www-data}
else
  OWNER=${OWNER:-}
fi

if [ ! -d "$CACHE/.git" ]; then
  mkdir -p "$(dirname "$CACHE")"
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$CACHE"
fi

git -C "$CACHE" fetch --depth 1 origin "$BRANCH" >/dev/null 2>&1
git -C "$CACHE" reset --hard "origin/$BRANCH" >/dev/null
head=$(git -C "$CACHE" rev-parse HEAD)

# Compare against what was last *deployed*, not against the previous checkout
# state. Using the checkout meant the very first run -- which clones and so sees
# no change -- exited without ever publishing.
last=$(cat "$STAMP" 2>/dev/null || echo none)
if [ "$last" = "$head" ] && [ "${FORCE:-0}" != "1" ]; then
  exit 0
fi

mkdir -p "$TARGET"

# file/, wasm/ and data/ are written by `make q-upload` in the rayforce repo
# (tools/q-upload.sh) and exist only on this server: release binaries plus
# latest.json, the WebAssembly runtime the REPL fetches, and the generated
# conformance dashboard. rsync --exclude also protects a path from --delete,
# which is what stops a website deploy destroying a release.
#
# If q-upload ever starts writing somewhere new, add it here first.
# tests/test_pages.sh asserts these three stay.
rsync -rh --delete \
  --exclude .git/ \
  --exclude file/ \
  --exclude wasm/ \
  --exclude data/ \
  ${OWNER:+--chown="$OWNER"} \
  "$CACHE/" "$TARGET/"

printf '%s\n' "$head" > "$STAMP"
echo "deployed $head to $TARGET"
