"""Exercise stable download redirects against PHP with isolated release fixtures."""
import http.client
import json
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import unittest
from urllib.parse import urljoin


ROOT = Path(__file__).resolve().parents[1]
ALIASES = {
    'peachq.zip': 'windows',
    'peachq-duckdb.zip': 'windows_duckdb',
    'peachq-mac-arm64.tar.gz': 'mac',
    'peachq-mac-arm64-duckdb.tar.gz': 'macos_duckdb',
    'peachq-linux-x64.tar.gz': 'linux',
    'peachq-linux-x64-duckdb.tar.gz': 'linux_glibc_duckdb',
}


class DownloadAliasesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.temp.cleanup)
        cls.root = Path(cls.temp.name)
        for prefix in ('', 'peachq'):
            target = cls.root / prefix
            (target / 'file').mkdir(parents=True)
            shutil.copy(ROOT / 'static/download-latest.php', target)
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            cls.port = sock.getsockname()[1]
        cls.server = subprocess.Popen(
            ['php', '-S', f'127.0.0.1:{cls.port}', '-t', str(cls.root),
             str(ROOT / 'tools/preview-router.php')],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        cls.addClassCleanup(cls.stop_server)
        for _ in range(100):
            try:
                with socket.create_connection(('127.0.0.1', cls.port), timeout=.1):
                    return
            except OSError:
                time.sleep(.05)
        raise RuntimeError('PHP preview server did not start')

    @classmethod
    def stop_server(cls):
        cls.server.terminate()
        cls.server.wait(timeout=5)

    def request(self, path, method='GET'):
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=5)
        try:
            conn.request(method, path)
            response = conn.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            conn.close()

    def test_aliases_follow_manifest_updates_at_root_and_mirror(self):
        for prefix in ('', '/peachq'):
            directory = self.root / prefix.lstrip('/') / 'file'
            for version in ('v1', 'v2'):
                files = {}
                for alias, key in ALIASES.items():
                    name = alias.replace('peachq', 'peachq-' + version, 1)
                    files[key] = {'name': name}
                    (directory / name).write_text(name)
                (directory / 'latest.json').write_text(json.dumps({'files': files}))
                for alias, key in ALIASES.items():
                    path = prefix + '/download/' + alias
                    for method in ('GET', 'HEAD'):
                        with self.subTest(prefix=prefix, version=version, alias=alias, method=method):
                            status, headers, body = self.request(path + '?platform=other', method)
                            self.assertEqual(status, 302)
                            self.assertIn('no-store', headers['Cache-Control'])
                            destination = urljoin(path, headers['Location'])
                            self.assertEqual(destination, prefix + '/file/' + files[key]['name'])
                            self.assertEqual(self.request(destination)[2].decode(), files[key]['name'])
                            if method == 'HEAD':
                                self.assertEqual(body, b'')

    def test_missing_invalid_and_unsafe_metadata(self):
        manifest = self.root / 'file/latest.json'
        for contents in (None, '{bad json', '{}', '{"files":{"windows":{"name":"https://example.com/x.zip"}}}',
                         '{"files":{"windows":{"name":"../outside.zip"}}}'):
            if contents is None:
                manifest.unlink(missing_ok=True)
            else:
                manifest.write_text(contents)
            status, headers, _ = self.request('/download/peachq.zip')
            self.assertEqual(status, 503)
            self.assertNotIn('Location', headers)
            self.assertIn('no-store', headers['Cache-Control'])
        self.assertEqual(self.request('/download/unknown.zip')[0], 404)
        self.assertEqual(self.request('/download-latest.php')[0], 404)
