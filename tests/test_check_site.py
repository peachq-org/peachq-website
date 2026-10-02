"""Run the site checker against a local mirror-style install built from fixtures."""
import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('check_site', ROOT / 'tools/check-site.py')
check_site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check_site)


class CheckSiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.temp.cleanup)
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            cls.port = sock.getsockname()[1]
        cls.server = subprocess.Popen(
            ['php', '-S', f'127.0.0.1:{cls.port}', '-t', cls.temp.name,
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

    def setUp(self):
        self.site = Path(self.temp.name) / 'peachq'
        shutil.rmtree(self.site, ignore_errors=True)
        (self.site / 'file').mkdir(parents=True)
        shutil.copy(ROOT / 'static/download-latest.php', self.site)
        (self.site / 'download.php').write_text('<?php echo "Download";')
        files = {}
        for key in check_site.aliases().values():
            name = f'peachq-v9-{key}.tar.gz'
            data = key.encode()
            (self.site / 'file' / name).write_bytes(data)
            files[key] = {'name': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
        (self.site / 'file/latest.json').write_text(json.dumps({'files': files}))
        runtime = self.site / 'wasm/latest'
        runtime.mkdir(parents=True)
        (runtime / 'manifest.json').write_text(json.dumps(
            {'client': 'client.js', 'scripts': [{'script': 'peachq.js'}]}))
        for name in ('client.js', 'peachq.js') + check_site.RUNTIME_FILES:
            (runtime / name).write_text(name)
        (self.site / 'video').mkdir()
        self.videos = check_site.article_videos()
        for name in self.videos:
            (self.site / 'video' / name).write_bytes(b'\0\0\0\x18ftypmp42')

    def run_check(self, *args):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            status = check_site.main(['--base', f'http://127.0.0.1:{self.port}/peachq', *args])
        return status, output.getvalue()

    def test_all_sections_pass_with_deep_hashes(self):
        status, output = self.run_check('--deep')
        self.assertEqual(status, 0, output)
        self.assertNotIn('FAIL', output)
        for section in check_site.SECTIONS:
            self.assertIn(f'--- {section} ---', output)
        self.assertEqual(output.count('redirects to'), len(check_site.aliases()))
        self.assertEqual(output.count('PASS  video/'), len(self.videos))

    def test_each_section_fails_when_an_item_is_removed(self):
        removals = {
            'releases': self.site / 'file/peachq-v9-mac.tar.gz',
            'runtime': self.site / 'wasm/latest/engine.js',
            'videos': self.site / 'video' / self.videos[0],
        }
        for section, path in removals.items():
            with self.subTest(section=section):
                self.assertEqual(self.run_check('--only', section)[0], 0)
                data = path.read_bytes()
                path.unlink()
                status, output = self.run_check('--only', section)
                path.write_bytes(data)
                self.assertEqual(status, 1)
                self.assertIn('FAIL  ' + str(path.relative_to(self.site)), output)

    def test_release_checks_detect_wrong_size_hash_and_redirect(self):
        manifest = self.site / 'file/latest.json'
        latest = json.loads(manifest.read_text())
        latest['files']['linux']['sha256'] = '0' * 64
        manifest.write_text(json.dumps(latest))
        self.assertEqual(self.run_check('--only', 'releases')[0], 0)
        self.assertIn('FAIL  file/peachq-v9-linux.tar.gz sha256', self.run_check('--only', 'releases', '--deep')[1])
        latest['files']['linux']['bytes'] += 1
        del latest['files']['windows']
        manifest.write_text(json.dumps(latest))
        status, output = self.run_check('--only', 'releases')
        self.assertEqual(status, 1)
        self.assertIn('FAIL  file/peachq-v9-linux.tar.gz', output)
        self.assertIn('FAIL  download/peachq.zip', output)

    def test_unknown_section_is_rejected(self):
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            self.run_check('--only', 'pages')


if __name__ == '__main__':
    unittest.main()
