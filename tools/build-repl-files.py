#!/usr/bin/env python3
"""List all bundled REPL files; paths are relative to the virtual filesystem root."""
import hashlib
import json
from pathlib import Path
import sys


def build(site):
    directory = Path(site) / 'repl/files'
    files = []
    for path in sorted(directory.rglob('*')):
        if path.is_symlink():
            raise ValueError(f'REPL sample must not be a symlink: {path}')
        if path.is_file():
            files.append({'path': path.relative_to(directory).as_posix(),
                          'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    (directory.parent / 'files.json').write_text(json.dumps(files, indent=2) + '\n')


if __name__ == '__main__':
    build(sys.argv[1])
