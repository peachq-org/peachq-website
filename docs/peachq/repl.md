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

The editor offers inline completion suggestions.
History is saved in `.qhist` under your home directory, with a current-directory fallback
when no home directory is available. Enter `\?` for the help entry point.

## Syntax highlighting

The native terminal colours q as you type: builtin keywords, strings and their escapes,
comments, symbols, numbers, dates, times and nulls, operators, system names such as `.z.p`
and `-8!`, and `\` commands. With the cursor on or inside a bracket or quote, the matching
pair is highlighted too.

Colour depends only on the text you type. A builtin looks the same with or without its
namespace, so `count` and `.q.count` match. Your own variables are left uncoloured.

### Changing the colours

The palette is the dictionary `.pq.hl`, mapping each role to a colour:

| Role | Colours | Role | Colours |
|---|---|---|---|
| `kw` | keywords | `tmp` | dates, times, nulls |
| `str` | strings | `op` | operators and iterators |
| `esc` | string escapes | `sys` | system names |
| `cmt` | comments | `cmd` | `\` commands |
| `sym` | symbols | `match` | matching bracket or quote |
| `num` | numbers | | |

A value is a 256-colour index (0–255), or a terminal SGR string such as `"1;38;5;141"`
for bold or other effects. Set it in your `QINIT` startup file so it applies to every session:

```q
.pq.hl[`kw]:141          / keywords in violet
.pq.hl[`cmt]:"3;38;5;244" / comments in grey italics
```

Roles you don't set keep their defaults, and an invalid value falls back to its role's
default. `\?.pq.hl` shows the current reference. Reloading the standard library
(`\l pq`) resets the palette to the defaults.

### Turning colour off

Set `NO_COLOR` (any non-empty value) or `PEACHQ_COLORS=0` in the environment before
starting PeachQ. This turns off all console colour, including highlighting.
`PEACHQ_COLORS=1` forces colour on, even when `NO_COLOR` is set.

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
