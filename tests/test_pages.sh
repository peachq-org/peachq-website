#!/bin/sh
# Serves the built site and asserts each PHP page renders with Material chrome.
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

for page in repl compatibility contact; do
  body=$(curl -sf "http://127.0.0.1:8899/$page.php") || { echo "FAIL  $page fetched"; failures=$((failures+1)); continue; }
  check "$page fetched" 0
  echo "$body" | grep -q '<html'     ; check "$page has <html>" $?
  echo "$body" | grep -q '</html>'   ; check "$page has </html>" $?
  echo "$body" | grep -q 'md-header' ; check "$page has Material header" $?
  # Unexecuted PHP would mean the partials leaked through as text. Note this
  # must negate grep's status, not use grep -v, which matches per-line.
  if echo "$body" | grep -q '<?php'; then check "$page has no raw PHP" 1; else check "$page has no raw PHP" 0; fi
done

curl -sf http://127.0.0.1:8899/repl.php | grep -q 'id="replEditor"'
check "repl keeps its editor" $?
curl -sf http://127.0.0.1:8899/repl.php | grep -q 'src="/repl.js"'
check "repl loads repl.js" $?
curl -sf http://127.0.0.1:8899/compatibility.php | grep -q 'id="compatHeat"'
check "compatibility keeps its heatmap" $?
curl -sf http://127.0.0.1:8899/contact.php | grep -q 'name="formtoken"'
check "contact keeps its form token" $?
curl -sf http://127.0.0.1:8899/examples/example-first-open.q | grep -q 'a + b'
check "repl examples are served" $?

# The bespoke pages depend on PeachQ's own stylesheet for .repl-panel,
# .compat-heat and .contact-form. Material's chrome alone would render them
# structurally intact but completely unstyled, which no other assertion catches.
for page in repl compatibility contact; do
  curl -sf "http://127.0.0.1:8899/$page.php" | grep -q 'css/styles.css'
  check "$page loads styles.css" $?
done

# Dotfiles are easy to lose in a copy step, and every extensionless URL on the
# site depends on this one surviving into the build output.
[ -f site/.htaccess ]
check "htaccess survives the build" $?

# Every stylesheet and script the chrome pulls in must actually resolve. A
# missing one still renders, just unstyled, so assert rather than eyeball.
for ref in $(curl -sf http://127.0.0.1:8899/repl.php \
             | grep -oE '(href|src)="/[^"]+\.(css|js)"' \
             | sed 's/.*"\(.*\)"/\1/' | sort -u); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:8899$ref")
  [ "$code" = "200" ]
  check "asset 200: $ref" $?
done

echo ""
[ "$failures" -eq 0 ] && echo "All passed" || echo "$failures failed"
exit "$failures"
