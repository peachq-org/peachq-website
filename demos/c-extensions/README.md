# C extension recipe checks

Follow `content/docs/peachq/c-extensions.md` to download PeachQ and build `add.so`.
Then run:

```bash
python3 demos/c-extensions/check.py --q /path/to/peachq/q --directory /path/to/peachq-c-demo
```

The check compares C calls, projections, type display, vector summation, a q
callback and expected errors. `DEFECTS.md` describes the static-package limitation.

## Sources

The guide adapts PeachQ's `user-docs/c-extensions.md` at revision
`67c9201eaa849669fb302261b08f717d6d6a9094`. Source SHA-256:
`c28ee1f602191e770669e2c9e9461bc6ed11abc8c9090e522f972782cd89775e`.
The three example C functions come from that guide, with whitespace changes;
the MIT licence is retained in `content/docs/peachq/examples/LICENSE.txt`.
The page reorganizes this material as a complete setup followed by a walkthrough,
uses the glibc package and lists current boundary restrictions.

The KX `k.h` header is downloaded by the recipe, not vendored. KX's C API and
Using C/C++ functions pages supply interface context; their prose is not copied.
