#!/usr/bin/env python3
"""Check the five-process Finance Starter Pack demo; leave the stack running."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import time
import urllib.request

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--q', type=Path, default=Path.home() / 'dev/rayforce/q')
p.add_argument('--output', type=Path, required=True)
a = p.parse_args()
results = {'q_sha256': hashlib.sha256(a.q.read_bytes()).hexdigest(), 'probes': []}
def query(port, expression, auth=True):
    target = f'localhost:{port}' + (':admin:admin' if auth else '')
    r = subprocess.run([str(a.q), '-conn', target, '-eval', expression], capture_output=True, text=True, timeout=20)
    results['probes'].append({'port': port, 'expression': expression, 'exit': r.returncode, 'stdout': r.stdout, 'stderr': r.stderr})
    a.output.write_text(json.dumps(results, indent=2) + '\n')
    if r.returncode:
        raise RuntimeError(r.stderr)
    return r.stdout.strip()
for port in (6001,6000,6002,6014,6009):
    assert query(port, '.proc.initialised', port not in (6014,6009)) == '1b'
first = int(query(6002, 'count trade'))
time.sleep(3)
second = int(query(6002, 'count trade'))
assert second > first > 0, (first, second)
query(6002, 'select trades:count i,volume:sum size,vwap:size wavg price by sym from trade')
deadline = time.monotonic() + 65
while int(query(6009, 'count .hb.hb', False)) == 0:
    if time.monotonic() >= deadline:
        raise RuntimeError('No heartbeat rows within 65 seconds')
    time.sleep(2)
assert query(6009, 'count checkconfig', False) == '7'
with urllib.request.urlopen('http://localhost:6009/.non?monitorui', timeout=10) as response:
    html = response.read().decode()
    assert 'Process Monitor' in html
    results['monitor_http_status'] = response.status
results['trade_counts'] = [first, second]
results['note'] = 'Seven configured monitor checks loaded; individual outcomes not validated. WebSocket behavior checked separately.'
a.output.write_text(json.dumps(results, indent=2) + '\n')
print(f'PASS: five initialized processes, trades {first} -> {second}, aggregate, heartbeats and monitor HTML')
