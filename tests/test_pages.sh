#!/bin/sh
# Serves the built site and asserts both halves work: the PHP root pages keep
# their own design, and /docs + /news are Material output.
set -eu
cd "$(dirname "$0")/.."

failures=0
check() {
  if [ "$2" -eq 0 ]; then echo "PASS  $1"; else echo "FAIL  $1"; failures=$((failures+1)); fi
}

php -S 127.0.0.1:8899 -t site >/dev/null 2>&1 &
server=$!
trap 'kill $server 2>/dev/null || true' EXIT
sleep 2

get() { curl -sf "http://127.0.0.1:8899$1"; }

echo "--- root pages use the PeachQ design ---"
for page in index repl compatibility contact download roadmap about; do
  body=$(get "/$page.php") || { echo "FAIL  $page fetched"; failures=$((failures+1)); continue; }
  check "$page fetched" 0
  echo "$body" | grep -q '<html'                ; check "$page has <html>" $?
  echo "$body" | grep -q '</html>'              ; check "$page has </html>" $?
  echo "$body" | grep -q 'href="/css/styles.css"'; check "$page loads styles.css" $?
  echo "$body" | grep -q 'class="brand"'        ; check "$page has PeachQ header" $?
  # Unexecuted PHP would mean template.php leaked through as text.
  if echo "$body" | grep -q '<?php'; then check "$page has no raw PHP" 1; else check "$page has no raw PHP" 0; fi
  # The root pages must NOT pick up Material's chrome.
  if echo "$body" | grep -q 'md-header'; then check "$page is free of Material chrome" 1; else check "$page is free of Material chrome" 0; fi
done

echo "--- root page functionality survives ---"
get /repl.php | grep -q 'id="replEditor"'          ; check "repl keeps its editor" $?
get /repl.php | grep -q 'src="/repl.js"'           ; check "repl loads repl.js" $?
get /compatibility.php | grep -q 'id="compatHeat"' ; check "compatibility keeps its heatmap" $?
get /contact.php | grep -q 'name="formtoken"'      ; check "contact keeps its form token" $?
get /examples/example-first-open.q | grep -q 'a + b'; check "repl examples are served" $?

echo "--- docs and news are Material ---"
get /docs/ | grep -q 'md-header'                   ; check "docs has Material chrome" $?
get /news/ | grep -q 'md-header'                   ; check "news has Material chrome" $?
get /news/ | grep -q 'website is now open source'  ; check "news index lists the post" $?
[ -f site/news/2026/07/20-the-peachq-website-is-now-open-source/index.html ]
check "blog post page generated" $?
[ -d site/news/archive/2026 ]                      ; check "blog archive generated" $?

echo "--- assets ---"
# Dotfiles are easy to lose in a copy step, and every extensionless URL on the
# site depends on this one surviving into the build output.
[ -f site/.htaccess ]                              ; check "htaccess survives the build" $?
for ref in /css/styles.css /script.js /img/peachq-logo.svg; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:8899$ref")
  [ "$code" = "200" ]; check "asset 200: $ref" $?
done
# Whatever stylesheets Material pulls in must actually resolve.
for ref in $(get /docs/ | grep -oE 'href="[^"]*\.css"' | sed 's/href="//;s/"//' | grep -v '^http'); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:8899/docs/$ref")
  [ "$code" = "200" ]; check "docs css resolves: $ref" $?
done

echo ""
[ "$failures" -eq 0 ] && echo "All passed" || echo "$failures failed"
exit "$failures"
