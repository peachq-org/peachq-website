#!/usr/bin/env python3
"""Import user-docs from an explicit C-project revision; never run q examples."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
from datetime import date

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / 'content/docs/peachq'
RECORD = DEST / 'sync.json'


def compatibility_page(raw):
    """Present source details as additions, behaviour changes, then limitations."""
    for filename, title in {
        'csv': 'Reading CSV', 'json': 'Reading JSON', 'loading': 'Loading data',
        'bad-rows': 'Bad rows', 'handles': 'Handles and resources',
        'regexp': 'Regular expressions', 'typed-parameters': 'Typed parameters',
        'ffi': 'Foreign functions', 'cmdline': 'Command line',
        'syscmds': 'System commands', 'parquet': 'Parquet',
    }.items():
        raw = raw.replace(f'[{filename}.md]', f'[{title}]')
    differences, tail = raw.split('## Not supported, or different\n', 1)[1].split('## Storage\n', 1)
    storage, additions = tail.split('## Additions\n', 1)
    table, details = differences.split('\n\n**Partitioned and segmented databases.', 1)
    details = '**Partitioned and segmented databases.' + details
    paragraphs = re.split(r'\n\n(?=\*\*)', details.strip())
    sections = {part.split('**', 2)[1]: part for part in paragraphs}
    rows = [line for line in table.splitlines() if line.startswith('| **')]
    unsupported = [line for line in rows if any(term in line for term in
                   ('**Partitioned', '**Splayed and partitioned', '**Pattern matching', '**System commands'))]
    changed = [line for line in rows if any(term in line for term in ('**Reserved words', '**`set`'))]
    additions = additions.replace('| **Typed parameters** |', '| **Typed parameters (design preview)** |')
    additions = additions.replace('|---|---|---|', '|---|---|---|\n'
        '| **REPL and table display** | Built-in editing, history and a richer table display. | [REPL guide](repl.md) |', 1)
    additions = additions.replace(
        'A `` `: `` symbol can name a resource anywhere; `read0`, `read1` and qSQL resolve it.',
        'Read supported files and remote resources; available operations depend on the transport and format.')
    additions = additions.replace(
        'Query it from q, and reach Parquet and S3 through it.',
        'Experimental native integration: query DuckDB from q and use its Parquet and S3 support.')
    additions = additions.replace(
        'Read and write parquet through DuckDB; q types survive the round trip.',
        'Read and write Parquet through DuckDB; supported q types round-trip using PeachQ schema metadata.')
    # The source's blanket library-loading sentence predates the REPL row and
    # does not distinguish planned typed-parameter stages.
    additions = additions.split('Everything above arrives', 1)[0].rstrip()
    table_header = '| What | What to expect | More |\n|---|---|---|\n'
    page = ('# PeachQ additions and compatibility\n\n'
        'PeachQ builds on familiar q syntax with richer interactive tools, flexible data readers '
        'and connections to other systems. Start with the additions below, then review behaviour '
        'changes and unsupported features when bringing an existing application across.\n\n'
        '## More with PeachQ\n\n' + additions.strip() + '\n\n'
        'Load the bundled library with `\\l pq` for its namespaces. The native REPL, URL resources, '
        '`rlike` and startup evaluation do not need that step. Typed parameters are a **design preview**; '
        'the feature guide records which stages have not shipped. String helpers and DuckDB functions '
        'also have doc comments at the prompt: try `.str.printf` or `.duckdb.exec`.\n\n'
        '## Behaviour changes\n\n'
        'These choices make some operations behave differently from q. Check them when migrating code.\n\n'
        + table_header + '\n'.join(changed) + '\n\n'
        + '\n\n'.join(sections[name] for name in (
            '`set` writes the format the suffix names.', '`get` reads the format the suffix names.',
            'Reserved words in name positions.'))
        + '\n\n### Storage and memory use\n\n' + storage.strip()
        + '\n\n## Unsupported features\n\n'
        'The following capabilities are unavailable or only partly implemented in this snapshot. '
        'The linked guides describe alternatives and per-option status.\n\n'
        + table_header + '\n'.join(unsupported) + '\n\n'
        + '\n\n'.join(sections[name] for name in (
            'Partitioned and segmented databases.', 'Splayed and partitioned writing.', 'Pattern matching.'))
        + '\n')
    # Put navigation on the feature itself instead of repeating it in a column.
    anchors = {
        '`set` writes the format the suffix names.': 'file-formats',
        'Reserved words in name positions.': 'reserved-names',
        'Partitioned and segmented databases.': 'partitioned-databases',
        'Splayed and partitioned writing.': 'storage-writing',
        'Pattern matching.': 'pattern-matching',
    }
    for heading, anchor in anchors.items():
        page = page.replace('**' + heading + '**', '<a id="' + anchor + '"></a>\n\n**' + heading + '**')
    fallback = {
        '**Reserved words': '#reserved-names', '**`set`': '#file-formats',
        '**Partitioned': '#partitioned-databases', '**Splayed': '#storage-writing',
        '**String helpers': 'repl.md', '**DuckDB-backed': 'handles.md',
    }
    output = []
    for line in page.splitlines():
        if line.startswith('| What |'):
            cells = line.split('|')
            output.append('| Feature | ' + ('What it adds' if 'One line' in cells[2] else 'What to expect') + ' |')
        elif line == '|---|---|---|':
            output.append('|---|---|')
        elif line.startswith('| **'):
            feature, description, more = [cell.strip() for cell in line.strip('|').split('|')]
            link = re.search(r'\]\(([^)]+)\)', more)
            target = link.group(1) if link else next((url for prefix, url in fallback.items()
                                                    if feature.startswith(prefix)), None)
            label = feature.replace('**', '')
            if feature.startswith('**System commands'):
                label = '[System commands](syscmds.md) and [launch flags](cmdline.md)'
            elif target:
                label = f'[{label}]({target})'
            output.append(f'| {label} | {description} |')
        else:
            output.append(line)
    return '\n'.join(output) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--revision', required=True)
    parser.add_argument('--write', action='store_true', help='Import after reviewing the source diff')
    args = parser.parse_args()

    def git(*parts):
        return subprocess.check_output(['git', '-C', str(args.source), *parts], text=True)

    sha = git('rev-parse', args.revision + '^{commit}').strip()
    version = git('show', sha + ':VERSION').strip()
    old = json.loads(RECORD.read_text()) if RECORD.exists() else {}
    files = git('ls-tree', '-r', '--name-only', sha, '--', 'user-docs').splitlines()
    rendered = {}
    entries = {}
    for source in files:
        if not source.endswith('.md'):
            continue
        raw = git('show', sha + ':' + source)
        body = raw
        changes = []
        if source == 'user-docs/compatibility.md':
            body = compatibility_page(raw)
            changes.append('Lead with additions, separate behaviour changes and unsupported features; omit unchanged CSV operator')
            changes.append('Link the website REPL guide and label typed parameters as design preview')
            changes.append('Use page names instead of filenames for link labels')
            changes.append('Link the Feature column and remove the separate More column')
            changes.append('Qualify resource and Parquet support; label the PeachQ DuckDB integration experimental')
        if '#argument-lists-and-the--sentinel' in body:
            body = body.replace('#argument-lists-and-the--sentinel', '#argument-lists-and-the-sentinel')
            changes.append('Correct FFI argument-list anchor for the rendered heading')
        if '\n# Notes for dev' in body:
            body = body.split('\n# Notes for dev', 1)[0].rstrip() + '\n'
            changes.append('Omit internal Notes for dev section')
        # The copied system-command guide links to a book hosted by KX.
        body = body.replace('](/q4m3/', '](https://code.kx.com/q4m3/')
        if '](/q4m3/' in raw:
            changes.append('Resolve q4m3 links against code.kx.com')
        title, rest = body.split('\n', 1)
        notice = ('!!! info "PeachQ documentation snapshot"\n'
                  f'    Reviewed source: **{version}**, `{sha[:12]}`. '
                  'See [source and sync notes](sync.md). Feature-specific status notes below '
                  'take precedence; this snapshot is not a claim that every example passes.\n')
        if source in ('user-docs/handles.md', 'user-docs/parquet.md'):
            notice += ('\n!!! warning "Experimental PeachQ DuckDB integration"\n'
                       '    PeachQ’s DuckDB integration is experimental and requires the native runtime '
                       'with DuckDB available; it is not available in the browser REPL. '
                       'Check the operation-specific limitations before relying on it for a workload. '
                       'This status describes PeachQ’s integration, not DuckDB itself.\n')
            changes.append('Add experimental status and native-runtime requirements for the PeachQ DuckDB integration')
        if source.endswith('typed-parameters.md'):
            notice += ('\n!!! warning "Design documentation"\n'
                       '    The source marks type checks as in review and defaults, varargs and named apply '
                       'as not yet shipped. Treat this page as a design preview, not a released-feature guide.\n')
        result = (f'---\ntitle: {json.dumps(title.lstrip("# "))}\n'
                  f'peachq_source: {source}\npeachq_revision: {sha}\n---\n\n'
                  f'{title}\n\n{notice}{rest}')
        name = Path(source).name
        rendered[name] = result
        entries[name] = {'source': source, 'source_sha256': hashlib.sha256(raw.encode()).hexdigest(),
                         'rendered_sha256': hashlib.sha256(result.encode()).hexdigest(),
                         'adaptations': changes}
    # Refuse to silently erase website edits made since the previous import.
    for name, entry in old.get('files', {}).items():
        path = DEST / name
        if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest() != entry['rendered_sha256']:
            parser.error(f'{path} has local editorial changes; reconcile them before syncing')
    print(f'{len(rendered)} pages from {sha} (version {version})')
    if not args.write:
        print('Preview only. Review the source diff, then add --write to import.')
        return
    DEST.mkdir(parents=True, exist_ok=True)
    for name in set(old.get('files', {})) - set(rendered):
        (DEST / name).unlink(missing_ok=True)
    for name, text in rendered.items():
        (DEST / name).write_text(text)
    record = {'repository': 'peachq C project (local rayforce checkout)', 'revision': sha,
              'version': version, 'synced_on': date.today().isoformat(),
              'review_basis': ['user-docs/', 'CHANGELOG.md', 'src/qlang/repl/qmain.c',
                               'src/qlang/repl/q_repl.c', 'src/app/term.c'],
              'examples_checked': False,
              'open_questions': ['Typed-parameter source describes stages not yet shipped.',
                                 'C-project documentation checker integration is owned by the C project.'],
              'files': entries}
    RECORD.write_text(json.dumps(record, indent=2) + '\n')


if __name__ == '__main__':
    main()
