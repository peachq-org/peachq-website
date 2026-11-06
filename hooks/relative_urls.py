"""Turn root-relative URLs in page content into page-relative ones.

Every link in this site is relative, so the whole thing can be served from a
subdirectory of another domain as well as from peachq.org -- see the note at the
top of static/.htaccess. The templates and Material's own output already comply.
Page *content* is the gap: a post that writes ``[the REPL](/repl)`` or embeds
``/img/foo.png`` produces a root-relative URL, which on the copy installed at
timestored.com/peachq points at somebody else's site.

Rewriting the rendered HTML rather than the Markdown keeps the source readable --
authors write ``/repl``, which is how the page is addressed, rather than counting
``../`` for their post's depth.
"""

import logging
import re
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

from mkdocs.plugins import event_priority

log = logging.getLogger('mkdocs.plugins.relative_urls')
_links = defaultdict(set)


class _References(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.urls = set()
        self.ids = set()
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if value is None:
                continue
            if name == 'id' or (tag == 'a' and name == 'name'):
                self.ids.add(value)
            if name in ('href', 'src', 'poster', 'data-cast') and value.startswith('/') and not value.startswith('//'):
                self.urls.add(value)


def on_config(config):
    # Hooks are reused by mkdocs serve; never retain links from a previous build.
    _links.clear()
    return config


# Uploaded straight to the server, so absent from the source and the build.
_SERVER_ONLY = ('/video/',)


def on_page_content(html, page, config, files):
    for url in _References(html).urls:
        if not url.startswith(_SERVER_ONLY):
            _links[url].add(page.file.src_uri)
    return html


def on_nav(nav, config, files):
    items = list(nav.items)
    while items:
        item = items.pop()
        items.extend(getattr(item, 'children', None) or [])
        url = getattr(item, 'url', None)
        if url and url.startswith('/') and not url.startswith('//'):
            _links[url].add('navigation')
    return nav


_REWRITE_ROUTES = {
    '/help.md': 'help.php',
    '/help.csv': 'help.php',
    **{'/download/' + alias: 'download-latest.php' for alias in (
        'peachq.zip', 'peachq-duckdb.zip',
        'peachq-mac-arm64.tar.gz', 'peachq-mac-arm64-duckdb.tar.gz',
        'peachq-linux-x64.tar.gz', 'peachq-linux-x64-duckdb.tar.gz',
    )},
}


def _target(path, static, site):
    """Resolve URLs against the static overlay and generated MkDocs output."""
    relative = path.lstrip('/')
    if '\\' in relative or '..' in Path(relative).parts:
        return None
    # Match the root PHP routes and explicit rewrites in static/.htaccess.
    route = _REWRITE_ROUTES.get(path)
    if route is None and re.fullmatch(r'/[A-Za-z0-9_-]+/?', path):
        route = relative.rstrip('/') + '.php'
    if route and (static / route).is_file():
        return static / route
    for root in (static, site):
        file = root / relative
        if file.is_file() and not path.endswith('/'):
            return file
        if file.is_dir():
            for index in ('index.php', 'index.html'):
                if (file / index).is_file():
                    return file / index
    return None


def _link_problem(url, static, site, anchors):
    parts = urlsplit(url)
    target = _target(unquote(parts.path), static, site)
    if target is None:
        return 'target is missing from the static routes and generated site'
    if parts.fragment and target.suffix == '.html':
        if target not in anchors:
            anchors[target] = _References(target.read_text(encoding='utf-8')).ids
        if unquote(parts.fragment) not in anchors[target]:
            return f"target has no anchor '#{parts.fragment}'"
    # PHP is not executed at build time, so its rendered anchors are not checked.
    return None


@event_priority(-110)
def on_post_build(config):
    # Run after docs_search (-100), which also supplies generated API assets.
    static = Path(config.config_file_path).parent / 'static'
    anchors = {}
    for url, sources in sorted(_links.items()):
        problem = _link_problem(url, static, Path(config.site_dir), anchors)
        if problem:
            log.warning("Root-relative link '%s' in %s: %s.", url,
                        ', '.join(sorted(sources)), problem)

# Only same-site absolute paths. `//host/path` is protocol-relative and belongs
# to another origin -- the Matomo snippet uses exactly that form -- so the
# negative lookahead on the second slash is load-bearing.
_ABSOLUTE_URL = re.compile(r'\b(href|src|poster|data-cast)="(/(?!/)[^"]*)"')


def on_post_page(output: str, page, config) -> str:
    # page.url is relative to the site root and ends in "/" for directory URLs,
    # e.g. "news/2026/07/20-announcing-peachq/". Its depth is how many "../" it
    # takes to get back to the root.
    prefix = "../" * (page.url.count("/") if page.url else 0)

    def relativise(match: "re.Match") -> str:
        # No normalisation: the target never contains "..", so concatenating is
        # exact, and it preserves the trailing slash that directory URLs need.
        return '{}="{}"'.format(match.group(1), prefix + match.group(2).lstrip("/"))

    return _ABSOLUTE_URL.sub(relativise, output)
