#!/usr/bin/env python3
"""Build the working tree for the local peachq.me Apache virtual host."""

import argparse
import fcntl
import os
import re
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
TARGET = Path('/srv/git/timestored.com/peachq.org/public_html')
CACHE = Path.home() / '.cache/peachq-preview'
WATCH = ('static', 'content', 'overrides', 'hooks', 'tools', 'data',
         'mkdocs.yml', 'requirements.txt')
PHP = os.environ.get('PEACHQ_PREVIEW_PHP', shutil.which('php7.3') or 'php')
VIDEO_SOURCE = 'https://peachq.org/video/'
VIDEO_SRC = re.compile(r'src="/video/([^"/]+\.mp4)"')


def snapshot():
    result = {}
    for name in WATCH:
        path = ROOT / name
        for item in path.rglob('*') if path.is_dir() else [path]:
            if item.is_file() and '__pycache__' not in item.parts:
                stat = item.stat()
                result[str(item)] = (stat.st_mtime_ns, stat.st_size)
    return result


def run(args, **kwargs):
    subprocess.run(args, cwd=ROOT, check=True, **kwargs)


def wait_for_changes(before, quiet_seconds):
    """Collect edits until files have stayed unchanged for the quiet period."""
    pending = before
    changed_at = None
    while True:
        time.sleep(1)
        current = snapshot()
        now = time.monotonic()
        if current != pending:
            pending = current
            changed_at = now
        if (pending != before and changed_at is not None
                and now - changed_at >= quiet_seconds):
            return pending


def download(url, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_suffix('.part')
    try:
        with urllib.request.urlopen(url, timeout=60) as response, partial.open('wb') as out:
            shutil.copyfileobj(response, out)
        partial.replace(destination)
    except OSError as error:
        partial.unlink(missing_ok=True)
        print(f'Video not available from {url}: {error}', flush=True)


def add_videos(output):
    """Prefer locally exported videos; otherwise use cached copies of the published ones."""
    exported = {path.name: path for path in (ROOT / 'build/recordings').glob('*.mp4')}
    for file in sorted({file for page in (ROOT / 'content').rglob('*.md')
                        for file in VIDEO_SRC.findall(page.read_text(encoding='utf-8'))}):
        cached = CACHE / 'fixtures/video' / file
        if file not in exported and not cached.is_file():
            download(VIDEO_SOURCE + file, cached)
        if file not in exported and cached.is_file():
            exported[file] = cached
    for file, source in exported.items():
        (output / 'video').mkdir(exist_ok=True)
        shutil.copy2(source, output / 'video' / file)


def sync_command(output):
    # Protect video/ so a build that could not fetch a video never removes a working copy.
    return ['rsync', '-rc', '--delete-delay', '--delay-updates', '--filter', 'P /video/***',
            str(output) + '/', str(TARGET) + '/']


def build(static_only=False):
    print('Building local preview...', flush=True)
    try:
        with tempfile.TemporaryDirectory(prefix='build-', dir=CACHE) as temp:
            output = Path(temp) / 'site'
            previous = CACHE / 'last-build'
            if static_only and previous.exists():
                shutil.copytree(previous, output)
                shutil.copytree(ROOT / 'static', output, dirs_exist_ok=True)
                run([sys.executable, str(ROOT / 'tools/build-repl-files.py'), str(output)])
                run([sys.executable, str(ROOT / 'hooks/docs_search.py'), str(output)])
            else:
                env = dict(os.environ, PEACHQ_BUILD_DIR=str(output))
                result = subprocess.run(['sh', 'tools/build.sh'], cwd=ROOT, env=env,
                                        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                        text=True)
                if result.returncode:
                    print(result.stdout, flush=True)
                    raise RuntimeError('Website build failed')
            # Catch PHP failures before replacing a working preview.
            for page in output.rglob('*.php'):
                run([PHP, '-l', str(page)], stdout=subprocess.DEVNULL)
            previous.mkdir(exist_ok=True)
            run(['rsync', '-rc', '--delete', str(output) + '/', str(previous) + '/'])
            for name in ('file', 'wasm', 'data'):
                source = CACHE / 'fixtures' / name
                if source.exists():
                    shutil.copytree(source, output / name, dirs_exist_ok=True)
            add_videos(output)
            with (output / '.htaccess').open('a') as config:
                config.write('\n# Local preview only: refresh unversioned assets; cache content-hashed search assets.\n'
                             '<IfModule mod_expires.c>\nExpiresActive Off\n</IfModule>\n'
                             '<IfModule mod_headers.c>\n'
                             'Header unset Expires\n'
                             'Header always set Cache-Control "no-store" env=!PEACHQ_SEARCH_CACHE\n'
                             'Header unset Cache-Control env=!PEACHQ_SEARCH_CACHE\n</IfModule>\n')
            TARGET.mkdir(parents=True, exist_ok=True)
            # No owner/mode changes: the target is a VirtualBox shared folder.
            run(sync_command(output))
        print('Updated http://peachq.me — refresh your browser.', flush=True)
        return True
    except (subprocess.CalledProcessError, OSError, RuntimeError) as error:
        print(f'Preview update failed: {error}', flush=True)
        return False


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--once', action='store_true', help='Build once and exit')
    parser.add_argument('--refresh-data', action='store_true',
                        help='Refresh cached production REPL and metadata')
    parser.add_argument('--debounce', type=int, default=10, metavar='SECONDS',
                        help='Wait for this many quiet seconds after edits (default: 10)')
    args = parser.parse_args()
    if args.debounce < 1:
        parser.error('--debounce must be at least 1 second')
    CACHE.mkdir(parents=True, exist_ok=True)
    with (CACHE / 'watch.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            parser.exit(1, 'A preview watcher is already running.\n')
        fixtures = CACHE / 'fixtures'
        if args.refresh_data or not fixtures.exists():
            fixtures.mkdir(exist_ok=True)
            run(['sh', 'tools/dev-fixtures.sh'],
                env=dict(os.environ, PEACHQ_FIXTURE_DIR=str(fixtures)))
        before = snapshot()
        success = build()
        if args.once:
            return 0 if success else 1
        print(f'Watching working files; rebuilding after {args.debounce} quiet seconds. '
              'Ctrl-C to stop.', flush=True)
        while True:
            stable = wait_for_changes(before, args.debounce)
            changed = set(before) ^ set(stable)
            changed.update(path for path in set(before) & set(stable)
                           if before[path] != stable[path])
            static_only = (all(Path(path).is_relative_to(ROOT / 'static')
                               for path in changed)
                           and not set(before) - set(stable))
            # On failure, require a full build next time; this also ensures
            # partially implemented changes cannot bypass documentation checks.
            success = build(static_only=static_only and success)
            before = stable


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        pass
