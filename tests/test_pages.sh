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
  has "$label loads styles.css"     "/$page" 'href="css/styles.css"'
  has "$label has PeachQ header"    "/$page" 'class="brand"'
  has "$label links to news"        "/$page" 'href="news/"'
  # Unexecuted PHP would mean template.php leaked through as text.
  lacks "$label has no raw PHP"     "/$page" '<?php'
  # The root pages must NOT pick up Material's chrome.
  lacks "$label is free of Material" "/$page" 'md-header'
  # Docs was removed from the root nav for now.
  lacks "$label omits docs link"    "/$page" 'href="docs/"'
done

echo "--- root page functionality survives ---"
has "repl keeps its editor"          /repl          'id="replEditor"'
has "repl loads repl.js"             /repl          'src="repl.js"'
has "compatibility keeps heatmap"    /compatibility 'id="compatHeat"'
has "contact keeps its form token"   /contact       'name="formtoken"'
has "repl examples are served"       /examples/example-first-open.q 'a + b'
# Held in data- attributes and fetched from JS, so the href/src checks above
# never see them -- they were absolute and 404'd on the subdirectory copy.
has "repl example paths are relative" /repl 'data-editor-example="examples/'

echo "--- docs and news are Material, themed to match ---"
has "docs has Material chrome"       /docs/ 'md-header'
has "news has Material chrome"       /news/ 'md-header'
has "news index lists the post"      /news/ 'website is now open source'
has "docs loads PeachQ theming"      /docs/ 'css/extra.css'
# The wordmark must render the Q separately so it can take --peach-strong,
# matching template.php, and link home the way .brand does.
has "news wordmark has a peach Q"    /news/ 'peachq-wordmark__q'
has "docs wordmark has a peach Q"    /docs/ 'peachq-wordmark__q'
has "wordmark links to the site root" /docs/ 'class="md-ellipsis peachq-wordmark" href="\.\./"'
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
# Match the nav link itself, not just the URL. An earlier version searched for
# the bare path, which also matched links in the page body -- so four of these
# passed without the nav containing anything at all.
# The hrefs are relative and carry Material's per-page base_url, so from /docs/
# they read "../repl". That is the property under test: a root-relative "/repl"
# here would break the copy installed at timestored.com/peachq.
for target in ../repl ../download ../compatibility ../roadmap ../news/ ../about ../contact; do
  has "docs nav has $target" /docs/ "peachq-nav__link[^\"]*\" href=\"$target\""
done
has "docs nav has GitHub" /docs/ 'peachq-nav__link" href="https://github.com/peachq-org/peachq"'
# The nav must contain exactly the root nav's entries plus GitHub.
count=$(get /docs/ | grep -oc 'class="peachq-nav__link')
[ "$count" = "8" ]; check "docs nav has 8 entries (7 + GitHub), got $count" $?

echo "--- shared light/dark preference ---"
# Material owns the state; the PHP pages follow it. script.js must therefore
# read and write Material's own localStorage entry, and Material's theme code
# must be left untouched.
# Composed from document.baseURI, which template.php sets to the site root, so
# both halves agree on the scope whether the site is at / or in a subdirectory.
has "root pages use Material's palette key" /script.js 'document\.baseURI'
has "palette key keeps Material's suffix"   /script.js '"\.__palette"'
has "root pages map slate to dark"          /script.js 'slate'
lacks "no override of Material's palette"   /docs/     'peachq-theme'
# Material computes the storage scope per page depth; all pages must land on
# the same site-root scope or the choice would not persist between them.
for page in /docs/ /news/; do
  has "$page scopes palette to site root" "$page" '__md_scope=new URL("\.\."'
done
# The toggle is icon-only.
lacks "toggle has no Light text" /script.js '☀ Light'
lacks "toggle has no Dark text"  /script.js '◐ Dark'

echo "--- Matomo runs on both halves of the site ---"
# The snippet is duplicated in static/template.php and overrides/main.html, so
# assert every kind of page has it: dropping one half loses half the traffic.
for page in "" repl compatibility contact download roadmap about /docs/ /news/; do
  case $page in /*) url=$page ;; *) url=/$page ;; esac
  has "${page:-home} loads matomo.js"  "$url" "timestored\.com/mat/"
  has "${page:-home} tracks page view" "$url" "trackPageView"
  # Site 4 is "peachq". Site 1 is TimeStored's own site, and this said 1 for a
  # while -- tracking worked perfectly and filed every visit under TimeStored,
  # so the peachq site read zero. The snippet is duplicated across the two
  # halves, which is exactly how the ids drift apart.
  has "${page:-home} reports to site 4" "$url" "setSiteId', *'4'"
done

echo "--- legacy .html URLs redirect to a clean URL ---"
# The redirect must be a URL path. An earlier version substituted a relative
# path in a per-directory rewrite, and Apache prepended the filesystem path --
# /repl.html sent visitors to /srv/rsync/peachq.org/public_html/repl.
for page in index download repl compatibility roadmap about; do
  location=$(curl -s -o /dev/null -w '%{redirect_url}' "http://127.0.0.1:$PORT/$page.html")
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/$page.html")
  [ "$code" = "301" ]; check "/$page.html is a 301 (got $code)" $?
  case "$location" in
    */"$page") check "/$page.html redirects to $location" 0 ;;
    *) check "/$page.html redirects somewhere wrong: $location" 1 ;;
  esac
done
# Everything above exercises tools/preview-router.php, which emulates .htaccess
# -- it cannot reproduce the Apache behaviour that caused the bug (a relative
# substitution in a per-directory external redirect gets DOCUMENT_ROOT's
# filesystem path prepended). So assert the shape of the rule itself, which is
# the part that has to stay right.
grep -q 'RewriteCond %{REQUEST_URI} \^(\.\*)/(index|download' site/.htaccess
check "the .html rule matches on REQUEST_URI" $?
grep -q 'RewriteRule \^ %1/%2 \[R=301,L\]' site/.htaccess
check "the .html rule substitutes a URL path, not a relative one" $?
if grep -qE 'RewriteRule \^\(index\|download.*\[R=301' site/.htaccess; then
  check "the relative-substitution form is gone" 1
else
  check "the relative-substitution form is gone" 0
fi

# The specific shape of the old bug: a filesystem path in the redirect target.
location=$(curl -s -o /dev/null -w '%{redirect_url}' "http://127.0.0.1:$PORT/repl.html")
case "$location" in
  *srv/*|*public_html*|*/home/*) check "redirect leaks a filesystem path: $location" 1 ;;
  *) check "redirect contains no filesystem path" 0 ;;
esac

echo "--- every page tells search engines peachq.org is the original ---"
# The same build is also served from timestored.com/peachq. Without these the
# mirror competes with this site for its own content. Self-referencing here,
# which is the recommended form and is what lets one rule cover both copies.
for page in "" repl compatibility contact download roadmap about; do
  label=${page:-home}
  target="https://peachq.org/$page"
  has "$label points rel=canonical at peachq.org" "/$page" "<link rel=\"canonical\" href=\"$target\">"
done
# Material derives these from site_url; they are the reason it stays absolute.
has "docs points rel=canonical at peachq.org" /docs/ '<link rel="canonical" href="https://peachq.org/docs/">'
has "news points rel=canonical at peachq.org" /news/ '<link rel="canonical" href="https://peachq.org/news/">'
# A 404 is served for whatever was asked for, so it has no canonical URL.
lacks "the error page has no canonical" /no-such-page 'rel="canonical"'

echo "--- header links are root-relative ---"
has  "logo links to /"      /docs/ 'class="md-header__button md-logo"'
lacks "no absolute site URL in docs header" /docs/ 'href="https://peachq.org/"'
lacks "no absolute site URL in news header" /news/ 'href="https://peachq.org/"'
has  "footer about is relative"   /docs/ 'href="\.\./about"'
has  "footer contact is relative" /docs/ 'href="\.\./contact"'

echo "--- release-uploaded data files are referenced correctly ---"
# A PeachQ release uploads JSON into file/, wasm/ and data/, which live only on
# the server. The pages that consume them must still ask for the right paths.
has "download.js fetches latest.json" /download.js '"file/latest.json"'
has "download page loads download.js" /download    'src="download.js"'
has "repl fetches the wasm manifest"  /repl.js     '"wasm/latest/manifest.json"'
has "compatibility loads qdash data"  /compatibility 'src="data/qdash/data.js"'
# The deploy must never delete those directories.
for dir in file wasm data; do
  grep -q -- "--exclude $dir/" deploy/pull-peachq.sh
  check "deploy excludes $dir/ from --delete" $?
done

echo "--- download page follows latest.json ---"
# `make q-upload` writes /file/latest.json last, so it is the release source of
# truth. download.php must render from it, or every release needs a repo edit.
#
# tools/dev-fixtures.sh may have left a real latest.json in site/. Move it aside
# so these assertions test the code rather than whatever is currently published.
if [ -e site/file ]; then mv site/file site/.file-testbak; fi
has "download falls back without latest.json" /download 'peachq-v0.41.0-linux-x86_64.tar.gz'
mkdir -p site/file
cat > site/file/latest.json <<'JSON'
{
  "version": "v9.9.9",
  "uploaded": "2099-01-02",
  "files": {
    "windows": { "name": "peachq-v9.9.9-windows-x86_64.zip",  "bytes": 1, "sha256": "x" },
    "mac":     { "name": "peachq-v9.9.9-darwin-arm64.tar.gz", "bytes": 1, "sha256": "x" },
    "linux":   { "name": "peachq-v9.9.9-linux-x86_64.tar.gz", "bytes": 1, "sha256": "x" }
  }
}
JSON
has "download shows latest.json version"  /download 'v9.9'
has "download shows latest.json date"     /download '2099-01-02'
has "download shows latest.json filename" /download 'peachq-v9.9.9-linux-x86_64.tar.gz'
has "install command uses that filename"  /download 'tar -xzf peachq-v9.9.9-linux-x86_64.tar.gz'
lacks "stale hardcoded version is gone"   /download 'peachq-v0.41.0-linux'
rm -rf site/file
if [ -e site/.file-testbak ]; then mv site/.file-testbak site/file; fi

echo "--- every script a root page references resolves ---"
# download.js was missed in the initial port: the page referenced it, it 404'd,
# and the release-driven version override silently stopped working. Nothing
# caught it, because a missing script still renders a perfectly good page.
for page in "" repl compatibility contact download roadmap about; do
  for ref in $(get "/$page" | grep -oE 'src="/[^"]+\.js"' | sed 's/src="//;s/"//'); do
    case "$ref" in
      /data/*|/wasm/*|/file/*) continue ;;  # server-only, absent from the build
    esac
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT$ref")
    [ "$code" = "200" ]; check "${page:-home} script resolves: $ref" $?
  done
done

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
