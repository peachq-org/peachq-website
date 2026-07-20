"""Asserts the chrome split produces usable PHP partials."""
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
HEADER = SITE / "partials" / "header.php"
FOOTER = SITE / "partials" / "footer.php"

failures = []


def check(label, condition):
    if condition:
        print(f"PASS  {label}")
    else:
        print(f"FAIL  {label}")
        failures.append(label)


# Run the real pipeline, not just mkdocs. Calling "mkdocs build" directly would
# wipe site/ and rebuild from docs/ alone, discarding the static/ overlay and
# leaving the tree without its PHP pages for whatever runs next.
subprocess.run(["./tools/build.sh"], cwd=ROOT, check=True)

check("header.php exists", HEADER.is_file())
check("footer.php exists", FOOTER.is_file())

header = HEADER.read_text(encoding="utf-8")
footer = FOOTER.read_text(encoding="utf-8")

check("header opens the document", "<html" in header)
check("header does not close it", "</html>" not in header)
check("footer closes the document", "</html>" in footer)
check("marker is consumed", "PEACHQ-CHROME-SPLIT" not in header + footer)
check("title is a PHP expression", "<?= peachq_esc($title) ?>" in header)
check("description is a PHP expression", "<?= peachq_esc($description) ?>" in header)
check("scripts hook precedes body close", "peachq_emit_scripts(); ?></body>" in footer)
check("no nav item is pre-marked active", "md-nav__link--active" not in header)
check("throwaway page is deleted", not (SITE / "_chrome").exists())

# The PHP pages sit at the site root. Any surviving "../" would climb above the
# document root and 404 -- silently, since a missing stylesheet still renders.
check("no relative href escapes root", 'href="../' not in header + footer)
check("no relative src escapes root", 'src="../' not in header + footer)
check("assets resolve absolutely", "/assets/stylesheets/" in header)

# _chrome/ is deleted at build time; a canonical pointing there would tell
# search engines every PHP page duplicates a 404.
check("no stale canonical", "canonical" not in header)

# Every asset the chrome references must actually exist in the build.
for ref in set(re.findall(r'(?:href|src)="(/assets/[^"]+)"', header + footer)):
    check(f"asset exists: {ref}", (SITE / ref.lstrip("/")).is_file())

print("\nAll passed" if not failures else f"\n{len(failures)} failed")
sys.exit(0 if not failures else 1)
