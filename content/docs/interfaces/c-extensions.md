---
title: "C extensions with 2:"
description: Build a native C extension for PeachQ, load it with 2:, pass a vector and call back into q.
source_url: https://github.com/peachq-org/peachq-website/blob/9c216f39b564f3cb8dfe3aaa255ba656a4ebd61d/content/docs/peachq/c-extensions.md
source_revision: 9c216f39b564f3cb8dfe3aaa255ba656a4ebd61d
source_notes: Adapted tutorial and MIT-licensed C example, shortened around a worked build and load session. The C API header is downloaded from its upstream repository, not vendored.
---

<!-- peachq: audience="You are an intermediate q developer who can read basic C and wants to add a native extension; you may already use 2: in kdb+/q." goal="Build and load a C library in PeachQ, pass scalars and vectors, call back into q, and identify what to check when bringing an existing extension." -->

# C extensions with `2:`

<video class="peachq-video" controls preload="none" playsinline src="/video/c-extensions-HD.mp4" poster="/recordings/c-extensions/intro-frame.png"></video>

Build one C library and call its functions from PeachQ using `2:`. You'll add two
numbers, sum a vector and let C call a q function twice. If you already use `2:`
in q, this example shows the familiar loading expression and object interface in
a complete build-and-run session.

The three C entry points return `5`, `6.5` and `700`. The last is `7 * 10 * 10`, calculated
by a q callback invoked from C. See the [dynamic-load reference](../ref/dynamic-load.md)
and [C API reference](https://code.kx.com/q/interfaces/capiref/) for signatures;
this guide walks through their use. For C functions taking native values such as
`double` rather than `K` objects, see [FFI](../peachq/ffi.md).

## Build the extension

The commands below use Bash, `curl`, `tar` and GCC on Linux x86-64 with glibc.
Start in a fresh directory.

--8<-- "includes/linux-glibc.md"

```bash
mkdir peachq-c-demo && cd peachq-c-demo
curl -fL https://peachq.org/download/peachq-linux-x64-duckdb.tar.gz -o peachq.tar.gz
tar -xzf peachq.tar.gz
curl -fL https://raw.githubusercontent.com/KxSystems/kdb/master/c/c/k.h -o k.h
```

Create `add.c` with these three functions. You can also save the
[downloadable C source](examples/add.c), supplied under its
[MIT licence](examples/LICENSE-c-extensions.txt).

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

Compile it, then start PeachQ in the same directory:

```bash
gcc -shared -fPIC -DKXVER=3 add.c -o add.so
./q -q
```

`-shared` produces a shared library, `-fPIC` makes its code position-independent,
and `KXVER=3` selects the header's 64-bit object layout. There is no q library to
link: the running PeachQ executable supplies the C API symbols when it loads
`add.so`.

## Load and call a C function

At the q prompt:

```q
q)add:`:./add 2:(`add;2)
q)add[2;3]
5
```

The left operand names the library; omitting the suffix uses `.so` on Linux.
The pair on the right gives the exported C function name and its argument count:
`add` takes two `K` arguments. The returned function supports projection and
`each`, just like the q functions you already use:

```q
q)inc:add 1
q)inc each 1 2 3
2 3 4
```

Inside `add`, `-KJ` means a long atom and `x->j` reads its value. The constructor
`kj` allocates the long atom returned to q. The type checks run before either
value is read, so `add[2;3.5]` reports `'type` rather than treating a float as a
long. `krr("type")` creates that error.

These small arithmetic examples assume ordinary finite values. They do not
implement q's null, infinity or integer-overflow rules.

## Pass a vector to C

```q
q)total:`:./add 2:(`total;1)
q)total 1 2 3.5
6.5
```

`total` accepts a float vector, identified by the positive type tag `KF`. Its
length is `x->n`, and `kF(x)[i]` reads the element at index `i`. The loop sums
those elements into a C `double` (`F`), then `kf` returns a float atom to q.

The literal `1 2 3.5` is a float vector because it contains a float. An all-long
vector such as `1 2 3` fails this function's type check; use `1 2 3f` when you
want float input.

## Call q from C

```q
q)twice:`:./add 2:(`twice;2)
q)twice[{x*10};7]
700
```

`k(0, "{x x y}", ..., (K)0)` evaluates the q expression in the current process.
Here `x` is the function `{x*10}` and `y` is `7`. Read `{x x y}` as
`{x[x[y]]}`: the inner call produces `70`, and the outer call produces `700`.
The terminating `(K)0` ends the C argument list.

Incoming `K` arguments are borrowed. `k()` consumes the references passed to it,
so `r1(f)` and `r1(x)` acquire references for that call without giving away the
caller's references. The result of `k()` is returned directly to q. For other
extensions, return a newly allocated object or `r1(x)` if returning an incoming
argument; use `r0` only to release references you own.

This callback uses handle `0`. PeachQ's extension entry point currently rejects
a non-zero handle with `'nyi`; use q's [IPC facilities](../guides/interprocess-communication.md)
for remote requests.

## Bring an existing extension

The example demonstrates loading, projection, vector input and a q callback
using the `k.h` interface. Before using another extension:

- Match the operating system, architecture and header layout. The build above
  targets Linux x86-64 with `KXVER=3`.
- Inspect exports with `nm -D --defined-only myext.so` and dependencies with
  `nm -u myext.so`. C++ entry points need `extern "C"` to keep the names used by `2:`.
- Check code that reads object headers directly. In particular, do not assume
  raw reference counts match kdb+/q; prefer the `r1` and `r0` ownership operations.
- Run the extension's own tests, including errors, object lifetimes and callbacks.
  Successful use of this example does not establish compatibility for every C API call.

Restart PeachQ after rebuilding a loaded `.so`, so the next session uses the new
library. An error naming the entry point usually means the library opened but
that function was not found; inspect the exported names first.

## Thanks

Thanks to Michael Keenan for the initial code and core idea behind PeachQ's
`2:` support.
