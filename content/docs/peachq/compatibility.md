---
title: "PeachQ additions and compatibility"
peachq_source: user-docs/compatibility.md
peachq_revision: 49be5a234a51c44a393cf353c0ff0f3f85c9cc4c
---

# PeachQ additions and compatibility

!!! info "PeachQ documentation snapshot"
    Reviewed source: **0.84**, `49be5a234a51`. See [source and sync notes](sync.md). Feature-specific status notes below take precedence; this snapshot is not a claim that every example passes.

PeachQ builds on familiar q syntax with richer interactive tools, flexible data readers and connections to other systems. Start with the additions below, then review behaviour changes and unsupported features when bringing an existing application across.

## More with PeachQ

| Feature | What it adds |
|---|---|
| [REPL and table display](repl.md) | Built-in editing, history and a richer table display. |
| [Reading CSV — `.csv.read`, `.csv.info`](csv.md) | Type inference, quoting dialects, streaming targets, a reject channel. |
| [Reading JSON — `.j.read`, `.j.info`](json.md) | A reader beside kdb's `.j.k` converter: written forms, a table, a schema. |
| [The shared loader laws](loading.md) | What a cell means, the freeze, the error classes, the tolerance levers. |
| [Resources at a URL](handles.md) | A `` `: `` symbol can name a resource anywhere; `read0`, `read1` and qSQL resolve it. |
| [Regular expressions — `.regexp`, `rlike`](regexp.md) | RE2-backed matching, extraction, replacement and splitting. |
| [Typed parameters (design preview)](typed-parameters.md) | Declared types, optional arguments, defaults and varargs, read statically. |
| [Foreign functions — `.ffi`](ffi.md) | Call into a shared library from q. |
| [Startup evaluation — `-eval`, `-eval-before`](cmdline.md) | Run q text from argv after / before the startup script; no stdin piping. |
| [String helpers — `.str`](repl.md) | `printf`/`format`, strip, prefix and suffix tests, character-class predicates. |
| [DuckDB-backed storage — `.duckdb`](handles.md) | Query it from q, and reach Parquet and S3 through it. |
| [Parquet — `.parquet.read`, `.parquet.write`](parquet.md) | Read and write parquet through DuckDB; q types survive the round trip. |

Load the bundled library with `\l pq` for its namespaces. The native REPL, URL resources, `rlike` and startup evaluation do not need that step. Typed parameters are a **design preview**; the feature guide records which stages have not shipped. String helpers and DuckDB functions also have doc comments at the prompt: try `.str.printf` or `.duckdb.exec`.

## Behaviour changes

These choices make some operations behave differently from q. Check them when migrating code.

| Feature | What to expect |
|---|---|
| [Reserved words in name positions](#reserved-names) | Refused wherever a name is bound, not only at `name:`. |
| [`set` to a `.csv`/`.json`/`.txt`/`.xml`/`.xls`/`.parquet` path](#file-formats) | Writes that format, not the q binary form; `t` must be a table. |

<a id="file-formats"></a>

**`set` writes the format the suffix names.** `` `:f.csv set t `` writes CSV (the lines `save` writes),
`` `:f.parquet set t `` writes parquet, and so on for every `.h.tx` key, where kx writes the q binary form under any
name. The read side already worked that way (`` select from `:f.csv ``); the write side now matches it. A value that
is not a table signals `'type` under those endings; a path with no recognised ending is the binary form as in kx.
See [Handles and resources](handles.md) § Format inference and [Parquet](parquet.md).

**`get` reads the format the suffix names.** `` get `:f.csv `` (and `value`) answers the table `` select from `:f.csv ``
reads, for every ending `select from` speaks (`.csv .tsv .json .jsonl .ndjson .parquet`), where kx signals `'type`
for any file that is not a kdb+ data file. An error becomes a value, so no working kx program changes meaning. A path
with no recognised ending is the kdb+ file read as in kx; an ending with a writer and no reader (`.xml`, `.xls`,
`.txt`) is `'type` as in kx.

<a id="reserved-names"></a>

**Reserved words in name positions.** `([] null)`, `select null from t`, `{[null] null}` and `w[1] div:3` all signal
`'assign` where kx accepts them. Each was silently producing a broken table, or resolving to the keyword's own
function instead of the binding.

### Storage and memory use

**Splayed tables map at `get` and `\l`, and stay mapped.** `` get `:dir/ `` is the flip of `` cols!`:dir/ `` as in
kx — a table whose fixed-width columns are memory-mapped and whose compressed columns inflate a block on first
touch — and the maps live as long as the value does, so a table bound by `\l` holds its maps for the session.
`-3!t` prints `` +`a`b!`:dir/ ``, `flip t` is the dictionary, `value t` is the path, `.Q.qp t` is `0b`, and a table
derived from it (`select`, `1#`, `,`, `update` by value) is plain.

**Nested, string and enumerated columns are read into memory at `get`.** kx maps those lazily; peachq decodes them
when the table is opened, so a splayed table with large string, nested or `sym` columns costs memory at load time,
not at first touch. Fixed-width columns are mapped as in kx. The enumerated column stays an enumeration (`20h`),
and its domain file binds under its own name at `get`.

## Unsupported features

The following capabilities are unavailable or only partly implemented in this snapshot. The linked guides describe alternatives and per-option status.

| Feature | What to expect |
|---|---|
| [Partitioned and segmented databases](#partitioned-databases) | Do not load. Splayed tables do. |
| [Splayed and partitioned writing](#storage-writing) | Reading kx on-disk format is in scope; writing it is not. |
| [Pattern matching (kdb+ 4.1)](typed-parameters.md) | The 4.1 assignment and parameter forms signal `'parse`. |
| [System commands](syscmds.md) and [launch flags](cmdline.md) | Some are unwired or no-ops; both pages mark every item against kx. |

<a id="partitioned-databases"></a>

**Partitioned and segmented databases.** This is the largest single gap for an existing kdb+ installation: a
partitioned or segmented HDB does not load. Splayed tables do, including nested columns, attributes and kx
compression.

<a id="storage-writing"></a>

**Splayed and partitioned writing.** `.Q.dpft`, `dsave`, partitioned `set`, `save`'s binary arm, `rsave` and `-24!`
are unavailable. Flat `set`, `` `:dir/ set `` and `.z.zd` all work. For large local storage the route is the
`.duckdb` provider — see [Handles and resources](handles.md).

<a id="pattern-matching"></a>

**Pattern matching.** It will not be implemented; [typed parameters](typed-parameters.md) are the replacement for
the part of it that declares what a function accepts. Since there is no equivalent form to link to:

```q
(1 2):1 3                      / 'match in kx 4.1; 'parse here
c2f:{[x:tempCheck]32+1.8*x}    / runs tempCheck on entry in kx 4.1; 'parse here
```

Use `~` and a signal in place of the assertion forms, a declared type in place of an entry check where a type
suffices, and an ordinary check in the body where it does not.
