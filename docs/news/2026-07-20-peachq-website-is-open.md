---
title: The PeachQ website is now open source
description: The site that documents PeachQ is now something you can contribute to.
---

# The PeachQ website is now open source

The site you are reading lives at
[peachq-org/peachq-website](https://github.com/peachq-org/peachq-website)
and accepts pull requests.

It is built with [MkDocs](https://www.mkdocs.org/) and
[Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) - the same
toolchain behind the kdb+ documentation, so it should feel familiar if you have
contributed there.

To fix a typo, use the edit link at the top of any page. To work locally:

```bash
git clone https://github.com/peachq-org/peachq-website
cd peachq-website
pip install -r requirements.txt
mkdocs serve
```

Everything under `docs/` is Markdown. Documentation, guides and news posts are
all welcome.
