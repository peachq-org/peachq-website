#!/bin/sh
# Rebuild ../java-api-examples.jar (or the path given) from these sources with JDK 17.
set -eu

out=${1:-$(dirname "$0")/../java-api-examples.jar}
out=$(cd "$(dirname "$out")" && pwd)/$(basename "$out")
cd "$(dirname "$0")"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

find src javakdb/src -name '*.java' | LC_ALL=C sort > "$work/sources"
javac --release 8 -encoding UTF-8 -nowarn -d "$work/jar" @"$work/sources"
cp -R src/. javakdb/src/. "$work/jar/"
mkdir -p "$work/jar/META-INF/javakdb"
cp javakdb/LICENSE "$work/jar/META-INF/javakdb/LICENSE"

rm -f "$out"
cd "$work/jar"
find . -type f | sed 's|^\./||' | LC_ALL=C sort > "$work/files"
jar --create --file "$out" --date=2026-09-28T00:00:00Z @"$work/files"
echo "built $out"
