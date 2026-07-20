<!--
Thanks for contributing to peachq.org.

Most PRs here are Markdown under content/ and need nothing but a spellcheck and
a read-through. Delete anything below that does not apply.
-->

## What this changes

<!-- One or two sentences. If it is a new page, say who it is for. -->

## Checklist

- [ ] **Spelling and grammar** read through once more
- [ ] **Links work** — internal links point at real pages, external links resolve
- [ ] **q examples run** — paste them into https://peachq.org/repl and check the output matches what the page claims
- [ ] **Appearance checked** — see below; CI attaches a preview build to every PR
- [ ] **Front matter present** — `title` and `description` on new pages
- [ ] **Added to the nav** — new docs pages need an entry in `mkdocs.yml`
- [ ] **News posts**: `date`, `categories` and `authors` set, and you are listed in `content/news/.authors.yml`

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
