#!/usr/bin/env python3
"""Check the cookbook extension after building add.so in the selected directory."""
import argparse
from pathlib import Path
import subprocess

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--q', type=Path, required=True)
p.add_argument('--directory', type=Path, required=True)
a = p.parse_args()
r = subprocess.run([str(a.q.resolve()), str(Path(__file__).with_name('check.q').resolve())],
    cwd=a.directory, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=20)
expected = ('5\n2 3 4\n112h\n`:./add 2:(`add;2)\n`:./add\n`add\n2\n'
            '"type"\n6.5\n700\n"nosuch"\n"rank"\n"C EXTENSION CHECK COMPLETE"\n')
assert r.returncode == 0 and not r.stderr, (r.returncode, r.stderr)
assert r.stdout == expected, f'Unexpected output:\n{r.stdout}'
print('PASS: C calls, projection, vector sum, q callback and expected errors')
