#!/usr/bin/env bash
# Generate the library reference from the official PeachQ repository.
set -euo pipefail

ref=main
while (($#)); do
  case "$1" in
    --ref)
      if (($# < 2)) || [[ -z "$2" ]]; then
        echo 'error: --ref needs a branch, tag or commit' >&2
        exit 1
      fi
      ref=$2
      shift 2
      ;;
    -h|--help)
      echo 'Usage: tools/generate-qdocs.sh [--ref main|TAG|COMMIT]'
      echo 'Generate static/docs/api/ locally. Defaults to the official main branch.'
      exit 0
      ;;
    *) echo "error: unknown argument: $1" >&2; exit 1 ;;
  esac
done

cd "$(dirname "$0")/.."
root=$PWD
scratch="$root/build/qdocs"
target="$root/static/docs/api"
mkdir -p "$scratch/cache"
work=$(mktemp -d "$scratch/run.XXXXXX")
cleanup() {
  # Restore the previous snapshot if installing the replacement failed.
  if [[ -d "$work/previous" && ! -e "$target" ]]; then
    mv "$work/previous" "$target"
  fi
  rm -rf "$work"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

jar="$scratch/cache/qstudio.jar"
if [[ ! -s "$jar" ]]; then
  echo 'Downloading qStudio...'
  curl -fsSL --retry 2 https://www.timestored.com/qstudio/files/qstudio.jar -o "$work/qstudio.jar"
  mv "$work/qstudio.jar" "$jar"
fi

echo "Resolving official PeachQ revision: $ref"
sha=$(curl --globoff -fsSL --retry 2 -H 'Accept: application/vnd.github.sha' \
  "https://api.github.com/repos/peachq-org/peachq/commits/$ref")
if [[ ! "$sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'error: GitHub did not return a commit SHA' >&2
  exit 1
fi
echo "Downloading PeachQ $sha..."
curl -fsSL --retry 2 "https://api.github.com/repos/peachq-org/peachq/tarball/$sha" \
  -o "$work/peachq.tar.gz"
mkdir -p "$work/source" "$work/publish"
tar -xzf "$work/peachq.tar.gz" --strip-components=1 -C "$work/source"

# The current qStudio CLI takes OUTPUT first, then INPUT.
java -Djava.awt.headless=true -cp "$jar" com.timestored.qdoc.QDocMain \
  "$work/output" "$work/source/lib"
for file in index.html duckdb.q.html qdoc2.css lint.html metrics.html lint.csv metrics.csv; do
  if [[ ! -s "$work/output/$file" ]]; then
    echo "error: qDoc did not generate $file; keeping existing docs" >&2
    exit 1
  fi
done
# qDoc can report a parse failure without returning a nonzero exit status.
while IFS= read -r -d '' source; do
  if [[ ! -s "$work/output/$(basename "$source").html" ]]; then
    echo "error: qDoc omitted $(basename "$source"); keeping existing docs" >&2
    exit 1
  fi
done < <(find "$work/source/lib" -type f -name '*.q' -print0)
if ! grep -Fq '.duckdb.exec' "$work/output/duckdb.q.html"; then
  echo 'error: generated page is missing the DuckDB API; keeping existing docs' >&2
  exit 1
fi

# Keep man.q out of the website; publish the reports alongside the reference.
cp "$work/output/qdoc2.css" "$work/publish/"
cp tools/qdocs/peachq-api.css "$work/publish/"
cp "$work/output/lint.csv" "$work/output/metrics.csv" "$work/publish/"
for report in lint.html metrics.html; do
  sed -e 's|</body>|<p><a href="./">Back to Library API</a></p></body>|' \
    "$work/output/$report" > "$work/publish/$report"
done
for page in "$work/output/"*.html; do
  file=$(basename "$page")
  case "$file" in lint.html|metrics.html) continue ;; esac
  source_url="https://github.com/peachq-org/peachq/blob/$sha/lib/${file%.html}"
  if [[ "$file" == index.html ]]; then
    source_url="https://github.com/peachq-org/peachq/tree/$sha/lib"
  fi
  # Normalise line endings and the generator template's stray standalone "s".
  # Source descriptions and function anchors are retained unchanged.
  sed -e 's/\r$//' -e '/^s$/d' \
    -e 's|href="../.."|href="./"|g' \
    -e 's|http://www.timestored.com/favicon.png|../../img/favicon.ico|g' \
    -e 's|QDocs|PeachQ API|g' -e 's|package-summary|Library API|g' \
    -e '/<\/head>/i\<link rel="stylesheet" href="peachq-api.css" />' \
    -e '/<div class="wy-side-nav-search">/a\<p><a href="../">← PeachQ docs</a></p>' \
    -e "/<footer>/a\\<nav class=\"peachq-api-links\" aria-label=\"PeachQ links\"><a href=\"../\">Docs</a> · <a href=\"../../thanks/\">Thanks</a> · <a href=\"$source_url\">Source</a></nav>" \
    -e '/<footer>/a\<nav class="peachq-api-reports" aria-label="Generation reports"><a href="lint.html">Lint</a> · <a href="lint.csv">Lint CSV</a> · <a href="metrics.html">Metrics</a> · <a href="metrics.csv">Metrics CSV</a></nav>' \
    "$page" > "$work/publish/$file"
done
cat > "$work/publish/source.json" <<EOF
{
  "repository": "https://github.com/peachq-org/peachq",
  "revision": "$sha",
  "source_directory": "lib/",
  "include": "**/*.q",
  "generator": "https://www.timestored.com/qstudio/files/qstudio.jar"
}
EOF

# Only replace the reviewed snapshot after downloading and generating successfully.
mkdir -p "$(dirname "$target")"
if [[ -e "$target" ]]; then
  mv "$target" "$work/previous"
fi
mv "$work/publish" "$target"
echo "Generated static/docs/api/ from $sha. Review the diff and refresh the local preview."
