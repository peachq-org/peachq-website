---
title: q code editors
description: Code editors and IDE plugins for q and kdb+, with a column showing which have been checked against PeachQ.
---

<!-- peachq: audience="You write q for PeachQ or kdb+ and want an editor with q highlighting, ideally one that can send queries to a running process." goal="Choose an editor from a current list, see whether its connection features have been checked against PeachQ, and follow the linked setup page." -->

# q and kdb+ code editors

One row per editor or plugin, in alphabetical order. Highlighting works on any
`.q` file and does not depend on the runtime, so highlighting-only plugins are
marked as such. Tools that connect to a process are marked **Yes** once they
have been run against PeachQ; a blank cell means no check has been made yet.

| Editor | Type | Source | Works with PeachQ |
|---|---|---|---|
| dqweb | Browser editor served by the q process itself | [adotsch/dqweb](https://github.com/adotsch/dqweb) | |
| Emacs | `q-mode`: editing plus an inferior q buffer | [psaris/q-mode](https://github.com/psaris/q-mode) | |
| JetBrains IDEs | KdbInsideBrains plugin: grammar, connections and a console | [kdbinsidebrains/plugin](https://github.com/kdbinsidebrains/plugin) | |
| Jupyter | `jupyterq` kernel runs q notebooks | [KxSystems/jupyterq](https://github.com/KxSystems/jupyterq) | |
| Neovim | `chili-neovim` with the `q-lang-server` language server | [jshinonome/chili-neovim](https://github.com/jshinonome/chili-neovim), [q-lang-server](https://pypi.org/project/q-lang-server/) | |
| Notepad++ | User-defined language file | [Setup steps and qlang.xml](https://www.timestored.com/kdb-guides/kdb-code-editors#notepad) | Highlighting only |
| [qStudio](qstudio.md) | Desktop IDE with server browser and charts; Windows, macOS, Linux | [timestored/qstudio](https://github.com/timestored/qstudio), Apache 2.0 | [Yes](qstudio.md) |
| Sublime Text | `sublime-q`: highlighting and send-to-process | [komsit37/sublime-q](https://github.com/komsit37/sublime-q) | |
| Vim | Syntax files | [katusk/vim-qkdb-syntax](https://github.com/katusk/vim-qkdb-syntax), [patmok/qvim](https://github.com/patmok/qvim) | Highlighting only |
| Visual Studio Code | KX `kdb` extension: highlighting, language server, connections and query results | [KxSystems/kx-vscode](https://github.com/KxSystems/kx-vscode) | |
| Visual Studio Code | `vscode-q`: highlighting, process management and query results | [jshinonome/vscode-q](https://github.com/jshinonome/vscode-q) | |

## Add or update an editor

Open a pull request against
[peachq-org/peachq-website](https://github.com/peachq-org/peachq-website) with
one row for your editor: its type, a public source link and what it does. To mark
it as working with PeachQ, say which PeachQ version you ran and what you did, so
the column stays a record of checks rather than a claim. Editor authors are
welcome to add a dedicated setup page like the qStudio one.

For libraries, frameworks and other q projects beyond editors, see the community
list [awesome-q](https://github.com/qbists/awesome-q).
