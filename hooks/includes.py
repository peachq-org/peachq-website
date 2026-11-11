"""Expand <!-- peachq: include="NAME" --> with static/includes/NAME.html.

The fragments are shared with the PHP pages, which resolve their site-relative
links against <base href="/">; here they are made root-relative so relative_urls
rewrites them for the page's depth.
"""
import re
from pathlib import Path

INCLUDES = Path(__file__).resolve().parent.parent / 'static' / 'includes'
_MARKER = re.compile(r'<!-- peachq: include="([a-z0-9-]+)" -->')
_LINK = re.compile(r'\b(href|src)="(?![a-z]+:|/|#)')


def _fragment(match):
    return _LINK.sub(r'\1="/', (INCLUDES / f'{match[1]}.html').read_text())


def on_page_markdown(markdown, page, config, files):
    return _MARKER.sub(_fragment, markdown)
