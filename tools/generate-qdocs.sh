#!/usr/bin/env bash
# Generate the library reference from official or local PeachQ sources.
set -euo pipefail

ref=main
ref_set=false
local_source=
qstudio_url=https://www.timestored.com/qstudio/files/beta/qstudio.jar
while (($#)); do
  case "$1" in
    --ref)
      if (($# < 2)) || [[ -z "$2" ]]; then
        echo 'error: --ref needs a branch, tag or commit' >&2
        exit 1
      fi
      ref=$2
      ref_set=true
      shift 2
      ;;
    --local-source)
      if (($# < 2)) || [[ -z "$2" ]]; then
        echo 'error: --local-source needs a library directory' >&2
        exit 1
      fi
      local_source=$2
      shift 2
      ;;
    -h|--help)
      echo 'Usage: tools/generate-qdocs.sh [--ref main|TAG|COMMIT | --local-source DIR]'
      echo 'Generate static/docs/api/ locally. Defaults to the official main branch.'
      echo 'Local source paths are relative to your current working directory.'
      exit 0
      ;;
    *) echo "error: unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -n "$local_source" ]]; then
  if $ref_set; then
    echo 'error: --ref and --local-source cannot be combined' >&2
    exit 1
  fi
  local_source=$(cd "$local_source" && pwd)
  if [[ -z "$(find "$local_source" -type f -name '*.q' -print -quit)" ]]; then
    echo 'error: local source directory contains no .q files' >&2
    exit 1
  fi
fi

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
  curl -fsSL --retry 2 "$qstudio_url" -o "$work/qstudio.jar"
  mv "$work/qstudio.jar" "$jar"
fi

mkdir -p "$work/source/lib" "$work/publish"
if [[ -n "$local_source" ]]; then
  echo "Using local library sources: $local_source"
  sha='local working tree'
  # Snapshot only q sources, preserving subdirectories and local edits.
  while IFS= read -r -d '' source; do
    relative=${source#"$local_source/"}
    mkdir -p "$work/source/lib/$(dirname "$relative")"
    cp "$source" "$work/source/lib/$relative"
  done < <(find "$local_source" -type f -name '*.q' -print0)
else
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
tar -xzf "$work/peachq.tar.gz" --strip-components=1 -C "$work/source"
fi

# The current qStudio CLI takes OUTPUT first, then INPUT.
java -Djava.awt.headless=true -cp "$jar" com.timestored.qdoc.QDocMain \
  "$work/output" "$work/source/lib" '../../repl?code='
for file in index.html qdoc2.css; do
  if [[ ! -s "$work/output/$file" ]]; then
    echo "error: qDoc did not generate $file; keeping existing docs" >&2
    exit 1
  fi
done

# Keep man.q out of the website; publish the reports alongside the reference.
cp "$work/output/qdoc2.css" "$work/publish/"
cp tools/qdocs/peachq-api.css "$work/publish/"
cp tools/qdocs/peachq-api.js "$work/publish/"
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
  if [[ -n "$local_source" ]]; then
    source_url='source.json'
  fi
  # Normalise line endings and the generator template's stray standalone "s".
  # Source descriptions and function anchors are retained unchanged.
  sed -e 's/\r$//' -e '/^s$/d' \
    -e 's|href="../.."|href="./"|g' \
    -e 's|http://www.timestored.com/favicon.png|../../img/favicon.ico|g' \
    -e 's|QDocs|PeachQ API|g' -e 's|package-summary|Library API|g' \
    -e '/<\/head>/i\<link rel="stylesheet" href="peachq-api.css" />' \
    -e '/<div class="wy-side-nav-search">/a\<p><a href="../">← PeachQ docs</a></p>' \
    -e "/Built with .*TimeStored/s|$| <nav class=\"peachq-api-links\" aria-label=\"PeachQ links\"><a href=\"../\">Docs</a> · <a href=\"../../thanks/\">Thanks</a> · <a href=\"$source_url\">Source</a></nav>|" \
    "$page" > "$work/publish/$file"
  if [[ "$file" == index.html ]]; then
    sed -i '/<\/footer>/i\<nav class="peachq-api-reports" aria-label="Generation reports"><a href="lint.html">Lint</a> · <a href="lint.csv">Lint CSV</a> · <a href="metrics.html">Metrics</a> · <a href="metrics.csv">Metrics CSV</a></nav>' "$work/publish/$file"
  fi
  php tools/qdocs/integrate.php "$work/publish/$file"
done
if [[ -n "$local_source" ]]; then
  php -r '
    $root = $argv[1];
    $hashes = [];
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root)) as $file) {
        if ($file->isFile() && $file->getExtension() === "q") {
            $hashes[substr($file->getPathname(), strlen($root) + 1)] = hash_file("sha256", $file->getPathname());
        }
    }
    ksort($hashes);
    echo json_encode([
        "source_type" => "local working tree",
        "include" => "**/*.q",
        "generator" => $argv[2],
        "files_sha256" => $hashes,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), "\n";
  ' "$work/source/lib" "$qstudio_url" > "$work/publish/source.json"
else
cat > "$work/publish/source.json" <<EOF
{
  "repository": "https://github.com/peachq-org/peachq",
  "revision": "$sha",
  "source_directory": "lib/",
  "include": "**/*.q",
  "generator": "$qstudio_url"
}
EOF
fi

# Only replace the reviewed snapshot after downloading and generating successfully.
mkdir -p "$(dirname "$target")"
if [[ -e "$target" ]]; then
  mv "$target" "$work/previous"
fi
mv "$work/publish" "$target"
echo "Generated static/docs/api/ from $sha. Review the diff and refresh the local preview."
