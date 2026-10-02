---
title: Query PeachQ from Python
description: Upload a Polars DataFrame, aggregate it in PeachQ and bring the result back to Python with Kola.
---

# Query PeachQ from Python

<video class="peachq-video" controls preload="none" playsinline src="/video/python-api-FHD.mp4" poster="/recordings/python-api/intro-frame.png"></video>

Watch Kola and qPython connect to PeachQ, followed by Kola's compatibility tests.
Use the player's fullscreen control for a larger view, or
[download the terminal recording](/recordings/python-api/python-api.cast).
Curl download waits are shortened.

Send a Python DataFrame to PeachQ. Group the trades in q. Get a Polars DataFrame
back, ready for your next calculation or chart.

```text
sym   volume  notional
AAPL      30    3200.0
MSFT       5    1000.0
```

## Clients

Both clients connect to a separate PeachQ process over q IPC.

| Client | Python data | When to use it |
| --- | --- | --- |
| [Kola](https://github.com/jshinonome/kola) | Polars DataFrames and Series | Start here for a new project. Requires Python 3.10 or newer. |
| [qPython](https://github.com/exxeleron/qpython) | NumPy arrays and structured arrays | Existing qPython code with older dependencies. See the restrictions below. |

These clients send queries from Python to q. Calling Python *from* q is a
different workflow: use [embedPy](https://github.com/KxSystems/embedPy).

## Kola

Use Linux x86-64, Bash, `curl`, `tar`, and Python 3.10 or newer with `venv` and `pip`.
Start in a fresh directory. The server runs in one terminal; Python connects
from another.

**Terminal 1: download and start PeachQ:**

```bash
mkdir peachq-python-api && cd peachq-python-api
mkdir peachq
curl -fL https://peachq.org/download/peachq-linux-x64.tar.gz | tar -xz -C peachq
./peachq/q -p 5010
```

**Terminal 2: install Kola and run the example:**

```bash
cd peachq-python-api
python3 -m venv .venv
. .venv/bin/activate
python -m pip install kola 'polars[rtcompat]'
python - <<'PY'
import polars as pl
from kola import Q

trades = pl.DataFrame({
    'sym': ['AAPL', 'MSFT', 'AAPL'],
    'price': [100., 200., 110.],
    'size': [10, 5, 20],
}).with_columns(pl.col('sym').cast(pl.Categorical))

q = Q('127.0.0.1', 5010)
q.connect()
try:
    q.sync('set', 'trade', trades)
    assert q.sync('count trade') == 3
    result = q.sync('0!select volume:sum size,notional:sum price*size by sym from trade')
    assert result.to_dicts() == [
        {'sym': 'AAPL', 'volume': 30, 'notional': 3200.},
        {'sym': 'MSFT', 'volume': 5, 'notional': 1000.},
    ]
    print(result)
finally:
    q.disconnect()
PY
```

The result contains the two rows shown above. `polars[rtcompat]` also works on
CPUs and virtual machines without AVX2. If your machine supports the standard
Polars runtime, installing `kola` alone is sufficient.

### Upload

`pl.Categorical` sends `sym` as q symbols. The numeric columns become float and
long vectors. Pass the DataFrame as an argument, rather than constructing q
source from its values:

```python
q.sync('set', 'trade', trades)
```

`set` creates or replaces `trade` on the server. The table remains there after
the Python connection closes, until the server exits or you replace it.

To append another batch later, use the pattern from
[Kola's upload example](https://github.com/jshinonome/kola/blob/ff35ebb1b62decab0f6e036c42c59eb5494853f0/py-kola/README.md#send-dataframe):

```python
q.sync('upsert', 'trade', trades)
```

For this unkeyed table, `upsert` appends rows. Sending the same batch again adds
duplicates; the complete example uses `set` so rerunning it gives the same result.

### Query

Kola accepts q query strings and returns tables as Polars DataFrames:

```python
result = q.sync('select from trade where size>=10')
```

This selects the two AAPL trades. To group the original table instead:

```python
result = q.sync('0!select volume:sum size,notional:sum price*size by sym from trade')
```

`sum size` totals each symbol's volume. `sum price*size` totals its trade value.
`0!` turns the grouped result into an ordinary table, which Kola returns as a
Polars DataFrame. Use `result.to_dicts()` for Python dictionaries or continue
with Polars expressions.

For a parameterized calculation, pass a value separately:

```python
q.sync('{sum x}', pl.Series('sizes', [10, 5, 20], dtype=pl.Int64))
# 35
```

Run these calls while the connection is open. Press **Ctrl+C** in terminal 1
when you have finished with the server.

### Run Kola's tests against PeachQ

??? example "Run Kola compatibility tests (no Rust build required)"

    The suite checks q IPC reads and writes for atoms, vectors, tables and
    dictionaries, plus asynchronous calls, errors and Kola's operator encoding.
    Run the upstream Python tests against the installed Kola wheel with `pytest`,
    excluding one DNS-message test that does not connect to PeachQ.

    You also need Git and `lsof`. In terminal 2, from `peachq-python-api` with
    `.venv` active, run:

    ```bash
    python -m pip install 'kola==2.6.1' 'polars[rtcompat]' pytest
    git clone https://github.com/jshinonome/kola.git kola-tests
    git -C kola-tests checkout ff35ebb1b62decab0f6e036c42c59eb5494853f0
    (
        if lsof -i:1801 >/dev/null; then
            echo 'Port 1801 is in use. Free it before running these tests.'
            exit 1
        fi
        PATH="$PWD/peachq:$PATH" TZ=UTC python -m pytest \
            --import-mode=importlib kola-tests/py-kola/test -q -k "not test_io_error"
    )
    ```

    The test revision matches Kola 2.6.1. `--import-mode=importlib` uses the
    installed wheel without importing the unbuilt Python package in the clone.
    The [upstream fixture](https://github.com/jshinonome/kola/blob/ff35ebb1b62decab0f6e036c42c59eb5494853f0/py-kola/test/conftest.py)
    starts the downloaded `peachq/q` on port 1801 and stops it afterwards;
    the example server on port 5010 can stay running. Keep port 1801 unused:
    the fixture attempts to kill a process already using that port.
    `TZ=UTC` avoids the scalar null-date conversion issue described below.

    The `-k "not test_io_error"` filter excludes only the test that expects
    specific OS resolver wording for the hostname `DUMMY`. Pytest reports it
    as deselected. To run the complete upstream suite, remove that filter;
    a different DNS error message can fail that test without involving PeachQ.

    Read pytest's final passed, failed, skipped and deselected counts. Skipped
    IPC tests do not demonstrate server compatibility. Passing tests cover the
    selected cases, not every q feature or Kola workflow.

## qPython

The original exxeleron project is in maintenance mode. It cannot import with
NumPy 2, and requires NumPy older than 1.24 for its removed type aliases. Use a
separate Python 3.10 or 3.11 environment for this example. Here, `python3`
must refer to one of those versions; the pinned NumPy does not support Python
3.12 or newer:

```bash
python3 -m venv .qpython-venv
. .qpython-venv/bin/activate
python -m pip install setuptools 'numpy==1.23.5' 'qPython==2.0.0'
python - <<'PY'
import numpy as np
from qpython.qconnection import QConnection

with QConnection(host='127.0.0.1', port=5010) as q:
    assert q.sendSync('1+1') == 2
    total = q.sendSync('{sum x}', np.array([10, 5, 20], dtype=np.int64))
    assert total == 35
    print(total)
    print(q.sendSync('([]sym:`AAPL`MSFT;volume:30 5;notional:3200 1000f)'))
PY
```

This returns NumPy data, including a structured array for the table. Keep
`pandas=True` off: qPython's direct pandas conversion fails with pandas 1.5.3.

## Limitations

You can now upload a table, aggregate it in PeachQ and use the result in Python.

- Kola can raise a conversion error for the scalar null date `0Nd` when
  Python uses the Europe/London timezone. Starting Python with `TZ=UTC`
  avoids this; the null becomes `datetime.date(1, 1, 1)`, not `None`.
- qPython needs the older environment above and cannot convert tables with
  `pandas=True` under pandas 1.5.3. Use its default NumPy output instead.
