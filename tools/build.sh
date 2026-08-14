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

# Keep the source form of the language documentation beside MkDocs' rendered
# pages. This gives each topic a stable pair of URLs, for example
# /docs/ref/asc/ for HTML and /docs/ref/asc.md for tools and agents.
cp -a content/docs/basics/. site/docs/basics/
cp -a content/docs/ref/. site/docs/ref/
cp content/docs/attribution.md site/docs/attribution.md
php tools/build-help-index.php content/docs site/docs/help-index.json

echo "built site/ ($(find site -type f | wc -l) files)"
