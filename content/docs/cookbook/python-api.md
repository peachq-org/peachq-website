---
title: Query PeachQ from Python
description: Upload a Polars DataFrame, aggregate it in PeachQ and bring the result back to Python with Kola.
---

# Query PeachQ from Python

Send a Python DataFrame to PeachQ. Group the trades in q. Get a Polars DataFrame
back, ready for your next calculation or chart.

```text
sym   volume  notional
AAPL      30    3200.0
MSFT       5    1000.0
```

## Choose a client

Both clients connect to a separate PeachQ process over q IPC.

| Client | Python data | When to use it |
| --- | --- | --- |
| [Kola](https://github.com/jshinonome/kola) | Polars DataFrames and Series | Start here for a new project. The example below runs on Python 3.14. |
| [qPython](https://github.com/exxeleron/qpython) | NumPy arrays and structured arrays | Existing qPython code with older dependencies. See the restrictions below. |

These clients send queries from Python to q. Calling Python *from* q is a
different workflow: use [embedPy](https://github.com/KxSystems/embedPy).

## Run it with Kola

Use Linux x86-64, Bash, `curl`, `tar`, and Python 3.14 with `venv` and `pip`.
Start in a fresh directory. The server runs in one terminal; Python connects
from another.

**Terminal 1 — download and start PeachQ:**

```bash
mkdir peachq-python-api && cd peachq-python-api
mkdir peachq
curl -fL https://peachq.org/download/peachq-linux-x64.tar.gz | tar -xz -C peachq
./peachq/q -p 5010
```

**Terminal 2 — install Kola and run the example:**

```bash
cd peachq-python-api
python3.14 -m venv .venv
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
    assert q.sync('{trade::x;count trade}', trades) == 3
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

## Upload the table

`pl.Categorical` sends `sym` as q symbols. The numeric columns become float and
long vectors. Pass the DataFrame as an argument, rather than constructing q
source from its values:

```python
q.sync('{trade::x;count trade}', trades)
```

The function assigns the table to `trade` in the server and returns its row
count. The table remains there after the Python connection closes, until the
server exits or you replace it.

## Query in q, continue in Python

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

## Using existing qPython code

The original exxeleron project is in maintenance mode. It cannot import with
NumPy 2, and requires NumPy older than 1.24 for its removed type aliases. Use a
separate Python 3.11 environment for this example:

```bash
python3.11 -m venv .qpython-venv
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
The working example does not imply that the full qPython test suite passes.

## Things to watch

You can now upload a table, aggregate it in PeachQ and use the result in Python.

- Use a trusted local server for this recipe. q IPC accepts executable queries;
  restrict access to port 5010 rather than exposing it to an untrusted network.
- Kola can raise a conversion error for the scalar null date `0Nd` when
  Python uses the Europe/London timezone. Starting Python with `TZ=UTC`
  avoids this; the null becomes `datetime.date(1, 1, 1)`, not `None`.
- The timespan vector literal `0N 0D00 0D12:34:56.123456789n` fails in PeachQ.
  Sending a Polars `Duration('ns')` Series and returning it with `{x}` works;
  embedding that literal in a function can instead return `badmsg` and close
  the connection.
- qPython needs the older environment above. Its upstream suite also has
  failures involving temporal nulls and pandas; use Kola for new projects.
