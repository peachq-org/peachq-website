#!/usr/bin/env python3
"""Run the cookbook's complete script in an installed embedPy directory."""
import argparse
import os
from pathlib import Path
import subprocess

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--q', type=Path, required=True)
p.add_argument('--directory', type=Path, required=True)
a = p.parse_args()
root = Path(__file__).resolve().parents[2]
script = root / 'content/docs/cookbook/examples/embedpy-demo.q'
directory = a.directory.resolve()
chart = directory / 'prices.png'
if chart.exists():
    chart.unlink()
r = subprocess.run([str(a.q.resolve()), str(script)], cwd=directory,
    env=dict(os.environ, QHOME=str(directory)), stdin=subprocess.DEVNULL,
    capture_output=True, text=True, timeout=45)
expected = ('0 1 2 3 4\nhello from python\n102.4\n1.854724\n'
            'size | `AAPL`MSFT!40 60\nprice| `AAPL`MSFT!202 401f\n'
            '2 1f\n"DEMO COMPLETE"\n')
assert r.returncode == 0 and not r.stderr, (r.returncode, r.stderr)
assert r.stdout == expected, f'Unexpected output:\n{r.stdout}'
assert chart.read_bytes().startswith(b'\x89PNG\r\n\x1a\n'), 'Missing PNG chart'
print('PASS: NumPy, pandas, SciPy callback, Python console and saved chart')
