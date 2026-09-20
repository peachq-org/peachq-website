import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('repl_files', Path(__file__).parents[1] / 'tools/build-repl-files.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReplFilesTest(unittest.TestCase):
    def test_add_change_delete_and_nested_paths(self):
        with tempfile.TemporaryDirectory() as tmp:
            samples = Path(tmp) / 'repl/files/nested'
            samples.mkdir(parents=True)
            file = samples / 'hello world.q'
            file.write_text('til 3')
            manifest = Path(tmp) / 'repl/files.json'
            module.build(tmp)
            first = json.loads(manifest.read_text())
            self.assertEqual(first[0]['path'], 'nested/hello world.q')
            file.write_text('til 4')
            module.build(tmp)
            self.assertNotEqual(first[0]['sha256'], json.loads(manifest.read_text())[0]['sha256'])
            file.unlink()
            module.build(tmp)
            self.assertEqual(json.loads(manifest.read_text()), [])

    def test_reject_symlinks(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp) / 'repl/files'
            directory.mkdir(parents=True)
            (directory / 'outside').symlink_to('/tmp')
            with self.assertRaises(ValueError):
                module.build(tmp)
