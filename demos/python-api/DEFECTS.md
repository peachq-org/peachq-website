# Python IPC integration issues

Developer handoff for public PeachQ v0.85, standard Linux x86-64 package.
The end-user page contains only current restrictions and workarounds.
No comparison run with another q runtime was performed.

## Run the upstream suites

Kola: Python 3.14.6, Kola 2.6.1 wheel, Polars 1.44.2 with `rtcompat`,
PyArrow 25.0.1, pytest 9.1.1. Checkout revision is recorded in README.md.
The wheel and checkout both declare version 2.6.1; the Rust core suite was
not run or rebuilt from source. The runner copies the Python tests to a temporary
directory, changes only their server fixture to use PeachQ and a free port,
and leaves every assertion unchanged. It replaces the upstream fixture's
kill-any-listener command with cleanup of its own process.

```bash
git clone https://github.com/jshinonome/kola /tmp/kola-checkout
git -C /tmp/kola-checkout checkout ff35ebb1b62decab0f6e036c42c59eb5494853f0
python -m pip install kola==2.6.1 'polars[rtcompat]==1.44.2' pyarrow==25.0.1 pytest
python demos/python-api/upstream-kola.py --checkout /tmp/kola-checkout --q /path/to/q
```

Result in Europe/London: **212 passed, 5 failed**. With `TZ=UTC`: **213 passed,
4 failed**. These include offline operator encoding tests as well as live IPC
tests; the count is not a count of distinct supported PeachQ features.

qPython: Python 3.11.15, NumPy 1.23.5, pandas 1.5.3, pytest 9.1.1.

```bash
git clone https://github.com/exxeleron/qpython /tmp/qpython-checkout
git -C /tmp/qpython-checkout checkout 7e64a28b1e8814a8d6b9217ce79bb8de546e62f3
python -m pip install numpy==1.23.5 pandas==1.5.3 pytest mock setuptools
cd /tmp/qpython-checkout
PYTHONPATH=. python -m pytest tests -q
```

Its four test modules execute checks during import. All four encounter errors,
so pytest stops during collection. These are offline tests against supplied IPC
fixtures and do not connect to PeachQ. The separate `check.py --client qpython`
live smoke test passes for arithmetic, a NumPy argument and a structured table.

## PYAPI-001: timespan vector literal rejected; function call reports badmsg

```bash
python demos/python-api/check.py --q /path/to/q --probe duration-literal
python demos/python-api/check.py --q /path/to/q --probe duration-match
```

The upstream expectation is a duration Series containing null, zero and
45,296,123,456,789 nanoseconds for `0N 0D00 0D12:34:56.123456789n`.
PeachQ returns `parse`. The same source fails when run directly as a q script,
so this is not just a Python conversion failure.

Calling `{x~0N 0D00 0D12:34:56.123456789n}` with that Series should return true;
instead it returns `badmsg` and the next request on that connection gets a
broken pipe. This accounts for two direct suite failures plus the following
time-list test's cascading failure. That time-list test passes in isolation:

```bash
python demos/python-api/upstream-kola.py --checkout /tmp/kola-checkout --q /path/to/q -k 'write_list and py_list13'
```

`check.py --probe duration` passes: sending the same duration Series to `{x}`
round-trips correctly. Investigate PeachQ parsing of the vector literal and
error handling when invalid function source arrives in an IPC argument list.

## PYAPI-002: scalar null date conversion depends on local timezone

```bash
TZ=Europe/London python demos/python-api/check.py --q /path/to/q --probe null-date
TZ=UTC python demos/python-api/check.py --q /path/to/q --probe null-date
```

The first raises `ValueError: year must be in 1..9999, not 0`; the second returns
`0001-01-01`, matching the upstream expectation. PeachQ's `-8!0Nd` is
`0x010000000d000000f200000080` (date atom, signed 32-bit minimum).

Kola's `py-kola/src/connector.rs` converts dates with `PyDate::from_timestamp`.
The underlying Python `datetime.date.fromtimestamp(-62135596800)` independently
raises the same error in Europe/London and succeeds in UTC. Evidence points
to the client's timezone-sensitive date conversion, rather than a PeachQ null
encoding defect. Workaround: start the Python process with `TZ=UTC`.

## PYAPI-003: qPython dependency and offline-suite failures

Python 3.14.6 / NumPy 2.5.3: all four modules fail collection because
`numpy.string_` was removed. qPython also references `numpy.bool`, removed in
NumPy 1.24. This occurs without a PeachQ process.

With Python 3.11.15 / NumPy 1.23.5 / pandas 1.5.3, collection still stops:

- `pandas_test.py`: `AttributeError: 'bool' object has no attribute 'to_numpy'`.
- `qreader_test.py`: temporal-null comparison fails, then diagnostic formatting
  raises `TypeError: %d format: a real number is required, not QTemporal`.
- `qtypes_test.py`: temporal-null conversion assertion fails.
- `qwriter_test.py`: `struct.error: 'i' format requires -2147483648 <= number <= 2147483647`.

The pandas error also reproduces on the live table query:

```bash
python demos/python-api/check.py --q /path/to/q --client qpython --probe pandas
```

Use the documented older environment and default NumPy results for the limited
qPython example. These failures do not establish a PeachQ runtime defect.

## Environment-only failure: DNS message wording

Kola's `test_io_error` expects `Name or service not known` for host `DUMMY`.
This VM returns `Temporary failure in name resolution`. No PeachQ connection
is made by that test. Do not count this as a PeachQ or protocol failure.
