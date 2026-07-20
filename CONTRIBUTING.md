# Contributing to the PeachQ website

The site has two halves:

| | Built with | Edit if you want to |
|---|---|---|
| `/docs` and `/news` | Markdown, MkDocs Material | **Write documentation or a news post — start here** |
| Everything at the root | PHP in `static/` | Change the landing page, download, roadmap, about, REPL, compatibility or contact |

Almost all contributions are the first row, and need nothing but Markdown.

## Quick edits

Use the edit icon at the top of any `/docs` or `/news` page to edit it on GitHub
and open a pull request. GitHub previews Markdown as you type.

## Working locally

```bash
git clone https://github.com/peachq-org/peachq-website
cd peachq-website
pip install -r requirements.txt
mkdocs serve
```

Open <http://127.0.0.1:8000/docs/>. Pages reload as you save.

Everything under `content/` is Markdown.

## Adding a news post

Create `content/news/posts/YYYY-MM-DD-short-title.md`:

```markdown
---
date: 2026-07-20
categories:
  - Project
authors:
  - ryan
title: Your headline
description: One sentence shown in search results and on the index.
---

# Your headline

The opening paragraph, shown as the excerpt on the news index.

<!-- more -->

The rest of the post.
```

The index, the date archive and category pages are generated automatically —
there is no list to update by hand. Add yourself to `content/news/.authors.yml`
first if you are a new author.

## Adding documentation

Create `content/docs/your-page.md` with a `title` and `description` in the front
matter, then add it to the `nav` in `mkdocs.yml`.

## The root pages

The landing page, download, roadmap, about, REPL, compatibility and contact are
PHP in `static/`, using the site's own `template.php`. They are deliberately a
separate design from the docs section — the same way `kx.com` and `code.kx.com`
differ.

`mkdocs serve` does not render them. To see the whole site together:

```bash
./tools/build.sh
php -S 127.0.0.1:8000 -t site
```

`static/email.php` handles the contact form. It relays through a mailer that
lives outside this repo, so it will not send mail locally — that is expected.

## Tests

```bash
./tools/build.sh
./tests/test_pages.sh
```

This checks that the root pages keep the PeachQ design and do **not** pick up
Material's chrome, that the REPL, compatibility dashboard and contact form
survive the build, and that `/docs` and `/news` render as Material. CI runs it on
every pull request.

## A note on pinned dependencies

`requirements.txt` pins `mkdocs<2.0` deliberately. MkDocs 2.0 removes the plugin
system and rewrites the theming system, which would break the blog plugin and the
`custom_dir` override this site uses. Do not unpin without running the tests
above.
