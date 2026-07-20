# Contributing to the PeachQ website

Everything under `docs/` is Markdown. You do not need PHP or Node to contribute.

## Quick edits

Use the pencil icon at the top of any page to edit it on GitHub and open a pull
request. GitHub previews Markdown as you type.

## Working locally

```bash
git clone https://github.com/peachq-org/peachq-website
cd peachq-website
pip install -r requirements.txt
mkdocs serve
```

Open <http://127.0.0.1:8000>. Pages reload as you save.

## Adding a news post

Create `docs/news/YYYY-MM-DD-short-title.md`:

```markdown
---
title: Your headline
description: One sentence shown in search results.
---

# Your headline

Your post.
```

Then add a line to `docs/news/index.md`.

## The PHP pages

`repl.php`, `compatibility.php` and `contact.php` are hand-written PHP because
they need a live WebAssembly runtime, a generated dashboard, and a form handler
respectively. They are the only pages that are not Markdown.

They share the site header and footer automatically: `tools/split_chrome.py`
extracts those from the Material theme at build time, so there is no second copy
to keep in sync.

`mkdocs serve` does not render them. To see them:

```bash
./tools/build.sh
php -S 127.0.0.1:8000 -t site
```

## Tests

```bash
python3 tests/test_chrome_split.py   # chrome extraction is sound
./tests/test_pages.sh                # PHP pages render with Material chrome
```

CI runs both on every pull request.

## A note on pinned dependencies

`requirements.txt` pins `mkdocs<2.0` deliberately. MkDocs 2.0 removes the plugin
system and rewrites the theming system, which would break the `custom_dir`
overrides this site depends on. Do not unpin without running the tests above.
