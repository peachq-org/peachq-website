#!/bin/sh
# Build the site: MkDocs generates /docs and /news, then the static overlay adds
# the PHP root pages and their assets. Run from anywhere; it cds to the repo root.
set -eu

cd "$(dirname "$0")/.."

mkdocs build --strict

# The root of the site is the PHP application, not MkDocs output. Copying it in
# afterwards means Apache serves index.php, repl.php and friends from the root
# while /docs and /news come from the build.
cp -a static/. site/

echo "built site/ ($(find site -type f | wc -l) files)"
