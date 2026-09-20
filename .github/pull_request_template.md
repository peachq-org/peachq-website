<!--
Thanks for contributing to peachq.org.

Use the checklist alongside CONTRIBUTING.md. Delete items that do not apply.
If you cannot perform a check, say what still needs maintainer review.
-->

## What this changes

<!-- One or two sentences. If it is a new page, say who it is for. -->

## Checklist

- [ ] **Content:** Concise, accurate and written for users. Feature status and native/browser requirements are clear.
- [ ] **API documentation:** Guides explain usage and link to the API reference for exact specifications.
- [ ] **Examples:** Checked in the appropriate runtime. Transcripts use `q)` and show actual output; `runnable` markers require the automated verification described in CONTRIBUTING.
- [ ] **PeachQ additions:** Use the banner and matching `PEACHQ-SPECIFIC:BEGIN/END` comments, recording the reviewed version and source.
- [ ] **Navigation and links:** New pages have a `title`, `description` and navigation entry. Changed links, anchors and assets resolve; removed pages leave no broken internal links.
- [ ] **Preview:** Changed pages render correctly, including tables, snippets and example controls. Any visual review still needed is noted below.
- [ ] **Sources:** Attribution and source records are preserved. Generated API changes come from the generator inputs.
- [ ] **News posts:** `date`, `categories` and `authors` are set, and authors are listed in `content/news/.authors.yml`.

## Validation

<!-- List checks performed and their results. For q examples, identify the runtime
and version used. Note anything not checked or needing maintainer review.
CI covers selected pages and links; it is not a whole-site link audit. -->

## Checking how it looks

`mkdocs serve` renders `/docs` and `/news` locally with live reload:

```bash
pip install -r requirements.txt
mkdocs serve
```

To see the whole site, including the PHP pages at the root:

```bash
./tools/build.sh
./tools/dev-fixtures.sh    # pulls live release data so the REPL and charts work
php -S 127.0.0.1:8000 -t site tools/preview-router.php
```

If you cannot run either, that is fine — CI builds every PR and attaches the
rendered site as a downloadable `site-preview` artifact under the **Checks**
tab. Say so in the PR and a maintainer will look.

## Licence

By opening this pull request you agree your contribution is published under
[CC BY 4.0](../LICENSE).
