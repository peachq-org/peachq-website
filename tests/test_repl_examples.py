"""Check REPL links using synthetic documentation, independent of page wording."""
from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class Links(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.examples = []
        self.inline = []
        self.fallback = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'div' and attrs.get('class') == 'peachq-inline':
            self.inline.append(attrs['data-code'])
        if tag == 'a' and attrs.get('class') == 'peachq-inline-fallback':
            self.fallback.append(attrs)
        if tag == 'a' and attrs.get('class') == 'peachq-repl-link':
            self.examples.append(parse_qs(urlsplit(attrs['href']).query))


class ReplExampleTests(unittest.TestCase):
    def test_only_marked_examples_autorun_and_transcripts_send_commands(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'docs').mkdir()
            (root / 'docs/index.md').write_text('''# Example links

<!-- peachq: runnable title="Marked fixture" -->
```q
1+1
```

<!-- peachq: title="Transcript fixture" -->
```q
q)sum 1 2 3
6
q)2+3
5
```

<!-- peachq: inline -->
```q
q)values:1 2 3
q)sum values
6
```

<!-- peachq: inline runnable -->
```q
1+2
```
''')
            (root / 'mkdocs.yml').write_text(json.dumps({
                'site_name': 'Fixture', 'docs_dir': 'docs', 'site_dir': 'site',
                'plugins': [], 'hooks': [str(ROOT / 'hooks/repl_examples.py')],
                'markdown_extensions': ['md_in_html'],
            }))
            result = subprocess.run(['mkdocs', 'build', '--strict'], cwd=root,
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            html = (root / 'site/index.html').read_text()
            links = Links(html)
            marked, transcript = links.examples
            self.assertEqual(links.inline, ['values:1 2 3\nsum values', '1+2'])
            self.assertEqual(len(links.fallback), 2)
            fallback = links.fallback[0]
            self.assertEqual(fallback['aria-label'], 'Open in REPL (new tab)')
            self.assertEqual(parse_qs(urlsplit(fallback['href']).query)['code'], ['values:1 2 3\nsum values'])
            self.assertNotIn('autorun', parse_qs(urlsplit(fallback['href']).query))
            runnable = links.fallback[1]
            self.assertEqual(runnable['aria-label'], 'Run in REPL (new tab)')
            self.assertEqual(parse_qs(urlsplit(runnable['href']).query)['autorun'], ['1'])
            self.assertIn('q)sum values', html)
            self.assertEqual(marked['autorun'], ['1'])
            self.assertEqual(marked['code'], ['1+1'])
            self.assertEqual(marked['title'], ['Marked fixture'])
            self.assertNotIn('autorun', transcript)
            self.assertEqual(transcript['code'], ['sum 1 2 3\n2+3'])
            self.assertEqual(transcript['title'], ['Transcript fixture'])


if __name__ == '__main__':
    unittest.main()
