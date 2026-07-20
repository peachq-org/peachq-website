# peachq-website

This repository generates the public [peachq.org](https://peachq.org) website.

PeachQ itself — the open source implementation of q — lives at
[peachq-org/peachq](https://github.com/peachq-org/peachq).

## How the site is put together

Three different things make up peachq.org:

| Part | What it is | Where it lives |
|---|---|---|
| **Markdown** | [/docs](https://peachq.org/docs/) and [/news](https://peachq.org/news/), built with [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) | `content/` in this repo |
| **PHP / HTML** | The pages at the site root — landing page, download, roadmap, about, REPL, compatibility and contact | `static/` in this repo |
| **Uploaded JSON** | Release metadata, conformance stats and the WebAssembly runtime | Not in this repo — pushed straight to the server by `make q-upload` when PeachQ is released |

The third part is why the download page always shows the current version and the
compatibility chart always shows current numbers without anyone editing this
repo: a release writes `/file/latest.json`, `/data/qdash/` and `/wasm/latest/`,
and the pages read them. Deploys never touch those paths.

`overrides/` holds Material theme customisations so the docs match the main
site, and `tools/` holds the build and local preview scripts.

## Contributing

**Markdown pull requests are what we are looking for.** Documentation, guides,
worked q examples, migration notes from kdb+ and news posts all live in
`content/` and need nothing but Markdown — no PHP, no Node, no build step. Use
the edit icon at the top of any docs or news page to open a PR in the browser.

Especially welcome:

- **Guides** for something you actually had to work out
- **Worked examples** in q, ideally ones that run in the [browser REPL](https://peachq.org/repl)
- **Migration notes** for people arriving from kdb+, particularly where PeachQ differs
- **Gotchas** you hit — the hardest pages to write and the most useful to read

Fixes to the PHP pages are welcome too, they are just a smaller part of the job.

**See [CONTRIBUTING.md](CONTRIBUTING.md)** for the full guide: running the site
locally, adding a news post or documentation page, and how the parts fit
together.

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
