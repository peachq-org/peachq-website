"""Validate links across the MkDocs output and PHP/static overlay."""
import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
HOOK = ROOT / 'hooks/relative_urls.py'
spec = importlib.util.spec_from_file_location('relative_urls', HOOK)
urls = importlib.util.module_from_spec(spec)
spec.loader.exec_module(urls)


class RelativeURLTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.static = self.root / 'static'
        self.site = self.root / 'site'
        self.static.mkdir()
        self.site.mkdir()
        for name in ('index.php', 'repl.php', 'download.php', 'help.php', 'download-latest.php'):
            (self.static / name).write_text('<?php ?>')
        (self.static / 'repl').mkdir()
        (self.static / 'docs/api').mkdir(parents=True)
        (self.static / 'docs/api/index.html').write_text('<h1>API</h1>')
        (self.static / 'docs/api/csv.q.html').write_text('<h2 id="-csv-read">Read</h2>')
        (self.site / 'docs/topic').mkdir(parents=True)
        (self.site / 'docs/topic/index.html').write_text('<h2 id="hello-world">Hello</h2>')
        (self.site / 'image.png').write_bytes(b'image')
        self.config = SimpleNamespace(config_file_path=str(self.root / 'mkdocs.yml'),
                                      site_dir=str(self.site))
        urls.on_config(self.config)

    def problem(self, url):
        return urls._link_problem(url, self.static, self.site, {})

    def test_php_routes_and_explicit_rewrites(self):
        for url in ('/', '/repl', '/repl/', '/download?source=docs',
                    '/repl#editor', '/help.md?q=asc', '/help.csv',
                    '/download/peachq-linux-x64.tar.gz'):
            with self.subTest(url=url):
                self.assertIsNone(self.problem(url))
        for url in ('/repll', '/download/unknown.zip', '/missing.html', '/repl.php/'):
            with self.subTest(url=url):
                self.assertIsNotNone(self.problem(url))
        (self.static / 'download-latest.php').unlink()
        self.assertIsNotNone(self.problem('/download/peachq-linux-x64.tar.gz'))

    def test_static_and_generated_html_anchors(self):
        for url in ('/docs/api/', '/docs/api/csv.q.html#-csv-read',
                    '/docs/topic/#hello%2Dworld', '/image.png'):
            with self.subTest(url=url):
                self.assertIsNone(self.problem(url))
        self.assertIn('anchor', self.problem('/docs/api/csv.q.html#typo'))
        self.assertIn('anchor', self.problem('/docs/topic/#typo'))

    def test_overlay_takes_precedence_and_cache_resets(self):
        anchors = {}
        url = '/docs/api/csv.q.html#-csv-read'
        self.assertIsNone(urls._link_problem(url, self.static, self.site, anchors))
        target = self.static / 'docs/api/csv.q.html'
        target.write_text('<h2 id="changed">Changed</h2>')
        self.assertIn('anchor', self.problem(url))
        (self.site / 'docs/api').mkdir(parents=True)
        (self.site / 'docs/api/csv.q.html').write_text('<h2 id="-csv-read">Old</h2>')
        self.assertIn('anchor', self.problem(url))

    def test_paths_cannot_escape_site(self):
        (self.root / 'outside.txt').write_text('outside')
        for url in ('/../outside.txt', '/%2e%2e/outside.txt', '/..%5coutside.txt'):
            self.assertIsNotNone(self.problem(url))

    def test_collects_only_root_relative_links_and_resets(self):
        page = SimpleNamespace(file=SimpleNamespace(src_uri='docs/test.md'))
        html = ('<a href="/repl?x=1&amp;y=2">REPL</a><img src="/image.png">'
                '<a href="//example.org/test">External</a><a href="relative.md">Local</a>')
        self.assertEqual(urls.on_page_content(html, page, self.config, []), html)
        self.assertEqual(set(urls._links), {'/repl?x=1&y=2', '/image.png'})
        urls.on_config(self.config)
        self.assertFalse(urls._links)

    def test_inline_cast_urls_are_rewritten_and_validated(self):
        page = SimpleNamespace(url='docs/guides/example/', file=SimpleNamespace(src_uri='docs/guides/example.md'))
        html = '<div class="peachq-recording" data-cast="/recordings/example/example.cast"></div>'
        urls.on_page_content(html, page, self.config, [])
        self.assertIn('/recordings/example/example.cast', urls._links)
        self.assertIn('data-cast="../../../recordings/example/example.cast"', urls.on_post_page(html, page, self.config))
        with self.assertLogs(urls.log, level='WARNING'):
            urls.on_post_build(self.config)

    def test_unknown_target_warns_even_for_imported_reference(self):
        page = SimpleNamespace(file=SimpleNamespace(src_uri='docs/ref/test.md'))
        urls.on_page_content('<a href="/repll">Typo</a>', page, self.config, [])
        with self.assertLogs(urls.log, level='WARNING') as logs:
            urls.on_post_build(self.config)
        self.assertIn('/repll', logs.output[0])

    def test_navigation_links_are_also_validated(self):
        nav = SimpleNamespace(items=[SimpleNamespace(children=[
            SimpleNamespace(url='/docs/api/'), SimpleNamespace(url='/typo'),
            SimpleNamespace(url='https://example.org/')])])
        self.assertIs(urls.on_nav(nav, self.config, []), nav)
        self.assertEqual(set(urls._links), {'/docs/api/', '/typo'})
        with self.assertLogs(urls.log, level='WARNING') as logs:
            urls.on_post_build(self.config)
        self.assertEqual(len(logs.output), 1)
        self.assertIn('navigation', logs.output[0])

    def test_mirror_rewriting_preserves_queries_and_fragments(self):
        page = SimpleNamespace(url='docs/ref/asc/')
        html = '<a href="/repl?code=asc#editor">Run</a><img src="//example.org/i.png">'
        output = urls.on_post_page(html, page, self.config)
        self.assertIn('href="../../../repl?code=asc#editor"', output)
        self.assertIn('src="//example.org/i.png"', output)

    def test_strict_build_accepts_valid_links_and_rejects_typos(self):
        docs = self.root / 'docs'
        docs.mkdir()
        config = dict(site_name='Test', docs_dir='docs', site_dir='site', plugins=[],
                      hooks=[str(HOOK)], validation={'links': {'absolute_links': 'ignore'}})
        Path(self.config.config_file_path).write_text(json.dumps(config))
        page = docs / 'index.md'
        for target, succeeds in (('/repl', True), ('/repll', False),
                                 ('/docs/api/csv.q.html#typo', False)):
            with self.subTest(target=target):
                page.write_text(f'# Test\n\n[Link]({target})\n')
                result = subprocess.run(['mkdocs', 'build', '--strict', '-f',
                                         self.config.config_file_path], capture_output=True, text=True)
                self.assertEqual(result.returncode == 0, succeeds, result.stderr)
                self.assertNotIn('contains an absolute link', result.stderr)
                if not succeeds:
                    self.assertIn('Root-relative link', result.stderr)
