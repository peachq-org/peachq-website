"""Style guard for all documentation and news Markdown, without exceptions."""

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class DocsStyleTests(unittest.TestCase):
    def test_no_em_dashes(self):
        occurrences = []
        for path in sorted((ROOT / "content").rglob("*.md")):
            for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
                if "\u2014" in line:
                    occurrences.append(f"{path.relative_to(ROOT)}:{number}: {line}")
        self.assertFalse(
            occurrences,
            "Em dashes are not allowed in content Markdown:\n" + "\n".join(occurrences),
        )


if __name__ == "__main__":
    unittest.main()
