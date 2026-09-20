---
title: The PeachQ REPL
description: Modern table display, terminal editing and the browser REPL.
---

# The PeachQ REPL

Use PeachQ interactively in a native terminal or in the [browser REPL](/repl).
Both evaluate q expressions. The native executable supplies the terminal editor;
the website supplies its own browser editor and controls.

## Reading tables

PeachQ's default native console separates table columns with vertical bars and shows
types under their names. Key columns have an equals-sign separator. A mixed column
has no single type label; values within it retain useful type distinctions.

This transcript shows a keyed table with a nested column. The `q)` prefix marks
the command entered; the lines below it are the output:

<!-- peachq: title="Keyed table" -->
```q
q)([instrument:`ALPHA`BETA]quantity:10 20;price:12.5 18.0;levels:(1 2;3 4))
| instrument | quantity | price | levels |
| symbol     | long     | float |        |
|============|----------|-------|--------|
| ALPHA      | 10       | 12.5  | 1 2    |
| BETA       | 20       | 18    | 3 4    |
```

The `instrument` column is the key; `quantity` is long and `price` is float.
The nested `levels` column contains a list in each row. Formatting depends on console
width and runtime version; the table's data does not depend on its presentation.

For mixed nested values:

<!-- peachq: title="Mixed nested values" -->
```q
q)([]name:`first`second;levels:(1 2;3 4f))
| name   | levels |
| symbol |        |
|--------|--------|
| first  | 1 2    |
| second | 3 4f   |
```

The float suffix helps distinguish the second row's values from integers.

The native `-classic` launch flag selects the legacy q-style table display and a
cleaner starting environment. It is not a switch that removes every language difference.
See [command-line options](../basics/cmdline.md#peachq-specific-options).

## Editing in the native terminal

History and line editing are built in; a separate `rlwrap` is unnecessary.

| Key | Action |
|---|---|
| Up / Down | Browse previous commands |
| Ctrl-R | Search command history |
| Home / End | Move to the beginning / end of the line |
| Ctrl-Left / Ctrl-Right | Move by word |
| Ctrl-W | Delete the word before the cursor |
| Ctrl-U | Clear the line |
| Tab | Complete a name |

The editor highlights q as you type and offers inline completion suggestions.
History is saved in `.qhist` under your home directory, with a current-directory fallback
when no home directory is available. Enter `\?` for the help entry point.

## In the browser

[Try Live](/repl) loads a WebAssembly runtime and evaluates expressions locally in your tab.
The browser page has its own editor; the native terminal shortcuts above are not a
promise about browser key bindings.

- Type a short expression at the console and press Enter.
- Open **Editor mode** for multiple lines and editor tabs.
- Use **Run line** (Ctrl-Enter) or **Run selection** (Ctrl-E).
- Use **Open** for example scripts, and workspace import/export to move your editor work.
- **Share latest** makes a link for the current expression or selected editor text.

The browser uses the published WASM runtime, which may differ from the source snapshot
behind these docs. Native FFI, host filesystem access and server processes require the
native executable. Every q example has copy and play controls. The play link opens a new REPL tab;
examples marked `runnable` (passing the automated code-block checker) execute
automatically after the runtime loads.
Other examples are preloaded for you to edit or run. A checked example may still
need capabilities absent from the browser runtime.
