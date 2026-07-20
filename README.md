# peachq-website

This repository generates the public [peachq.org](https://peachq.org) website.

PeachQ itself — the open source implementation of q — lives at
[peachq-org/peachq](https://github.com/peachq-org/peachq).

## What is here

| | |
|---|---|
| `content/` | Markdown for [/docs](https://peachq.org/docs/) and [/news](https://peachq.org/news/), built with [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) |
| `static/` | The PHP pages at the site root — landing page, download, roadmap, about, REPL, compatibility and contact |
| `overrides/` | Material theme customisations, so the docs match the main site |
| `tools/` | Build and local preview scripts |

## Contributing

Contributions are welcome, and most need nothing but Markdown — use the edit
icon at the top of any docs or news page.

**See [CONTRIBUTING.md](CONTRIBUTING.md)** for the full guide: running the site
locally, adding a news post or documentation page, and how the two halves of the
site fit together.

```bash
git clone https://github.com/peachq-org/peachq-website
cd peachq-website
pip install -r requirements.txt
mkdocs serve
```

## How it deploys

Merges to `main` are built by GitHub Actions and published to the `built`
branch. The web server pulls that branch on a schedule — no credentials are
stored here, and nothing pushes to the server from CI.

## Licence

Site content is © the PeachQ project. PeachQ itself is MIT licensed.
