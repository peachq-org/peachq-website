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

# file/, wasm/ and data/ exist only on this server -- release binaries, the
# WebAssembly runtime the REPL fetches, and the generated conformance dashboard,
# all uploaded by `make q-upload`. Excluding them from --delete is what stops a
# website deploy destroying a release. Do not remove these lines.
rsync -rh --delete \
  --exclude .git/ \
  --exclude file/ \
  --exclude wasm/ \
  --exclude data/ \
  "$CACHE/" "$TARGET/"

if [ "$(id -u)" = "0" ]; then
  chown -R www-data:www-data "$TARGET"
fi

printf '%s\n' "$head" > "$STAMP"
echo "deployed $head to $TARGET"
