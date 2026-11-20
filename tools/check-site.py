#!/usr/bin/env python3
"""Check that a deployed site serves its release downloads, browser runtime and article videos.

Expectations come from this source checkout, so no build is needed.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urljoin
from urllib.request import HTTPRedirectHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[1]
SECTIONS = ('releases', 'runtime', 'videos')
RUNTIME_FILES = ('worker.js', 'engine.js', 'duck-loader.js', 'peachq.wasm')


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


_opener = build_opener(_NoRedirect)


def fetch(url, method='HEAD'):
    """Return (status, headers, response) without following redirects; response is open for GET."""
    request = Request(url, method=method, headers={'User-Agent': 'peachq-check-site'})
    try:
        response = _opener.open(request, timeout=60)
    except HTTPError as error:
        return error.code, error.headers, None
    except (URLError, OSError) as error:
        return 0, {'error': str(error)}, None
    if method == 'HEAD':
        response.close()
        return response.status, response.headers, None
    return response.status, response.headers, response


def get(url):
    status, headers, response = fetch(url, 'GET')
    if response is None:
        return status, b''
    with response:
        return status, response.read()


def aliases():
    source = (ROOT / 'static/download-latest.php').read_text(encoding='utf-8')
    block = re.search(r'\$aliases = \[(.*?)\];', source, re.S).group(1)
    return dict(re.findall(r"'([^']+)'\s*=>\s*'([^']+)'", block))


def article_videos():
    return sorted({file for page in (ROOT / 'content').rglob('*.md')
                   for file in re.findall(r'src="/video/([^"/]+\.mp4)"', page.read_text(encoding='utf-8'))})


class Checker:
    def __init__(self, base, deep=False):
        self.base = base.rstrip('/') + '/'
        self.deep = deep
        self.failures = 0

    def url(self, path):
        return urljoin(self.base, path)

    def report(self, passed, label):
        print(('PASS  ' if passed else 'FAIL  ') + label, flush=True)
        self.failures += not passed
        return passed

    def exists(self, path, label=None):
        status, headers, _ = fetch(self.url(path))
        return self.report(status == 200, f'{label or path} ({status})')

    def manifest(self, path):
        status, body = get(self.url(path))
        try:
            data = json.loads(body) if status == 200 else None
        except ValueError:
            data = None
        self.report(data is not None, f'{path} parses as JSON ({status})')
        return data

    def releases(self):
        status, _ = get(self.url('download'))
        self.report(status == 200, f'download page ({status})')
        latest = self.manifest('file/latest.json')
        files = (latest or {}).get('files') or {}
        for key, entry in files.items():
            path = 'file/' + quote(entry['name'])
            status, headers, _ = fetch(self.url(path))
            length = headers.get('Content-Length')
            self.report(status == 200 and length == str(entry['bytes']),
                        f'{path} ({status}, {length} of {entry["bytes"]} bytes)')
            if self.deep and status == 200:
                self.report(self.sha256(path) == entry['sha256'], f'{path} sha256')
        for alias, key in aliases().items():
            path = 'download/' + alias
            status, headers, _ = fetch(self.url(path))
            location = headers.get('Location')
            target = urljoin(self.url(path), location) if location else None
            name = files.get(key, {}).get('name')
            expected = self.url('file/' + quote(name)) if name else None
            self.report(status in (301, 302, 303, 307) and expected and target == expected,
                        f'{path} redirects to {name} ({status} -> {location})')

    def sha256(self, path):
        digest = hashlib.sha256()
        status, _, response = fetch(self.url(path), 'GET')
        if response is None:
            return None
        with response:
            while chunk := response.read(1 << 20):
                digest.update(chunk)
        return digest.hexdigest()

    def runtime(self):
        manifest = self.manifest('wasm/latest/manifest.json') or {}
        names = [manifest.get('client')] + [s.get('script') for s in manifest.get('scripts', [])]
        for name in dict.fromkeys(names + list(RUNTIME_FILES)):
            self.exists(f'wasm/latest/{name}')

    def videos(self):
        for file in article_videos():
            path = 'video/' + file
            status, headers, _ = fetch(self.url(path))
            kind = headers.get('Content-Type', '')
            self.report(status == 200 and kind.startswith('video/mp4'), f'{path} ({status}, {kind})')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--base', required=True, help='site root URL, e.g. https://peachq.org')
    parser.add_argument('--only', action='append', metavar='SECTION',
                        help='comma-separated sections to check: ' + ', '.join(SECTIONS))
    parser.add_argument('--deep', action='store_true', help='download release archives and check sha256')
    args = parser.parse_args(argv)
    selected = [part for value in args.only or SECTIONS for part in value.split(',') if part]
    unknown = sorted(set(selected) - set(SECTIONS))
    if unknown:
        parser.error('unknown section: ' + ', '.join(unknown))
    checker = Checker(args.base, args.deep)
    for section in SECTIONS:
        if section in selected:
            print(f'--- {section} ---', flush=True)
            getattr(checker, section)()
    print('All passed' if not checker.failures else f'{checker.failures} failed')
    return 1 if checker.failures else 0


if __name__ == '__main__':
    sys.exit(main())
