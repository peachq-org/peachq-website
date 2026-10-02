"""Debounce the local watcher and assemble preview videos without building the website."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location(
    'watch_preview', Path(__file__).resolve().parents[1] / 'tools/watch-preview.py')
watcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(watcher)


class DebounceTests(unittest.TestCase):
    def wait(self, before, samples, quiet=3):
        with patch.object(watcher, 'snapshot', side_effect=samples) as snapshot, \
                patch.object(watcher.time, 'sleep'), \
                patch.object(watcher.time, 'monotonic', side_effect=range(len(samples))):
            result = watcher.wait_for_changes(before, quiet)
            self.assertEqual(snapshot.call_count, len(samples))
            return result

    def test_each_edit_restarts_quiet_period(self):
        # The first edit must not trigger a build while further edits arrive.
        a, b, c = {'a': 1}, {'a': 2}, {'a': 2, 'b': 1}
        self.assertEqual(self.wait({}, [a, a, b, b, c, c, c, c]), c)

    def test_reverted_edits_do_not_build(self):
        before, edited, later = {'a': 1}, {'a': 2}, {'a': 3}
        samples = [edited, before, before, before, before, later, later, later, later]
        self.assertEqual(self.wait(before, samples), later)

    def test_deletions_and_edits_during_previous_build_are_collected(self):
        before = {'doc': 1, 'deleted': 1}
        current = {'doc': 2}
        self.assertEqual(self.wait(before, [current] * 4), current)


class VideoTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.temp = Path(temp.name)
        self.root, self.cache, self.output = self.temp / 'repo', self.temp / 'cache', self.temp / 'out'
        for name, size in (('local', (115, 32)), ('remote', (173, 49))):
            (self.root / 'content/recordings' / name).mkdir(parents=True)
            (self.root / 'content/recordings' / name / f'{name}.cast').write_text(
                json.dumps({'width': size[0], 'height': size[1]}) + '\n')
        (self.root / 'content/a.md').write_text('<video src="/video/local-HD.mp4"></video>\n'
                                                '<video src="/video/remote-FHD.mp4"></video>\n')
        (self.root / 'build/recordings').mkdir(parents=True)
        (self.root / 'build/recordings/local-HD.mp4').write_bytes(b'local')
        self.output.mkdir()
        for name, value in (('ROOT', self.root), ('CACHE', self.cache), ('TARGET', self.temp / 'target')):
            patcher = patch.object(watcher, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def test_exported_videos_are_used_and_missing_ones_downloaded_once(self):
        def fetch(url, destination):
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(url.encode())
        with patch.object(watcher, 'download', side_effect=fetch) as download:
            watcher.add_videos(self.output)
            watcher.add_videos(self.output)
        download.assert_called_once()
        self.assertEqual(download.call_args.args[0], 'https://peachq.org/video/remote-FHD.mp4')
        self.assertEqual((self.output / 'video/local-HD.mp4').read_bytes(), b'local')
        self.assertEqual((self.output / 'video/remote-FHD.mp4').read_bytes(),
                         b'https://peachq.org/video/remote-FHD.mp4')

    def test_unavailable_video_is_skipped(self):
        with patch.object(watcher, 'download') as download:
            watcher.add_videos(self.output)
        download.assert_called_once()
        self.assertEqual(sorted(p.name for p in (self.output / 'video').iterdir()), ['local-HD.mp4'])

    def test_sync_never_deletes_preview_videos(self):
        target = self.temp / 'target'
        (target / 'video').mkdir(parents=True)
        (target / 'video/old-HD.mp4').write_bytes(b'old')
        (target / 'stale.html').write_text('stale')
        (self.output / 'index.html').write_text('new')
        subprocess.run(watcher.sync_command(self.output), check=True)
        self.assertTrue((target / 'video/old-HD.mp4').exists())
        self.assertFalse((target / 'stale.html').exists())
        (self.output / 'video').mkdir()
        (self.output / 'video/new-HD.mp4').write_bytes(b'new')
        subprocess.run(watcher.sync_command(self.output), check=True)
        self.assertEqual(sorted(p.name for p in (target / 'video').iterdir()), ['new-HD.mp4', 'old-HD.mp4'])


if __name__ == '__main__':
    unittest.main()
