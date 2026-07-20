#!/bin/sh
# Pull the built site from GitHub and sync it into the Apache document root.
# Runs from cron on timestored.com. Holds no credentials: the repo is public.
set -eu

REPO=https://github.com/peachq-org/peachq-website.git
BRANCH=built
CACHE=/srv/cache/peachq-website
TARGET=/srv/rsync/peachq.org/public_html

if [ ! -d "$CACHE/.git" ]; then
  mkdir -p "$(dirname "$CACHE")"
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$CACHE"
fi

before=$(git -C "$CACHE" rev-parse HEAD 2>/dev/null || echo none)
git -C "$CACHE" fetch --depth 1 origin "$BRANCH" >/dev/null 2>&1
git -C "$CACHE" reset --hard "origin/$BRANCH" >/dev/null
after=$(git -C "$CACHE" rev-parse HEAD)

if [ "$before" = "$after" ]; then
  exit 0
fi

# file/, wasm/ and data/ exist only on this server -- release binaries, the
# WebAssembly runtime the REPL fetches, and the generated conformance
# dashboard. Excluding them from --delete is what stops a deploy destroying
# them. Do not remove these lines.
rsync -rh --delete \
  --exclude .git/ \
  --exclude file/ \
  --exclude wasm/ \
  --exclude data/ \
  "$CACHE/" "$TARGET/"

chown -R www-data:www-data "$TARGET"
echo "deployed $after"
