#!/bin/sh
# Rebuild ../go-api-examples.zip (or the path given) with fixed timestamps and permissions.
set -eu

out=${1:-$(dirname "$0")/../go-api-examples.zip}
out=$(cd "$(dirname "$out")" && pwd)/$(basename "$out")
cd "$(dirname "$0")"

python3 - "$out" <<'PY'
import sys, zipfile
from pathlib import Path

files = sorted(p for p in Path('.').rglob('*') if p.is_file() and p.name != 'build.sh')
with zipfile.ZipFile(sys.argv[1], 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in files:
        info = zipfile.ZipInfo('go-api-examples/' + path.as_posix(), (2026, 10, 8, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, path.read_bytes())
PY
echo "built $out"
