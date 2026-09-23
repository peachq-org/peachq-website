#!/bin/sh
# Build the site: MkDocs generates /docs and /news, then the static overlay adds
# the PHP root pages and their assets. Run from anywhere; it cds to the repo root.
set -eu

cd "$(dirname "$0")/.."

output=${PEACHQ_BUILD_DIR:-site}
mkdocs build --strict --site-dir "$output"

# The root of the site is the PHP application, not MkDocs output. Copying it in
# afterwards means Apache serves index.php, repl.php and friends from the root
# while /docs and /news come from the build.
cp -a static/. "$output/"
python3 tools/build-repl-files.py "$output"

# Keep the source form of the language documentation beside MkDocs' rendered
# pages. This gives each topic a stable pair of URLs, for example
# /docs/ref/asc/ for HTML and /docs/ref/asc.md for tools and agents.
cp -a content/docs/basics/. "$output/docs/basics/"
cp -a content/docs/ref/. "$output/docs/ref/"
cp content/thanks.md "$output/thanks.md"
cp content/docs/index.md content/docs/reference.md "$output/docs/"
cp -a content/docs/peachq/. "$output/docs/peachq/"
php tools/build-help-index.php content/docs "$output/docs/help-index.json"

echo "built $output/ ($(find "$output" -type f | wc -l) files)"
