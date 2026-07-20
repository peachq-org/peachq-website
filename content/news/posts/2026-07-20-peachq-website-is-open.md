---
date: 2026-07-20
categories:
  - Project
authors:
  - ryan
title: The PeachQ website is now open source
description: The docs and news for PeachQ are now something you can contribute to.
---

# The PeachQ website is now open source

The documentation and news you are reading live at
[peachq-org/peachq-website](https://github.com/peachq-org/peachq-website)
and accept pull requests.

<!-- more -->

They are built with [MkDocs](https://www.mkdocs.org/) and
[Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) — the same
toolchain behind the kdb+ documentation, so it should feel familiar if you have
contributed there.

To fix a typo, use the edit icon at the top of any page. To work locally:

```bash
git clone https://github.com/peachq-org/peachq-website
cd peachq-website
pip install -r requirements.txt
mkdocs serve
```

Everything under `content/` is Markdown. Guides, worked examples, migration notes
from kdb+ and news posts are all welcome.
