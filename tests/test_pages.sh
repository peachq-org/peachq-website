#!/bin/sh
# Serves the built site and asserts both halves work: the PHP root pages keep
# their own design, and /docs + /news are Material styled to match.
#
# Note: no `set -e`. A failing grep is a test result, not a reason to abort the
# run -- an earlier version exited on the first failure and reported nothing.
set -u
cd "$(dirname "$0")/.."

PORT=${PORT:-8901}
failures=0

check() {
  if [ "$2" -eq 0 ]; then echo "PASS  $1"; else echo "FAIL  $1"; failures=$((failures+1)); fi
}

get() { curl -sf "http://127.0.0.1:$PORT$1"; }

# Asserts a URL's body contains a pattern.
has() {
  if get "$2" | grep -q "$3"; then check "$1" 0; else check "$1" 1; fi
}

# Asserts a URL's body does NOT contain a pattern.
lacks() {
  if get "$2" | grep -q "$3"; then check "$1" 1; else check "$1" 0; fi
}

if curl -s -o /dev/null "http://127.0.0.1:$PORT/" 2>/dev/null; then
  echo "error: port $PORT is already in use - a stale preview server would make"
  echo "       these tests pass against the wrong build. Set PORT= to override."
  exit 1
fi

# The router emulates .htaccess so these tests exercise the same extensionless
# URLs Apache serves. Without it the built-in server falls back to index.php for
# any path that does not exist, and every assertion below would pass against the
# home page.
php -S "127.0.0.1:$PORT" -t site tools/preview-router.php >/dev/null 2>&1 &
server=$!
trap 'kill $server 2>/dev/null || true' EXIT
sleep 2

echo "--- extensionless URLs route to the right page ---"
has "/compatibility is the compat page"  /compatibility 'id="compatHeat"'
has "/repl is the REPL page"             /repl          'id="replEditor"'
has "/contact is the contact page"       /contact       'name="formtoken"'
has "/download is the download page"     /download      'download-grid'
has "/roadmap is the roadmap page"       /roadmap       'roadmap-page'
has "/about is the about page"           /about         'about-grid'
# Falling back to the home page was the original bug; assert it cannot return.
lacks "/compatibility is not the home page" /compatibility 'hero-grid'
code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/no-such-page")
[ "$code" = "404" ]; check "unknown path 404s" $?

echo "--- root pages use the PeachQ design ---"
for page in "" repl compatibility contact download roadmap about; do
  label=${page:-home}
  has "$label has <html>"           "/$page" '<html'
  has "$label has </html>"          "/$page" '</html>'
  has "$label loads styles.css"     "/$page" 'href="/css/styles.css"'
  has "$label has PeachQ header"    "/$page" 'class="brand"'
  has "$label links to news"        "/$page" 'href="/news/"'
  # Unexecuted PHP would mean template.php leaked through as text.
  lacks "$label has no raw PHP"     "/$page" '<?php'
  # The root pages must NOT pick up Material's chrome.
  lacks "$label is free of Material" "/$page" 'md-header'
  # Docs was removed from the root nav for now.
  lacks "$label omits docs link"    "/$page" 'href="/docs/"'
done

echo "--- root page functionality survives ---"
has "repl keeps its editor"          /repl          'id="replEditor"'
has "repl loads repl.js"             /repl          'src="/repl.js"'
has "compatibility keeps heatmap"    /compatibility 'id="compatHeat"'
has "contact keeps its form token"   /contact       'name="formtoken"'
has "repl examples are served"       /examples/example-first-open.q 'a + b'

echo "--- docs and news are Material, themed to match ---"
has "docs has Material chrome"       /docs/ 'md-header'
has "news has Material chrome"       /news/ 'md-header'
has "news index lists the post"      /news/ 'website is now open source'
has "docs loads PeachQ theming"      /docs/ 'css/extra.css'
# The wordmark must render the Q separately so it can take --peach-strong,
# matching template.php, and link home the way .brand does.
has "news wordmark has a peach Q"    /news/ 'peachq-wordmark__q'
has "docs wordmark has a peach Q"    /docs/ 'peachq-wordmark__q'
has "wordmark links to the site root" /docs/ 'class="md-ellipsis peachq-wordmark" href="https://peachq.org/"'
# Search and the header repo link are deliberately omitted; GitHub moved to the
# footer. If a Material upgrade reinstates them, this catches it.
lacks "docs header has no search"    /docs/ 'md-search'
lacks "docs header has no source"    /docs/ 'md-header__source'
has "docs footer links to GitHub"    /docs/ 'rel="noreferrer">GitHub'
# The nav is rendered inline in the header, not in a tabs row.
lacks "docs has no tabs row"         /docs/ 'md-tabs'
has "docs nav is inline"             /docs/ 'peachq-nav__link'

echo "--- docs nav mirrors the root nav ---"
# Every entry in template.php's nav must appear in the Material header too, or
# the two halves present different menus.
for target in /repl /download /compatibility /roadmap /about /contact; do
  has "docs nav has $target" /docs/ "peachq.org$target\""
done
has "docs nav has News"   /docs/ '>News<'
has "docs nav has GitHub" /docs/ 'peachq-nav__link" href="https://github.com/peachq-org/peachq"'

echo "--- shared light/dark preference ---"
# Both halves must read the same localStorage key or the toggle does not carry.
has "docs reads peachq-theme"  /docs/ 'peachq-theme'
has "root reads peachq-theme"  /script.js 'peachq-theme'

echo "--- assets ---"
# Dotfiles are easy to lose in a copy step, and every extensionless URL on the
# site depends on this one surviving into the build output.
[ -f site/.htaccess ]; check "htaccess survives the build" $?
for ref in /css/styles.css /script.js /img/peachq-logo.svg; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT$ref")
  [ "$code" = "200" ]; check "asset 200: $ref" $?
done
for ref in $(get /docs/ | grep -oE 'href="[^"]*\.css"' | sed 's/href="//;s/"//' | grep -v '^http'); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/docs/$ref")
  [ "$code" = "200" ]; check "docs css resolves: $ref" $?
done

echo ""
[ "$failures" -eq 0 ] && echo "All passed" || echo "$failures failed"
exit "$failures"
