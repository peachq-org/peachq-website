#!/bin/sh
# Build the full site: MkDocs output, then the static overlay, then the chrome
# split. Run from anywhere; it cds to the repo root itself.
set -eu

cd "$(dirname "$0")/.."

mkdocs build --strict

# Overlay first, split second: split_chrome.py writes into site/partials and
# must not be clobbered by the copy.
cp -a static/. site/

python3 tools/split_chrome.py

echo "built site/ ($(find site -type f | wc -l) files)"
