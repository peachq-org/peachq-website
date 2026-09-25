# embedPy recipe checks

Follow `content/docs/cookbook/embedpy.md` to install PeachQ, embedPy and the Python
dependencies in a fresh directory. With its virtual environment active, run:

```bash
python demos/embedpy/check.py --q /path/to/peachq/q --directory /path/to/peachq-python-demo
```

This runs the downloadable recipe script, compares its output and requires a
new PNG chart. It replaces `prices.png` in the selected demo directory.
`DEFECTS.md` contains reduced failures and the current workarounds.

## Sources

The recipe uses KX embedPy 1.5.0 from its Linux release archive. Preserve its
licence in the downloaded directory. The setup explicitly adapts its loader;
upstream `p.q`, `p.k`, binaries and tests are not vendored in this repository.
The q demo is website-authored and the image is its matplotlib output.

- https://github.com/KxSystems/embedPy/tree/1.5.0
- https://github.com/KxSystems/embedPy/blob/master/docs/README.md
- https://docs.scipy.org/doc/scipy-1.15.3/reference/generated/scipy.optimize.curve_fit.html

The two composition replacements in the setup adapt embedPy expressions into q.
The upstream Apache 2.0 licence is retained in `LICENSE-embedPy`; the page names
embedPy and makes the loader modifications explicit.
