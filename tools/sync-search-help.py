#!/usr/bin/env python3
"""Copy the committed builtin-help TSV; never import a dirty working copy."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, required=True, help='PeachQ source checkout')
parser.add_argument('--revision', default='HEAD', help='Committed source revision (default: HEAD)')
args = parser.parse_args()


def git(*arguments):
    return subprocess.check_output(['git', '-C', str(args.source), *arguments])


revision = git('rev-parse', '--verify', args.revision + '^{commit}').decode().strip()
source_path = 'lib/help-builtins.tsv'
data = git('show', revision + ':' + source_path)
licence = git('show', revision + ':LICENSE')
metadata = {
    'source_type': 'local-git-snapshot',
    'revision': revision,
    'path': source_path,
    'sha256': hashlib.sha256(data).hexdigest(),
    'license_path': 'LICENSE',
    'license_sha256': hashlib.sha256(licence).hexdigest(),
    'last_changed_revision': git('log', '-1', '--format=%H', revision, '--', source_path).decode().strip(),
}
destination = Path(__file__).resolve().parents[1] / 'data/help'
destination.mkdir(parents=True, exist_ok=True)
(destination / 'help-builtins.tsv').write_bytes(data)
(destination / 'LICENSE').write_bytes(licence)
(destination / 'source.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
print(f'Copied {source_path} from {revision}; review the snapshot and metadata before publication.')
