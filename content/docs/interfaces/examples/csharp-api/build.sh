#!/bin/sh
# Rebuild ../csharp-api-examples.tar.gz (or the path given) from these sources.
set -eu

out=${1:-$(dirname "$0")/../csharp-api-examples.tar.gz}
out=$(cd "$(dirname "$out")" && pwd)/$(basename "$out")
cd "$(dirname "$0")"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

cp -R csharp-api-examples "$work/"
if command -v dotnet >/dev/null 2>&1; then
    DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1 dotnet build --nologo -v q "$work/csharp-api-examples" >/dev/null
    echo "dotnet build succeeded"
else
    echo "dotnet not found; the project was not compiled" >&2
fi

rm -f "$out"
find csharp-api-examples -type f \( -name '*.cs' -o -name '*.csproj' \) | LC_ALL=C sort > "$work/files"
tar --sort=name --mtime='2026-10-08 00:00:00Z' --owner=0 --group=0 --numeric-owner \
    -cf - -T "$work/files" | gzip -n > "$out"
echo "built $out"
