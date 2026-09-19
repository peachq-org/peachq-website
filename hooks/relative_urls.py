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

import re

# Only same-site absolute paths. `//host/path` is protocol-relative and belongs
# to another origin -- the Matomo snippet uses exactly that form -- so the
# negative lookahead on the second slash is load-bearing.
_ABSOLUTE_URL = re.compile(r'\b(href|src)="(/(?!/)[^"]*)"')
_API_LINK = re.compile(r'(<a\b[^>]*\bhref="/docs/api/"[^>]*)>(.*?)</a>', re.DOTALL)


def on_post_page(output: str, page, config) -> str:
    # The generated reference has its own navigation; open its sidebar entry
    # directly in a new tab while retaining the current guide.
    def api_link(match: "re.Match") -> str:
        if 'md-nav__link' not in match.group(1):
            return match.group(0)
        return (match.group(1)
                + ' target="_blank" rel="noopener noreferrer"'
                + ' aria-label="Library API (opens in a new tab)">'
                + match.group(2)
                + '<svg width="12" height="12" viewBox="0 0 24 24"'
                + ' fill="currentColor" aria-hidden="true" focusable="false">'
                + '<path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42L17.59 5H14V3z'
                + 'M5 3h6v2H5v14h14v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5'
                + 'a2 2 0 0 1 2-2z"/></svg></a>')

    output = _API_LINK.sub(api_link, output)
    # page.url is relative to the site root and ends in "/" for directory URLs,
    # e.g. "news/2026/07/20-announcing-peachq/". Its depth is how many "../" it
    # takes to get back to the root.
    prefix = "../" * (page.url.count("/") if page.url else 0)

    def relativise(match: "re.Match") -> str:
        # No normalisation: the target never contains "..", so concatenating is
        # exact, and it preserves the trailing slash that directory URLs need.
        return '{}="{}"'.format(match.group(1), prefix + match.group(2).lstrip("/"))

    return _ABSOLUTE_URL.sub(relativise, output)
