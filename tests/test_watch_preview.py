"""Debounce the local watcher without sleeping or building the website."""
import importlib.util
from pathlib import Path
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


if __name__ == '__main__':
    unittest.main()
