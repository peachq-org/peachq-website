#!/usr/bin/env python3
"""Check Python IPC examples against a supplied PeachQ executable."""
import argparse
import socket
import subprocess
import time
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--q', required=True, type=Path)
    parser.add_argument('--client', choices=['kola', 'qpython'], default='kola')
    parser.add_argument('--probe', choices=['null-date', 'duration', 'duration-literal', 'duration-match', 'pandas'])
    args = parser.parse_args()
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    proc = subprocess.Popen([str(args.q.resolve()), '-p', str(port)],
                            stdin=subprocess.PIPE, stdout=subprocess.DEVNULL)
    conn = None
    try:
        for _ in range(100):
            if proc.poll() is not None:
                raise RuntimeError('PeachQ exited before accepting connections')
            try:
                with socket.create_connection(('127.0.0.1', port), timeout=.1):
                    break
            except OSError:
                time.sleep(.05)
        else:
            raise RuntimeError('PeachQ startup timed out')
        if args.client == 'kola':
            import polars as pl
            from kola import Q
            conn = Q('127.0.0.1', port)
            conn.connect()
            if args.probe == 'null-date':
                # Upstream expects datetime.date(1, 1, 1); inspect the actual conversion.
                print(conn.sync('0Nd'))
                return
            if args.probe == 'duration-literal':
                print(conn.sync('0N 0D00 0D12:34:56.123456789n'))
                return
            if args.probe in ('duration', 'duration-match'):
                durations = pl.Series('duration', [None, 0, 45296123456789], pl.Duration('ns'))
                if args.probe == 'duration-match':
                    print(conn.sync('{x~0N 0D00 0D12:34:56.123456789n}', durations))
                    return
                actual = conn.sync('{x}', durations)
                assert actual.to_list() == durations.to_list(), actual
                print(actual)
                return
            trades = pl.DataFrame({
                'sym': ['AAPL', 'MSFT', 'AAPL'],
                'price': [100., 200., 110.],
                'size': [10, 5, 20],
            }).with_columns(pl.col('sym').cast(pl.Categorical))
            assert conn.sync('{trade::x;count trade}', trades) == 3
            result = conn.sync('0!select volume:sum size,notional:sum price*size by sym from trade')
            assert result.to_dicts() == [
                {'sym': 'AAPL', 'volume': 30, 'notional': 3200.},
                {'sym': 'MSFT', 'volume': 5, 'notional': 1000.},
            ], result
            print(result)
        else:
            import numpy as np
            from qpython.qconnection import QConnection
            conn = QConnection('127.0.0.1', port)
            conn.open()
            assert conn.sendSync('1+1') == 2
            assert conn.sendSync('{sum x}', np.array([10, 5, 20], dtype=np.int64)) == 35
            result = conn.sendSync('([]sym:`AAPL`MSFT;volume:30 5;notional:3200 1000f)',
                                   pandas=args.probe == 'pandas')
            assert result['volume'].tolist() == [30, 5]
            assert result['notional'].tolist() == [3200., 1000.]
            print(result)
        print('PASS: query, upload and table result')
    finally:
        try:
            if conn:
                conn.disconnect() if args.client == 'kola' else conn.close()
        finally:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait()


if __name__ == '__main__':
    main()
