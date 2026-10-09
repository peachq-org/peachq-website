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

Open <http://127.0.0.1:8000/docs/>. Pages reload as you save. PHP 8 CLI must
also be installed: documentation search uses the shared PHP help-index generator.
`mkdocs serve` downloads the current browser q runtime from peachq.org once at
startup and serves it locally for inline examples. Rebuilds reuse those files;
restart the server to fetch a new release. The files stay outside the source tree.

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

### Write for end users

Declare the intended reader's existing knowledge and concrete goal in a hidden
HTML comment near the top of every new or revised article, after its YAML front
matter. For example:

```html
<!-- peachq: audience="You know basic q and have used it for a few days or weeks, but are new to IPC." goal="Connect two processes and send queries and data between them." -->
```

The comment is hidden from rendered prose but visible in the public source.
Include no private information. Write the opening two or three sentences around
what that reader will do and learn. Keep the article focused on that task.

Explain how to use a feature, its prerequisites and its limitations. Keep project
history, import mechanics and contributor acknowledgements out of individual guides;
use source and sync notes and the Thanks page where appropriate.
Keep source and version records in front matter and the source and sync notes;
do not add a documentation-snapshot banner to each page. Preserve necessary
attribution and licences with the article or adapted source; put validation
results and runtime versions used for review in the PR description.

Keep guides, cookbooks and demos focused on learning, usage and worked examples.
Leave recording mechanics and unrelated REPL or platform limitations out of articles.
Put general requirements in reusable notices; explain a specific limitation only
where it affects the example being taught.
Where a library API reference exists, link to it near the top of the guide and
leave exact signatures, option lists and return specifications there.

Distinguish available features from experimental integrations and design previews.
An experimental integration can be usable while its behaviour is still evolving;
a planned feature must not read as a promise about the current release. Explain
runtime requirements where they affect the task, reusing shared notices where
possible. Avoid blanket browser-REPL caveats on unrelated examples.

Use meaningful example names and keep commands, outputs, downloadable examples
and recordings consistent. Include the setup readers need at the point it is
needed, then refer back to it instead of repeating it in the same session.
Propose screen clears in the recording outline and reserve them for major changes, such as switching APIs; ordinary sections should continue without clearing.

Keep Markdown useful on its own: name prerequisites in prose, use descriptive link
text and put example titles and checker markers in the documented hidden comments.
Do not rely on colours, icons or the rendered page to convey feature status.

### Preparing a pull request

Use the [PR checklist](.github/pull_request_template.md) and remove items that do
not apply. Describe the user-visible change, list the checks performed and report
anything that still needs maintainer review.

For every article PR, review the article against its declared audience
and goal. Check assumed knowledge, missing explanations, relevance to the task and
whether the examples deliver the promised outcome. Report findings and fixes, or
any outstanding gaps, in the PR description.

Run changed examples in the appropriate runtime and record its version in the PR.
Use the browser REPL for browser-supported features and the native executable for
native-only features. Transcripts use `q)` for entered commands followed by captured
output. A manual run does not qualify an example for the `runnable` marker; that
requires the C project's automated checker described below.

Preview changed pages, including tables, snippets and example controls. Check
changed links, anchors and assets, including links to any removed pages. Review
attribution and source records, and regenerate API documentation from its inputs
rather than editing generated HTML. Use the marked-section convention below for
PeachQ additions to reference pages.

## Generating the library API reference

Run the Bash script manually from this checkout (Java is assumed to be installed):

```bash
./tools/generate-qdocs.sh                 # official PeachQ main
./tools/generate-qdocs.sh --ref v0.84      # or a branch, tag or commit
./tools/generate-qdocs.sh --local-source ../rayforce/lib
```

The script downloads qStudio from `https://www.timestored.com/qstudio/files/beta/qstudio.jar`
only when `build/qdocs/cache/qstudio.jar` is missing. Delete that cached JAR to fetch
it again, or refresh the cache directly before generating:

```bash
mkdir -p build/qdocs/cache
curl -fsSL --retry 2 https://www.timestored.com/qstudio/files/beta/qstudio.jar \
  -o build/qdocs/cache/qstudio.jar.download &&
mv build/qdocs/cache/qstudio.jar.download build/qdocs/cache/qstudio.jar
```

Downloads and temporary generation files live under the ignored
`build/qdocs/` directory.

The requested ref is resolved to a commit in `peachq-org/peachq` on GitHub, and that
exact source archive is downloaded. The whole `lib/` folder is passed to qDoc, which
processes its `.q` files recursively. The local
C-project checkout is not used by default. With `--local-source DIR`, the script
instead snapshots `.q` files recursively from that directory, including local edits.
Relative paths resolve from the calling directory; `--ref` and `--local-source`
cannot be combined. Local generation records source file SHA-256 hashes in
`source.json`, and Source links point to that record rather than a GitHub revision.
The current qStudio CLI expects the output directory
first and input directory second.

Successful generation replaces `static/docs/api/`, including `source.json` with the
official source SHA or local source hashes. Failures before installation leave the existing docs intact.
Lint and metrics reports are included as HTML and CSV, linked from the API index footer;
generated `man.q` is not published. The script makes
small presentation changes. `tools/qdocs/integrate.php` reuses `static/template.php`
for the site header and footer, with API styles and mobile navigation in
`tools/qdocs/peachq-api.css` and `peachq-api.js`; edit those inputs rather than
hand-editing generated HTML. PHP is required for this integration, as for the site build.
The integration keeps `regexp.q` example links pointing at `../../repl?code=` to
preload them in the website editor without automatically executing them. Other
library examples have Copy buttons because those libraries are not available in
the browser REPL. This works on local previews and subdirectory installations too.
The source comments determine documentation
coverage, and the generator can list internal namespaces as well as public functions.

Review the generated diff and preview the Library API link under Docs. The local
watcher picks up the files; otherwise run `./tools/build.sh`. Keep the generated HTML,
CSS and source record with the website changes when committing is authorized. Normal
website builds and CI copy this snapshot without downloading source or running Java.
The generation script does not commit, push or publish anything.

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

### Server-only data

Four directories are **not** in this repo. A PeachQ release uploads the first
three straight to the server with `make q-upload`; maintainers upload article
videos separately, and MP4 files are never committed:

| Path | Contains | Used by |
|---|---|---|
| `/file/` | Release archives and `latest.json` | Download page version, names, checksums |
| `/wasm/latest/` | The WebAssembly runtime, its Worker and client, its example files and its manifest | The browser REPL |
| `/data/qdash/` | Conformance results | The compatibility chart |
| `/video/` | Article recordings as `NAME-HD.mp4` or `NAME-FHD.mp4` | [Article videos](#article-videos) |

The deploy excludes all four from `rsync --delete`, so publishing the website
can never remove a release or a video. Videos are served with a two-week
`Cache-Control` because a re-recorded video keeps its name.

Locally this means the compatibility chart is empty and the download page falls
back to a hardcoded version. To preview against the live data:

```bash
./tools/build.sh
./tools/dev-fixtures.sh     # pulls the real files from peachq.org
php -S 127.0.0.1:8000 -t site tools/preview-router.php
```

Fixtures land in `site/`, are never committed, and are wiped by the next build.

### Checking a deployed site

`tools/check-site.py` checks that a site serves what this checkout expects. It
reads the source tree, so it needs no build:

```bash
python3 tools/check-site.py --base https://peachq.org
python3 tools/check-site.py --base https://www.timestored.com/peachq --only releases,runtime
```

It prints one `PASS` or `FAIL` line per item and exits nonzero on any failure.

| Section | Checks |
|---|---|
| `releases` | `/download` loads; `file/latest.json` parses; each listed archive exists with the listed size; each stable alias in `static/download-latest.php` redirects to its archive. `--deep` also downloads the archives and compares SHA-256. |
| `runtime` | `wasm/latest/manifest.json` parses, and its client and scripts, `worker.js`, `engine.js`, `duck-loader.js` and `peachq.wasm` exist. |
| `videos` | Every article video marker's MP4 exists as `video/mp4`. |

CI runs the `videos` section against peachq.org before publishing, so an article
fails the build until its video has been uploaded. Avoid `--deep` against
production unless you need the checksums; it downloads every archive.

### Stable download URLs

The download page remains at `/download`. Scripts can use these aliases for
the current release; each responds with an uncached HTTP 302 redirect to the
versioned archive named in `file/latest.json`:

| Platform | Standard | With DuckDB |
|---|---|---|
| Windows x64 | `/download/peachq.zip` | `/download/peachq-duckdb.zip` |
| macOS Apple silicon | `/download/peachq-mac-arm64.tar.gz` | `/download/peachq-mac-arm64-duckdb.tar.gz` |
| Linux x64 | `/download/peachq-linux-x64.tar.gz` | `/download/peachq-linux-x64-duckdb.tar.gz` |

The Linux DuckDB archive requires glibc. For example:

```sh
curl -fLO https://peachq.org/download/peachq-duckdb.zip
```

Unknown aliases return 404; missing or invalid archive entries in the release
manifest return 503.
The uploader publishes the manifest after the archives, so these URLs need no
website change for a new release. Use versioned URLs and checksums when a script
must retrieve a fixed release. The aliases also work under a mirror's site prefix.

### Local Apache preview at peachq.me

On the development VM, the existing `peachq.me` Apache virtual host serves
`/srv/git/timestored.com/peachq.org/public_html/`. Start the local watcher with:

```bash
python3 tools/watch-preview.py
```

Open `http://peachq.me` on the host and refresh after saving edits. The watcher
waits for **10 seconds without edits** before rebuilding; each new edit resets
the timer. Set `--debounce 30` for a longer pause. The initial build and `--once`
build immediately. Edits made during a build are collected for the next build.

The watcher builds in a temporary directory, checks PHP syntax, then copies a successful
build into that local Apache directory. Failed builds leave the previous preview
in place. Local responses disable browser caching. This does not commit, push,
or change the GitHub publishing workflow.

PHP, CSS and JavaScript additions/edits reuse the last successful docs build;
documentation, build configuration and file deletions trigger a full build.
PHP syntax is checked with `php7.3` when installed, matching this VM's Apache;
set `PEACHQ_PREVIEW_PHP` to override the checker.

The watcher downloads REPL and release/compatibility fixtures on first use and
keeps them in `~/.cache/peachq-preview/fixtures`, outside build output. Article
videos come from `build/recordings/*.mp4` when present; otherwise each missing
video is downloaded once from peachq.org into the same cache. The preview never
deletes its `video/` directory. Stop the
watcher and restart with `--refresh-data` to refresh them, or use `--once` for
a single build. It requires the normal build dependencies, PHP and rsync.

When run as the local `peachq-preview` user service:

```bash
systemctl --user status peachq-preview
journalctl --user -u peachq-preview -f
systemctl --user restart peachq-preview
systemctl --user stop peachq-preview
```

The service is local to this VM and is not enabled at login by default. Use
`systemctl --user start peachq-preview` to start it again.

## Tests

```bash
./tools/build.sh
./tests/test_pages.sh
./tests/test_subdirectory.sh
```

`test_pages.sh` checks that the root pages keep the PeachQ design and do **not**
pick up Material's chrome, that the REPL, compatibility dashboard and contact
form survive the build, and that `/docs` and `/news` render as Material.

`test_subdirectory.sh` serves the same build from a document root, a subdirectory
and a symlinked subdirectory. It checks selected pages and their links in those
layouts. CI runs both shell suites on every pull request; these checks are not a
whole-site link or anchor audit and do not validate external URLs.

For changes to the local preview watcher, also run:

```bash
python3 -m unittest discover -s tests -p test_watch_preview.py
```

The watcher tests currently run separately from CI.

## Links must be relative

The site is served from two places: `peachq.org`, and `timestored.com/peachq`, a
mirror for the corporate networks that block domains they have not seen before.
There is no separate build for the mirror. The same output is served both ways,
which holds only while no URL names the site root:

* PHP pages: write `href="repl"`, not `href="/repl"`. Every page rendered
  through `template.php` is served at depth 0, so relative is unambiguous.
* Templates in `overrides/`: prefix with Material's per-page `{{ base_url }}`.
* Markdown in `content/`: write `/repl` as normal. `hooks/relative_urls.py`
  converts root-relative URLs in rendered pages to the right number of `../`.
* JavaScript: relative paths resolve against the `<base>` that `template.php`
  emits, so `fetch("file/latest.json")` is correct.

`test_subdirectory.sh` fails on the first URL that breaks this.

`hooks/relative_urls.py` validates root-relative Markdown links against the
generated site and `static/`, including extensionless PHP routes and anchors in
static HTML. Missing targets and HTML anchors fail strict builds. PHP pages are
not executed during this check, so their rendered anchors are not validated.
Keep the hook's explicit help/download routes in sync with `.htaccess` and
`static/download-latest.php`. After changing the hook, run
`python3 -m unittest discover -s tests -p test_relative_urls.py`.

## A note on pinned dependencies

`requirements.txt` pins `mkdocs<2.0` deliberately. MkDocs 2.0 removes the plugin
system and rewrites the theming system, which would break the blog plugin and the
`custom_dir` override this site uses. Do not unpin without running the tests
above.

### Updating PeachQ documentation

The C project's `user-docs/` owns behavioural documentation. Its derived website
pages live together in `content/docs/peachq/`. Preserve the KX-derived text in `basics/` and `ref/`; append PeachQ additions
using the convention below. Website
introductions and guides live alongside them, outside the set of derived pages.

The derived pages record their origin in front matter: `peachq_source` names the
`user-docs/` file and `peachq_revision` the C-project commit it was derived from.
To update a page:

1. Compare the recorded revision with the proposed C-project revision, particularly
   `user-docs/`, `CHANGELOG.md` and public behaviour touched by those changes.
2. Edit the website page to reflect the source at the new revision, keeping
   website adaptations such as status notes, links and runtime requirements.
3. Update `peachq_source` and `peachq_revision`, then review the page against the
   source at that revision. Keep source corrections in the C project; do not
   maintain a second behavioural specification here.
4. Build and check links, navigation and help lookup. The C project supplies and
   runs the executable documentation checker; this repository does not implement it.

Every fenced `q` example receives copy and play controls at build time, including
inherited reference examples; their source files are not rewritten. The play link
opens a new browser tab and preloads an editor tab named from the nearest heading
(or the page title). Override the name with a hidden comment immediately before
the fence: `<!-- peachq: title="Querying a table" -->`.

`<!-- peachq: runnable title="Querying a table" -->` means the example passes
the C project's automated code-block checker. Its play link executes it once the
runtime is ready. This marker records automated verification, not an editorial
judgment that a snippet looks executable. It does not promise browser compatibility: native-only
capabilities may produce an error in the current browser runtime. The C project
owns executable documentation checking. Do not mark incomplete snippets, syntax
templates, planned behaviour or output-only blocks runnable. The old `repl` keyword
is unnecessary (accepted for existing markers, but has no effect).

Unchanged examples are reused in the editor when opened again; edited tabs are
preserved. Copy retains the displayed block. Use `q)` prefixes for commands in session transcripts showing code already run,
with the captured output on the following lines. Omit the prompt in code-only examples
intended for the reader to run. For transcripts, the play link preloads only the
`q)` input lines and leaves output in the documentation. See the
[keyed-table example](content/docs/peachq/repl.md#reading-tables).


### Inline q examples

Place `<!-- peachq: inline -->` immediately before a fenced `q` block to add a
compact editable example with Run, Reset and output beneath it. Each run uses a
fresh browser q session: include all setup visibly in that block, with one complete
q expression per line. Use only
browser-supported examples and verify them against the current downloadable
runtime. Transcripts retain their checked output without JavaScript; the editor
contains only their `q)` command lines. This opt-in marker is independent of the
`runnable` verification marker. Existing ordinary q fences keep their REPL links.
The page downloads and compiles the current WebAssembly module once, then creates
a fresh instance for each run; q state is never reused. Reloading fetches the
current build. Shared implementation: `hooks/repl_examples.py`,
`content/js/inline-q.js`, `content/js/inline-q-worker.js` and `content/css/inline-q.css`. Browser checks: `node tests/test_inline_q.cjs` after
building and fetching current fixtures with `tools/dev-fixtures.sh`. The focused
`node tests/test_inline_q_cache.cjs` check covers module reuse, cancellation and
load-error retries.


### PeachQ-specific additions to reference pages

Place PeachQ-specific material in a separate section, either immediately after the
page title or below the existing reference text. Introduce it
with a descriptive heading and an info banner titled **PeachQ-specific additions**.
Keep the original reference text and attribution intact.

Wrap the entire addition in hidden HTML comments using this format:

```markdown
<!-- PEACHQ-SPECIFIC:BEGIN cmdline | version=0.84 | source=rayforce/q -h -->

## PeachQ-specific options

!!! info "PeachQ-specific additions"
    The options below extend the command-line reference above for PeachQ.

...additional documentation...

<!-- PEACHQ-SPECIFIC:END cmdline -->
```

Use a stable section identifier in both markers. Record the PeachQ version and
source actually reviewed; update these when reviewing the content against a newer
version. Add a source revision when available. These comments are hidden in the
rendered page, but remain public source metadata. Do not put private notes in them.
Find all additions with `rg 'PEACHQ-SPECIFIC:' content/`.

See [the command-line page](content/docs/basics/cmdline.md) for a section at the bottom
and [the system-command page](content/docs/basics/syscmds.md) for a section at the top.
Keep imported-guide source/version records in front matter and the sync notes;
do not add a documentation-snapshot banner to each page. Preserve necessary
attribution and licences with the article or adapted source; put validation
results and runtime versions used for review in the PR description.

### Documentation search

The docs header uses Material search, with case-sensitive q names and glyphs
shown first. `hooks/docs_search.py` builds `search/q_lookup.json` from the shared
help destinations and a checked-in builtin-description snapshot, and adds public
module/function entries from `static/docs/api/*.q.html` to Material's full-text
index. Overloaded glyphs lead to their multiple-meaning reference sections.
Namespace prefixes such as `.csv.` list matching API names. Both indexes refresh
with `mkdocs serve`, full builds and the watcher's static-only refresh.

`data/help/source.json` records the source revision and hash of
`data/help/help-builtins.tsv`. To resync from a reviewed PeachQ commit:

```bash
python3 tools/sync-search-help.py --source ../rayforce --revision COMMIT
./tools/build.sh
python3 -m unittest discover -s tests -p 'test_*.py'
```

The sync command reads committed content, not local edits. Review the description
and source-record diff together. Normal builds need neither the source checkout
nor a running q process. API entries refresh from the existing qDoc snapshot;
regenerate that snapshot separately when its source changes.

Python checks validate every added result's page/fragment and ensure repeated
index updates replace old API entries.

### Search caching

The search build emits content-hashed JSON indexes and JavaScript consumers.
Unchanged content retains its URL; changed indexes update the script URLs in
rendered pages. Keep the unhashed build inputs for static-only preview refreshes.
The pinned Material bundle's index URL is checked during the build; review this
integration when upgrading Material.

`static/.htaccess` is copied into the published site, including mirror installs.
It enables JSON gzip compression when Apache mod_deflate is available and gives
hashed search assets immutable caching. The local preview preserves this caching
while disabling caching for unversioned assets. Check actual response headers and
browser transfers when changing these rules; the PHP development server does not
apply `.htaccess`.

Against an Apache preview or deployed site, verify compression and cache reuse:

```bash
SEARCH_DELIVERY_URL=http://peachq.me node tests/test_search_delivery.cjs
```

This checks glyph and API results, hashed URLs, compressed responses and zero
index transfer on a second documentation page. Use the site's root URL, including
any mirror prefix. Leave browser caching enabled when checking transfers manually.

### Browser REPL sample files

Add files under `static/repl/files/`; the build generates `repl/files.json`
from that directory, with content hashes. No separate file
list needs updating. The static-only preview refresh regenerates it too.
The files mount lazily in `/home/q`, the session's start directory, next to the
examples PeachQ itself ships (`trades.q`, `csv.q`, `prices.csv`, `adverbs.q`):
`\ls` lists them all at once, and a file downloads only when q first reads it.
Keep this directory flat and never reuse a PeachQ example's file name or the
table it defines (`trades`, `prices`) — ours would silently shadow theirs. For
example, `static/repl/files/dowjones.q` loads with `\l dowjones.q`. Changes made
in that filesystem last for the current page session only.

The unmodified CSV and JSON samples were retrieved on 2026-09-20 from:

- <https://www.timestored.com/data/sample/dowjones.csv>
- <https://www.timestored.com/data/sample/price.json>

These are historical examples, not current market data. The two `.q` scripts
are website examples. Keep provenance notes here, outside the mounted directory.
To test against the current browser runtime after building, fetch development
fixtures and run `npm run test:repl`.

### REPL q console tests

Add a `.q` file under `tests/repl/`. Put each command on one line, followed by
its expected console output in `/=>` comments:

```q
answer:6*7
answer
/=> 42
```

A command without `/=>` lines must produce no output. For multiline output,
use one `/=>` line per output line, with a final bare `/=>` when output ends in
a newline (as with `show`). A lone bare `/=>` means empty output. Spaces after
the comment separator are significant. The files are also
valid q scripts that can be pasted into the REPL editor and run manually.

`npm run test:repl` discovers the files in filename order, types each command
into the console and compares the displayed output, including errors and
`show` output. Every file and command shares one initialized REPL session:
there is no reload or runtime reset between
q tests, so variables and filesystem changes persist. Use distinct variable
names or clean up your own state. Failures identify the q file,
line and command with the expected and actual output. The runner uses the local
WASM fixtures; it does not call a native q executable or mock evaluation.

### Article videos

Embed an article's recording with a standard `<video>` tag, where `NAME` is the
recording's folder under `content/recordings/` and the suffix is `HD` or `FHD`
to match the exported MP4:

```html
<video class="peachq-video" controls preload="none" playsinline src="/video/NAME-HD.mp4" poster="/recordings/NAME/intro-frame.png"></video>
```

Keep `preload="none"` so the video downloads only when played. URLs are made
relative, so the player works under a mirror's subdirectory. The MP4 itself is
uploaded to the server, not committed. `content/js/recordings.js` overlays a
large play button on the poster until the video first plays; without JavaScript
the plain player remains.

### Shared notices and conventions

Check this catalogue before introducing another notice or presentation pattern.
Reuse the shared source where one exists; keep article-specific qualifications
in the article. Add new reusable conventions here, not article work histories.

| Notice or convention | Source / instructions |
|---|---|
| Article audience and goal | Hidden `peachq: audience="..." goal="..."` comment; “Write for end users” above |
| Requires the Linux glibc build | `content/includes/linux-glibc.md`; include with `--8<-- "includes/linux-glibc.md"` |
| Requires a PeachQ download with DuckDB | `content/includes/duckdb-download.md`; include with `--8<-- "includes/duckdb-download.md"` |
| PeachQ-specific reference additions | “PeachQ-specific additions to reference pages” above; marked sections plus an info notice |
| Inline runnable q examples | `<!-- peachq: inline -->`; “Inline q examples” above |
| Article videos | `<video class="peachq-video" …>`; “Article videos” above, `content/js/recordings.js` and `content/css/recordings.css` |
| Terminal recordings (cast player, not used by current articles) | `.peachq-recording[data-cast]`; `content/js/recordings.js` and `content/css/recordings.css` |
| Mirror-site notice and URL handling | `static/mirror-banner.js` and `hooks/relative_urls.py` |
