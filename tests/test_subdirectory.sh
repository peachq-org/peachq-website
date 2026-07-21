#!/bin/sh
# Asserts one build of the site works both at a document root and installed in a
# subdirectory of another site.
#
# That second case is timestored.com/peachq, a mirror for the corporate networks
# that block newer domains. There is no separate mirror build: the same output
# is served both ways, which only holds while every link stays relative. This is
# the test that catches the first hard-coded "/" -- which would work perfectly on
# peachq.org and quietly point at somebody else's site on the mirror.
#
# Run tests/test_pages.sh first; this assumes site/ is built.
#
# Note: no `set -e`, matching test_pages.sh -- a failing assertion is a result.
set -u
cd "$(dirname "$0")/.."

ROOT_PORT=${ROOT_PORT:-8903}
NEST_PORT=${NEST_PORT:-8904}
SUBDIR=peachq
WORK=$(mktemp -d)
failures=0

trap 'kill ${root_server:-0} ${nest_server:-0} 2>/dev/null; rm -rf "$WORK"' EXIT

check() {
  if [ "$2" -eq 0 ]; then echo "PASS  $1"; else echo "FAIL  $1"; failures=$((failures+1)); fi
}

if [ ! -d site ]; then
  echo "error: site/ not found - run ./tools/build.sh first" >&2
  exit 1
fi

# The same bytes, served two ways. Copied rather than rebuilt precisely so this
# cannot accidentally test a differently-configured build.
mkdir -p "$WORK/nested/$SUBDIR"
cp -a site/. "$WORK/nested/$SUBDIR/"

php -S "127.0.0.1:$ROOT_PORT" -t site tools/preview-router.php >/dev/null 2>&1 &
root_server=$!
php -S "127.0.0.1:$NEST_PORT" -t "$WORK/nested" tools/preview-router.php >/dev/null 2>&1 &
nest_server=$!
sleep 2

PAGES="/ /repl /compatibility /contact /download /roadmap /about /docs/ /news/ /news/2026/07/20-announcing-peachq/"

echo "--- every page serves from a subdirectory ---"
for page in $PAGES; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$NEST_PORT/$SUBDIR$page")
  [ "$code" = "200" ]; check "/$SUBDIR$page returns 200 (got $code)" $?
done

echo "--- no page hard-codes a root-relative URL ---"
# <base> is the exception: it is the one URL that has to name the install root,
# and it is what makes the relative URLs on the PHP pages resolve from the 404
# page, which is served at arbitrary depth.
#
# 404.html is excluded. MkDocs generates it with root-relative URLs on purpose,
# since an error page is served at an unknown depth -- but nothing serves it:
# .htaccess rewrites unmatched requests to weberror.php, which handles the same
# problem with <base> and does work in a subdirectory.
leaked=$(grep -rlE '(href|src|action)="/[^/"]' site --include='*.html' --include='*.php' --include='*.js' 2>/dev/null \
  | grep -v '^site/404\.html$')
if [ -z "$leaked" ]; then
  check "built files contain no root-relative URLs" 0
else
  check "built files contain no root-relative URLs" 1
  echo "$leaked" | sed 's/^/        /'
fi

echo "--- every link and asset resolves, at both depths ---"
# Resolution is done properly rather than by string-matching: a relative URL on
# a Material page at /news/2026/07/20-slug/ means something different from the
# same string on /repl, and only real URL joining catches that.
python3 - "$ROOT_PORT" "$NEST_PORT" "$SUBDIR" $PAGES > "$WORK/links.log" <<'PYEOF'
import re, sys, urllib.error, urllib.request
from urllib.parse import urljoin

root_port, nest_port, subdir = sys.argv[1], sys.argv[2], sys.argv[3]
pages = sys.argv[4:]
REF = re.compile(r'\b(?:href|src)="([^"#][^"]*)"')
BASE = re.compile(r'<base href="([^"]*)"')
SKIP = ("http:", "https:", "//", "mailto:", "data:", "javascript:")


def fetch(url):
    try:
        with urllib.request.urlopen(url, timeout=15) as response:
            return response.status, response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        return exc.code, ""
    except Exception as exc:  # connection refused, timeout, ...
        return 0, str(exc)


for label, port, prefix in (("root", root_port, ""), ("subdirectory", nest_port, "/" + subdir)):
    for page in pages:
        page_url = "http://127.0.0.1:%s%s%s" % (port, prefix, page)
        status, body = fetch(page_url)
        if status != 200:
            print("FAIL  %s: %s is %s" % (label, page, status))
            continue
        found = BASE.search(body)
        # Relative URLs resolve against <base> when the page sets one, and
        # against the page's own URL otherwise -- exactly as a browser does.
        base = urljoin(page_url, found.group(1)) if found else page_url
        for ref in sorted(set(REF.findall(body))):
            if ref.startswith(SKIP):
                continue
            target = urljoin(base, ref)
            # download.php renders a fallback filename that the page then
            # replaces from latest.json, so the archive it names need not exist.
            if "/file/peachq-v" in target:
                continue
            # Uploaded by a PeachQ release, not built from this repo, so a plain
            # build has none of it. tools/dev-fixtures.sh fetches it for preview.
            if any(part in target for part in ("/data/qdash/", "/wasm/latest/", "/file/latest.json")):
                continue
            code, _ = fetch(target)
            if code != 200:
                print("FAIL  %s: %s -> %s (%s) is %s" % (label, page, ref, target, code))
PYEOF
if [ -s "$WORK/links.log" ]; then
  sed 's/^/  /' "$WORK/links.log"
  failures=$((failures + $(wc -l < "$WORK/links.log")))
else
  check "every reference resolves at both depths" 0
fi

echo "--- the 404 page works at any depth ---"
# It is served for arbitrary URLs, so it is the one page whose own depth is
# unknown ahead of time -- the reason template.php emits <base>.
for path in /no-such-page /docs/no-such-page /a/b/c; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$NEST_PORT/$SUBDIR$path")
  [ "$code" = "404" ]; check "/$SUBDIR$path 404s (got $code)" $?
  curl -s "http://127.0.0.1:$NEST_PORT/$SUBDIR$path" | grep -q 'Page not found'
  check "/$SUBDIR$path renders the PeachQ error page" $?
  # Without <base> the stylesheet would resolve against the requested path.
  curl -s "http://127.0.0.1:$NEST_PORT/$SUBDIR$path" | grep -q "<base href=\"/$SUBDIR/\">"
  check "/$SUBDIR$path points <base> at the install root" $?
done

echo "--- legacy .html URLs redirect correctly from a subdirectory ---"
# This is where the filesystem-path leak showed up worst: the redirect has to
# keep the subdirectory, so it cannot be a fixed absolute path either.
for page in repl download about; do
  location=$(curl -s -o /dev/null -w '%{redirect_url}' "http://127.0.0.1:$NEST_PORT/$SUBDIR/$page.html")
  case "$location" in
    *"/$SUBDIR/$page") check "/$SUBDIR/$page.html redirects to $location" 0 ;;
    *) check "/$SUBDIR/$page.html redirects wrong: $location" 1 ;;
  esac
done

echo "--- the mirror points search engines at the original ---"
# The failure this catches is a canonical that resolves to the mirror's own
# address, which would tell Google the copy is the original.
for page in / /repl /about /docs/ /news/; do
  canonical=$(curl -s "http://127.0.0.1:$NEST_PORT/$SUBDIR$page" \
    | grep -o '<link rel="canonical" href="[^"]*"' | sed 's/.*href="//;s/"//')
  case "$canonical" in
    https://peachq.org/*) check "$page canonical is $canonical" 0 ;;
    "") check "$page has a canonical (none found)" 1 ;;
    *) check "$page canonical points off peachq.org: $canonical" 1 ;;
  esac
done

echo "--- the mirror announces itself ---"
# The banner is decided at run time from the hostname, which is what allows one
# build to serve both sites. Only its wiring can be checked without a browser.
for page in / /docs/ /news/; do
  body=$(curl -s "http://127.0.0.1:$NEST_PORT/$SUBDIR$page")
  echo "$body" | grep -q 'mirror-banner.js'
  check "$page loads the mirror banner script" $?
done
grep -q 'peachq.org' site/mirror-banner.js
check "the banner knows the canonical host" $?
grep -q 'This is a mirror' site/mirror-banner.js
check "the banner says it is a mirror" $?

echo
if [ "$failures" -eq 0 ]; then
  echo "All passed"
  exit 0
fi
echo "$failures failed"
exit 1
