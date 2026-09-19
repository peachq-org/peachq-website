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
