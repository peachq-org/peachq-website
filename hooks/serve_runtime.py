"""Supply same-origin browser q files to MkDocs' temporary development site."""
from pathlib import Path
import os
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
_serving = False
_fixtures = None


def on_startup(command, dirty):
    global _serving
    _serving = command == 'serve'


def on_post_build(config):
    global _fixtures
    if not _serving:
        return
    if _fixtures is None:
        # Fetch the current published runtime once per server start, outside the
        # source tree. Rebuilds reuse it; deployment builds retain their own files.
        fixtures = tempfile.TemporaryDirectory(prefix='peachq-mkdocs-fixtures-')
        try:
            subprocess.run(['sh', str(ROOT / 'tools/dev-fixtures.sh')], check=True,
                           env=dict(os.environ, PEACHQ_FIXTURE_DIR=fixtures.name,
                                    PEACHQ_WITH_RELEASES='0'))
            required = ('manifest.json', 'worker.js', 'engine.js', 'peachq.js',
                        'peachq.wasm', 'duck-loader.js')
            missing = [name for name in required
                       if not (Path(fixtures.name) / 'wasm/latest' / name).is_file()]
            if missing:
                raise RuntimeError('Browser q preview files could not be downloaded: '
                                   + ', '.join(missing)
                                   + '. Check access to peachq.org and restart mkdocs serve.')
        except Exception:
            fixtures.cleanup()
            raise
        _fixtures = fixtures
    shutil.copytree(Path(_fixtures.name) / 'wasm', Path(config['site_dir']) / 'wasm',
                    dirs_exist_ok=True)


def on_shutdown():
    global _fixtures
    if _fixtures is not None:
        _fixtures.cleanup()
        _fixtures = None
