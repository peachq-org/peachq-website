#!/usr/bin/env python3
"""Split the built _chrome page into PHP header/footer partials.

Material renders _chrome.md into a full page whose content area holds a single
marker. Everything before the marker is the chrome that must precede page
content; everything after is what must follow it. Splitting there gives the PHP
escape-hatch pages the exact same shell as every generated page, with no
duplicated markup to drift.
"""
import pathlib
import re
import shutil
import sys

MARKER = "<!--PEACHQ-CHROME-SPLIT-->"
ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
SOURCE = SITE / "_chrome" / "index.html"
OUT = SITE / "partials"

if not SOURCE.is_file():
    sys.exit(f"error: {SOURCE} not found - run 'mkdocs build' first")

html = SOURCE.read_text(encoding="utf-8")
if html.count(MARKER) != 1:
    sys.exit(f"error: expected exactly one {MARKER}, found {html.count(MARKER)}")

header, footer = html.split(MARKER)


def rootify(fragment: str) -> str:
    """Rewrite _chrome's relative URLs as absolute ones.

    _chrome.md builds to /_chrome/index.html, so MkDocs emits paths relative to
    one directory deep ("../assets/..."). The PHP pages that consume these
    partials live at the site root, where "../" escapes the document root and
    every asset 404s. At exactly one level deep, "../X" always means "/X".
    """
    fragment = fragment.replace('href="../', 'href="/')
    fragment = fragment.replace('src="../', 'src="/')
    # Material emits a couple of paths through JS config rather than attributes.
    fragment = fragment.replace('"../assets/', '"/assets/')
    return fragment


header = rootify(header)
footer = rootify(footer)

# The canonical points at /_chrome/, a page that is deleted below. Leaving it in
# would tell search engines every PHP page is a duplicate of a 404.
header = re.sub(r'\s*<link rel="canonical"[^>]*>', "", header)

# Substitute the placeholders with PHP so callers supply per-page values.
header = header.replace("__PEACHQ_TITLE__", "<?= peachq_esc($title) ?>")
header = header.replace("__PEACHQ_DESC__", "<?= peachq_esc($description) ?>")

# _chrome.md is one specific page, so Material marked its nav entry active.
# Strip that; template.php sets the active item client-side instead.
header = re.sub(r"\s*md-nav__link--active", "", header)
header = re.sub(r"\s*md-tabs__link--active", "", header)

# Give peachq_page_end() somewhere to emit per-page <script> tags.
if "</body>" not in footer:
    sys.exit("error: no </body> in the footer half - Material layout changed?")
footer = footer.replace("</body>", "<?php peachq_emit_scripts(); ?></body>", 1)

OUT.mkdir(parents=True, exist_ok=True)
# No declare(strict_types=1) here: these are included from inside a function in
# template.php, and a declare must be a file's first statement.
(OUT / "header.php").write_text(header, encoding="utf-8")
(OUT / "footer.php").write_text(footer, encoding="utf-8")

shutil.rmtree(SITE / "_chrome")
print(f"wrote {OUT}/header.php and {OUT}/footer.php")
