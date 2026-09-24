---
title: "C extensions with 2:"
description: Build and load k.h C extensions in PeachQ, manage object ownership, and call back into q.
peachq_source: user-docs/c-extensions.md
peachq_revision: 67c9201eaa849669fb302261b08f717d6d6a9094
---

# C extensions with `2:`

Call a C function as a q value, then let C call back into q. This example adds
numbers, sums a vector and applies a q function twice from C:

```text
5
6.5
700
```

The last result is `7 × 10 × 10`: a q callback invoked twice by the extension.
`2:` loads functions using the `K` object interface from `k.h`. For ordinary C
functions taking native arguments such as `double`, use [FFI](ffi.md).

## Run it

Use Linux x86-64 with glibc, Bash, `curl`, `tar` and GCC. Start in a fresh directory.
Choose PeachQ's **DuckDB/glibc package**: the standard static Linux download cannot
load shared libraries. This example does not use DuckDB.

```bash
set -euo pipefail
mkdir peachq-c-demo && cd peachq-c-demo
mkdir peachq
curl -fL https://peachq.org/download/peachq-linux-x64-duckdb.tar.gz | tar -xz -C peachq
curl -fL https://raw.githubusercontent.com/KxSystems/kdb/master/c/c/k.h -o k.h
cat > add.c <<'C'
#include "k.h"
K add(K x, K y) {
    if (x->t != -KJ || y->t != -KJ) return krr("type");
    return kj(x->j + y->j);
}
K total(K x) {
    if (x->t != KF) return krr("type");
    F s = 0;
    for (J i = 0; i < x->n; i++) s += kF(x)[i];
    return kf(s);
}
K twice(K f, K x) {
    return k(0, "{x x y}", r1(f), r1(x), (K)0);
}
C
gcc -shared -fPIC -DKXVER=3 add.c -o add.so
cat > demo.q <<'Q'
add:`:./add 2:(`add;2)
total:`:./add 2:(`total;1)
twice:`:./add 2:(`twice;2)
show add[2;3]
show total 1 2 3.5
show twice[{x*10};7]
Q
./peachq/q demo.q
```

The three output lines should match those above. The [downloadable C source](examples/add.c)
contains the same functions; its [MIT licence](examples/LICENSE.txt) is included.

## Build a shared library

The setup downloads the [KX C API header](https://github.com/KxSystems/kdb/blob/master/c/c/k.h).
Here is how the three functions use it:

```c
#include "k.h"

K add(K x, K y) {
    if (x->t != -KJ || y->t != -KJ) return krr("type");
    return kj(x->j + y->j);
}

K total(K x) {
    if (x->t != KF) return krr("type");
    F s = 0;
    for (J i = 0; i < x->n; i++) s += kF(x)[i];
    return kf(s);
}

K twice(K f, K x) {
    return k(0, "{x x y}", r1(f), r1(x), (K)0);
}
```

The examples accept long atoms for `add` and a float vector for `total`. A
negative type tag identifies an atom; the positive tag identifies a vector.
`x->n` is the vector length, and `kF(x)` accesses its float elements. `kj` and
`kf` allocate the returned atoms. These small examples do not implement q's
null, infinity or integer-overflow arithmetic rules.

Build the library:

```bash
gcc -shared -fPIC -DKXVER=3 add.c -o add.so
```

There is no q library to link here. The extension's C API references resolve
against the running PeachQ executable when the shared library loads. If your
extension uses other libraries, link those dependencies as usual. For C++, export
your entry points with `extern "C"` so their names can be found without C++ name
mangling.

## Load and call the functions

Start PeachQ in the directory containing `add.so`. At the q prompt:

```q
add:`:./add 2:(`add;2)
add[2;3]
```

Output:

```text
5
```

The left operand is a library file symbol. The right operand is a pair:
`(function-name;rank)`. Rank must be **1 through 8**, matching the number of `K`
arguments your C function accepts. Omitting the library suffix adds `.so` on
Linux.

The result supports projection and iteration:

```q
inc:add 1
inc each 1 2 3
```

```text
2 3 4
```

`type add` returns `112h`. Evaluating `add` displays its loading expression;
`value add` returns the library symbol, function symbol and rank.

The vector example returns a float atom:

```q
total:`:./add 2:(`total;1)
total 1 2 3.5
```

```text
6.5
```

`add[2;3.5]` signals `'type`, because the C entry point explicitly requires two
long atoms. `krr("text")` returns an error object that q reports as `'text`.

## Call back into q

`k(0, expression, ..., (K)0)` evaluates an expression in the running q process.
The terminating null pointer ends its argument list. In the example, `twice`
passes a q function and its argument to `{x x y}`, applying the function twice:

```q
twice:`:./add 2:(`twice;2)
twice[{x*10};7]
```

```text
700
```

Only handle `0` is supported by this C API entry point. A non-zero handle signals
`'nyi`; it cannot be used to send a remote IPC request from an extension.

## Object ownership and callbacks

Treat incoming arguments as borrowed references. Do not release them with `r0`.
Use `r1` to acquire a reference if you need to keep an object after the call.
Release references you own with `r0` when you no longer need them.

Return an owned reference to q: a newly allocated object, or `r1(x)` when
returning an incoming argument. The callback function `k()` takes ownership of
its arguments, which is why `twice` passes `r1(f)` and `r1(x)`.

Do not overwrite the header of a borrowed argument. In particular, the `t`, `a`
and `u` fields belong to a live PeachQ value. PeachQ's attribute bits are not
interchangeable with kdb+ attribute values. The reference-count convention also
differs: an exclusively held object's `r` is one higher than in kdb+. Code that
decides whether to copy based on that field needs review.

`sd1(fd, callback)` registers a readable file descriptor with q's event loop.
The callback runs on the main thread. An extension can use a descriptor to notify
q of work from a background thread; registering the callback is not permission
to evaluate q from that background thread. `sd0` and `sd0x` are also exported.
See the [C API reference](https://code.kx.com/q/interfaces/capiref/) for API
signatures and ownership conventions, together with the PeachQ limits here.

## How library lookup works

PeachQ searches for the library in this order:

1. The supplied path, relative to the current working directory when relative.
2. The Linux platform directory under `$QHOME/l64/`.
3. Beside the script performing the load.

The script-relative fallback lets a project ship its `.q` and `.so` together
and load from another working directory. Missing-library errors list the paths
tried. A library that opens but does not export the requested function signals
that function's name, such as `'nosuch`.

Libraries remain loaded for the life of the process. Start a new q session
after rebuilding a `.so`. Linux loading uses `RTLD_NOW`, so unresolved symbols
cause failure at load time.

## Port an existing extension

Keep the `.so` and loading expression, then check the extension's requirements:

- Match the Linux x86-64 platform and the `KXVER=3` layout. `KXVER=2` is unsupported.
- Check undefined symbols with `nm -u myext.so`. Each dependency must come from
  PeachQ's exported API or a library supplied by the extension or operating system.
- Check entry-point names with `nm -D --defined-only myext.so`.
- Run the extension's tests, including object lifetime, errors and callbacks.

See [Python with embedPy](../cookbook/embedpy.md) for an example using NumPy,
pandas, SciPy and matplotlib from q, with its required setup.

### Provided API symbols

The interface provides these API symbols. The boundary restrictions below still
apply to their arguments and results.

| Group | Symbols |
|---|---|
| Constructors and containers | `ka kb kg kh ki kj ke kf kc ks kd kz kt ktj ktn kp kpn knk ku ktd knt xD xT` |
| List building | `ja js jk jv` |
| Symbols and errors | `ss sn krr orr ee` |
| Lifetime and runtime utilities | `dl r1 r0 ymd dj setm m9 gc ver` |
| Event loop and evaluation | `sd1 sd0 sd0x k` |

Not provided by this interface: `b9`, `d9`, `dot`, `m4`, `okx`, `vi`, `vk`,
`vak`, `vaknk`, and the IPC client calls `khp`, `khpu`, `khpun`, `khpunc`,
`kclose`, `sslInfo`.

### Values crossing the boundary

Enumerations with types `20h`–`76h` do not cross this interface and signal `'nyi`.
Pass their underlying values instead, using `value` on the enumerated column.

The implementation shares underlying storage for supported flat data where its
layout permits. Symbols and container structures require adaptation; vectors
inside a container can remain shared. Slices may need materialization, and real
atoms and errors also require conversion. Do not assume every call is zero-copy.

A q function passed to C retains a function type and can be used in a callback
through `k(0, ...)`. Both dynamically loaded functions and foreign objects use
q type `112h`; the type alone does not distinguish them. A foreign object's
destructor runs when its last reference is released.

## Troubleshooting

| Symptom | Check |
|---|---|
| Error listing `.so` paths | File location, dependent libraries and required API symbols; inspect `nm -u` output |
| Error naming your function | The library opened, but the symbol was not found; check exported names and C++ linkage |
| `'rank` while loading | The rank must be 1–8 and should match the C function signature |
| `'type` from the example | `add` requires long atoms; `total` requires a float vector |
| `'nyi` in a call | Check for enumerations crossing the boundary or a non-zero `k()` handle |
| `'kapi bad-return: lib:fn` in a debug build | The return object failed runtime validation, such as an invalid tag, count or lifetime |
| Old behavior after rebuilding | Restart q; loaded libraries are not unloaded |

## What to keep in mind

You have built a shared library, loaded its functions into q and called back into
q from C. The same pattern lets an extension work with q arrays and functions.

- **Linux package:** use the glibc download above. A shared library cannot be
  loaded by the standard static executable.
- **ABI and dependencies:** match Linux x86-64 and `KXVER=3`; all dependent
  libraries and required API symbols must be available.
- **Ownership:** follow the reference-count rules above. An incorrect C pointer
  or lifetime can crash the process.
- **Boundary limits:** enumerations and the omitted API symbols listed above
  require another representation or approach.
- **Example arithmetic:** these small C functions do not implement q's null,
  infinity or integer-overflow rules.
- **Reloading:** restart q after rebuilding a loaded extension.
