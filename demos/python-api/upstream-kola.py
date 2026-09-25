#!/usr/bin/env python3
"""Run a Kola checkout's Python tests against PeachQ without killing other servers."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--checkout', required=True, type=Path)
parser.add_argument('--q', required=True, type=Path)
args, pytest_args = parser.parse_known_args()
fixture = '''import os, socket, subprocess, time
import pytest
from kola import Q
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
qConn = Q('127.0.0.1', port)
@pytest.fixture(scope='session')
def start_q_process():
    proc = subprocess.Popen([os.environ['PEACHQ_TEST_EXECUTABLE'], '-p', str(port)],
                            stdin=subprocess.PIPE, stdout=subprocess.DEVNULL)
    try:
        for _ in range(100):
            if proc.poll() is not None:
                pytest.fail('PeachQ exited before accepting connections')
            try:
                qConn.connect()
                break
            except Exception:
                time.sleep(.05)
        else:
            pytest.fail('PeachQ startup timed out')
        yield
    finally:
        try:
            qConn.disconnect()
        finally:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait()
@pytest.fixture
def q(start_q_process):
    return qConn
'''
with tempfile.TemporaryDirectory(prefix='peachq-kola-tests-') as temporary:
    target = Path(temporary) / 'test'
    shutil.copytree(args.checkout / 'py-kola' / 'test', target)
    (target / 'conftest.py').write_text(fixture)
    env = os.environ.copy()
    env['PEACHQ_TEST_EXECUTABLE'] = str(args.q.resolve())
    result = subprocess.run([sys.executable, '-m', 'pytest', str(target), '-q',
                             '--tb=short', *pytest_args], cwd=temporary, env=env)
    sys.exit(result.returncode)
