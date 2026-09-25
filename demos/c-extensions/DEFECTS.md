# Current Linux extension-loading limitation

## CEXT-001: standard Linux download cannot load shared libraries

Reproduce with the public PeachQ v0.85 standard Linux archive:

```bash
gcc -shared -fPIC -DKXVER=3 add.c -o add.so
/path/to/standard/q check.q
```

Use `content/docs/peachq/examples/add.c`, the KX `k.h` header and this directory's
`check.q`. Expected: load `add.so` and print the results. Observed: exit 1 with
`'./add.so ./add.so` on the first loading expression. `file q` identifies this
executable as statically linked. The same library and check pass with the
v0.85 Linux glibc/DuckDB archive.

The recipe uses the glibc download. Developer action: clarify package capabilities
and consider an actionable error or a glibc package without DuckDB. This report
identifies a distribution limitation; it does not assert that static binaries
can implement dynamic loading unchanged.
