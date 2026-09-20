"""Build q-aware lookup and add the checked-in API snapshot to Material search.

Also callable after a static-only preview refresh. No runtime/source checkout or
network access is needed. The help destination map remains shared with REPL help.
"""
import csv
import json
import re
import shutil
import subprocess
import sys
from collections import defaultdict
from html.parser import HTMLParser
from html import escape, unescape
from pathlib import Path

try:
    from mkdocs.plugins import event_priority
except ImportError:
    # The static-only watcher can use a different Python from the MkDocs CLI.
    def event_priority(_priority):
        return lambda function: function

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    """Read headings, IDs and qDoc content without navigation or footer text."""

    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.title = []
        self.blocks = []
        self.stack = []
        self.active = None
        self.heading = False
        self.in_title = False
        self.headings = {}
        self.current_heading = None
        self.in_permalink = False
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        if tag == 'a' and 'headerlink' in attrs.get('class', '').split():
            self.in_permalink = True
        if tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6') and 'id' in attrs:
            self.current_heading = {'id': attrs['id'], 'text': []}
        if tag == 'title':
            self.in_title = True
        if tag == 'div':
            self.stack.append(tag)
            if attrs.get('id') == 'headerDoc' or 'entity' in attrs.get('class', '').split():
                self.active = {'id': attrs.get('id', ''), 'title': [], 'text': [], 'depth': len(self.stack)}
                self.blocks.append(self.active)
        if self.active and tag == 'h2':
            self.heading = True

    def handle_endtag(self, tag):
        if tag == 'a':
            self.in_permalink = False
        if tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6') and self.current_heading:
            heading = self.current_heading
            self.headings[heading['id']] = plain(heading['text'])
            self.current_heading = None
        if tag == 'title':
            self.in_title = False
        if tag == 'h2':
            self.heading = False
        if tag == 'div' and self.stack:
            if self.active and self.active['depth'] == len(self.stack):
                self.active = None
            self.stack.pop()

    def handle_data(self, data):
        if self.current_heading and not self.in_permalink:
            self.current_heading['text'].append(data)
        if self.in_title:
            self.title.append(data)
        if self.active:
            self.active['text'].append(data)
            if self.heading:
                self.active['title'].append(data)


def plain(parts):
    return ' '.join(' '.join(parts).split())


def build(site, root=ROOT, strict=True):
    site = Path(site)
    path = site / 'search/search_index.json'
    index = json.loads(path.read_text(encoding='utf-8'))
    # Keep API destinations available with mkdocs serve as well as build.sh.
    shutil.copytree(root / "static/docs/api", site / "docs/api", dirs_exist_ok=True)
    # Replace rather than append: static-only refreshes can run repeatedly.
    index['docs'] = [d for d in index['docs'] if not d['location'].startswith('docs/api/')]
    topics_path = site / 'docs/help-index.json'
    topics_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['php', str(root / 'tools/build-help-index.php'),
                    str(root / 'content/docs'), str(topics_path)], check=True)
    topics = json.loads(topics_path.read_text(encoding='utf-8'))['topics']
    descriptions = defaultdict(list)
    with (root / 'data/help/help-builtins.tsv').open(encoding='utf-8') as source:
        for row in csv.reader((line for line in source if not line.startswith('# ')),
                              delimiter='\t', quoting=csv.QUOTE_NONE):
            if not row:
                continue
            if len(row) != 3:
                raise ValueError('Expected name, call and meaning in help-builtins.tsv')
            descriptions[row[0]].append(row[2])

    pages = {}
    entries = {}

    def page(relative):
        if relative not in pages:
            pages[relative] = Page((site / relative).read_text(encoding='utf-8'))
        return pages[relative]

    def add(name, location, title, text, kind, replace=False):
        if name in entries and not replace:
            raise ValueError('Duplicate q lookup name: ' + name)
        entries[name] = dict(name=name, location=location, title=title,
                             text=text, kind=kind)

    search_docs = {d['location']: d for d in index['docs']}
    for name, topic in topics.items():
        # Markdown index.md renders as the directory itself, not index/.
        topic_path = topic['path'].removesuffix('/index')
        relative = 'docs/' + topic_path + '/index.html'
        if not (site / relative).is_file():
            if strict:
                raise ValueError('Missing help destination: ' + relative)
            continue
        doc = page(relative)
        anchor = topic['anchor']
        # Some inherited headings have explicit anchors unlike their slugs.
        # Never emit a broken fragment from the legacy help map.
        if anchor not in doc.ids:
            anchor = '-' + anchor if '-' + anchor in doc.ids else ''
        location = 'docs/' + topic_path + '/' + ('#' + anchor if anchor else '')
        title = plain(doc.title).split(' | ')[0].removesuffix(' - PeachQ')
        section = search_docs.get(location)
        if section:
            title = unescape(re.sub(r'<[^>]+>', '', section['title']))
        add(name, location, title, '; '.join(descriptions[name]), 'Reference')

    for namespace, stem in [('.Q', 'dotq'), ('.h', 'doth'), ('.j', 'dotj'),
                            ('.z', 'dotz'), ('.m', 'dotm')]:
        add(namespace, 'docs/ref/' + stem + '/', namespace + ' namespace', '', 'Reference', replace=True)
    add('\\?', 'docs/basics/syscmds/#peachq-specific-commands',
        'PeachQ help', 'Show the help index in the REPL.', 'Reference', replace=True)

    # Broad glyph queries must expose overloads, not silently select one meaning.
    overloads = root / 'content/docs/ref/overloads.md'
    for glyph, label in re.findall(r'^## `([^`]+)` ([^\n]+)', overloads.read_text(encoding='utf-8'), re.M):
        glyph = glyph.replace('\\\\', '\\')
        heading = glyph + ' ' + label
        anchor = next((identifier for identifier, text in
                       page('docs/ref/overloads/index.html').headings.items()
                       if text == heading), None)
        if anchor is None:
            raise ValueError('Missing rendered overload heading: ' + heading)
        location = 'docs/ref/overloads/#' + anchor
        title = label + ' (multiple meanings)'
        text = '; '.join(descriptions[glyph])
        add(glyph, location, title, text, 'Reference', replace=True)
        add(label, location, title, text, 'Reference', replace=True)

    # Human-readable reference names, e.g. "file text", are exact aliases too.
    for name, entry in list(entries.items()):
        if '-' in name and not name.startswith('-'):
            alias = name.replace('-', ' ')
            entries.setdefault(alias, dict(entry, name=alias))

    for source in sorted((root / 'static/docs/api').glob('*.q.html')):
        doc = Page(source.read_text(encoding='utf-8'))
        location = 'docs/api/' + source.name
        for block in doc.blocks:
            module = block['id'] == 'headerDoc'
            title = source.name.removesuffix('.html') if module else plain(block['title'])
            name = source.name.removesuffix('.q.html') if module else title.split('[', 1)[0].strip()
            # qDoc includes implementation helpers: exclude them from discovery.
            if not name or name == '.i' or name.startswith('.i.'):
                continue
            text = plain(block['text'])
            target = location if module else location + '#' + block['id']
            index['docs'].append(dict(location=target, title=escape(title + ' — Library API', quote=False),
                                      text=escape(text, quote=False)))
            if not module:
                # API signatures supersede guide/reference aliases. Duplicate
                # API names in different modules are ambiguous and must fail.
                replace = entries.get(name, {}).get('kind') != 'Library API'
                add(name, target, title, text[:360], 'Library API', replace=replace)
    path.write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    # Retain source and licence notices alongside the published descriptions.
    shutil.copyfile(root / 'data/help/source.json', site / 'search/help-source.json')
    shutil.copyfile(root / 'data/help/LICENSE', site / 'search/help-LICENSE.txt')
    (site / 'search/q_lookup.json').write_text(json.dumps(
        {'version': 1, 'source': 'help-source.json', 'license': 'help-LICENSE.txt',
         'entries': list(entries.values())}, ensure_ascii=False,
        separators=(',', ':')) + '\n', encoding='utf-8')


@event_priority(-100)
def on_post_build(config):
    build(config.site_dir)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('usage: python3 hooks/docs_search.py SITE_DIR')
    build(sys.argv[1])
