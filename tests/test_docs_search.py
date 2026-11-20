"""Check the generated indexes and their actual destinations after build.sh."""
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('docs_search', ROOT / 'hooks/docs_search.py')
search = importlib.util.module_from_spec(spec)
spec.loader.exec_module(search)


class SearchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.site = ROOT / 'site'
        cls.lookup = json.loads((cls.site / 'search/q_lookup.json').read_text(encoding='utf-8'))['entries']
        cls.entries = {e['name']: e for e in cls.lookup}
        cls.index = json.loads((cls.site / 'search/search_index.json').read_text(encoding='utf-8'))['docs']

    def test_exact_destinations(self):
        expected = {
            '-11!': 'docs/basics/internal/#-11-streaming-execute',
            '0:': 'docs/ref/file-text/', '1:': 'docs/ref/file-binary/',
            '.': 'docs/ref/overloads/#dot', '$': 'docs/ref/overloads/#dollar',
            '!': 'docs/ref/overloads/#bang', 'select': 'docs/ref/select/',
            '.csv.read': 'docs/api/csv.q.html#-csv-read',
            'file text': 'docs/ref/file-text/',
            '-p': 'docs/basics/cmdline/#-p-listening-port',
            '-P': 'docs/basics/cmdline/#-p-display-precision',
            '\\?': 'docs/basics/syscmds/#peachq-specific-commands',
        }
        for name, destination in expected.items():
            with self.subTest(name=name):
                self.assertEqual(self.entries[name]['location'], destination)
        self.assertNotEqual(self.entries['.Q.A']['location'], self.entries['.Q.a']['location'])
        for glyph in ['.', '#']:
            self.assertGreater(len(self.entries[glyph]['text'].split(';')), 1)

    def test_all_lookup_and_api_targets_exist(self):
        cache = {}
        targets = {e['location'] for e in self.lookup}
        targets.update(e['location'] for e in self.index if e['location'].startswith('docs/api/'))
        for target in targets:
            path, _, fragment = target.partition('#')
            file = self.site / path
            if path.endswith('/'):
                file /= 'index.html'
            with self.subTest(target=target):
                self.assertTrue(file.is_file())
                if fragment:
                    if file not in cache:
                        cache[file] = search.Page(file.read_text(encoding='utf-8')).ids
                    self.assertIn(fragment, cache[file])

    def test_every_help_topic_has_a_lookup_entry(self):
        topics = json.loads((self.site / 'docs/help-index.json').read_text(encoding='utf-8'))['topics']
        self.assertFalse(set(topics) - set(self.entries))

    def test_api_entities_not_navigation_or_internal_helpers(self):
        api = [e for e in self.index if e['location'].startswith('docs/api/')]
        self.assertGreater(len(api), 50)
        self.assertEqual(len(api), len({e['location'] for e in api}))
        entry = next(e for e in api if e['location'].endswith('csv.q.html#-csv-read'))
        self.assertIn('Load delimited text', entry['text'])
        self.assertNotIn('Early preview', entry['text'])
        self.assertFalse(any(e['title'].startswith('.i.') for e in api))
        self.assertTrue(any('&lt;' in e['text'] or '&gt;' in e['text'] for e in api))
        self.assertFalse(any('<script' in e['text'] for e in api))

    def test_snapshot_hash(self):
        metadata = json.loads((ROOT / 'data/help/source.json').read_text(encoding='utf-8'))
        self.assertEqual(metadata['sha256'], hashlib.sha256(
            (ROOT / 'data/help/help-builtins.tsv').read_bytes()).hexdigest())
        self.assertEqual(metadata['license_sha256'], hashlib.sha256(
            (ROOT / 'data/help/LICENSE').read_bytes()).hexdigest())
        self.assertEqual((self.site / 'search/help-LICENSE.txt').read_bytes(),
                         (ROOT / 'data/help/LICENSE').read_bytes())
        self.assertEqual(json.loads((self.site / 'search/help-source.json').read_text(encoding='utf-8')), metadata)

    def test_content_hashes_change_only_with_content(self):
        with tempfile.TemporaryDirectory() as temporary:
            site = Path(temporary)
            for directory in ('search', 'js', 'assets/javascripts', 'docs'):
                (site / directory).mkdir(parents=True)
            for name in ('search_index', 'q_lookup'):
                (site / 'search' / (name + '.json')).write_text('{}')
            (site / 'assets/javascripts/bundle.12345678.min.js').write_text(
                'fetch("search/search_index.json")')
            (site / 'js/docs-search.js').write_text('fetch("search/q_lookup.json")')
            html = site / 'docs/index.html'
            html.write_text('<script src="../assets/javascripts/bundle.12345678.min.js"></script>'
                            '<script src="../js/docs-search.js"></script>'
                            '<code>js/docs-search.js</code>')
            search.fingerprint_search(site)
            first = html.read_text()
            self.assertNotIn('bundle.12345678.min.js', first)
            self.assertNotIn('"../js/docs-search.js"', first)
            self.assertIn('<code>js/docs-search.js</code>', first)
            search.fingerprint_search(site)
            self.assertEqual(first, html.read_text())
            (site / 'search/search_index.json').write_text('{"changed":true}')
            search.fingerprint_search(site)
            self.assertNotEqual(first, html.read_text())
            for path in (site / 'search').glob('*.*.json'):
                self.assertEqual(path.name.split('.')[1],
                                 hashlib.sha256(path.read_bytes()).hexdigest()[:16])

    def test_rebuild_replaces_api_entries(self):
        with tempfile.TemporaryDirectory() as temporary:
            site = Path(temporary)
            (site / 'search').mkdir()
            # No reference pages needed to test API replacement independently.
            index = {'config': {}, 'docs': [
                {'location': 'docs/api/deleted.q.html', 'title': 'Stale API', 'text': ''},
                {'location': 'docs/', 'title': 'Docs', 'text': ''}]}
            (site / 'search/search_index.json').write_text(json.dumps(index), encoding='utf-8')
            # build reads the overload page; supply its real rendered snapshot.
            dest = site / 'docs/ref/overloads/index.html'
            dest.parent.mkdir(parents=True)
            dest.write_text((self.site / 'docs/ref/overloads/index.html').read_text(encoding='utf-8'), encoding='utf-8')
            search.build(site, strict=False)
            first = (site / 'search/search_index.json').read_bytes()
            search.build(site, strict=False)
            self.assertEqual(first, (site / 'search/search_index.json').read_bytes())
            self.assertNotIn(b'deleted.q.html', first)
            self.assertIn(b'"location":"docs/"', first)


if __name__ == '__main__':
    unittest.main()
