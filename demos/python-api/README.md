# Python IPC checks

`check.py` starts a supplied PeachQ executable on a free local port, checks
actual values and terminates only its own server. It returns nonzero on failure.

```bash
python -m pip install kola 'polars[rtcompat]'
python demos/python-api/check.py --q /path/to/peachq/q
```

For qPython, use Python 3.11 with NumPy 1.23.5 and qPython 2.0.0:

```bash
python demos/python-api/check.py --q /path/to/peachq/q --client qpython
```

See `DEFECTS.md` for focused failing probes and upstream suite commands.
No q executable, third-party client source or generated outputs are vendored.

## Sources

The website example and checker were written for this repository. The client
comparison and query/upload/result structure take inspiration from the
[TimeStored Python API guide](https://www.timestored.com/kdb-guides/python-api),
with the owner's permission. No historical performance claims were reused.
Client APIs and test expectations were inspected in:

- [exxeleron/qpython](https://github.com/exxeleron/qpython), Apache-2.0,
  revision `7e64a28b1e8814a8d6b9217ce79bb8de546e62f3`.
- [jshinonome/kola](https://github.com/jshinonome/kola), BSD-3-Clause,
  revision `ff35ebb1b62decab0f6e036c42c59eb5494853f0`.
