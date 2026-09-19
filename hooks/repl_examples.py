"""Add REPL links to q fences. Executable documentation checking lives in C."""
import re
import shlex
from html import escape, unescape
from urllib.parse import urlencode

FENCE = re.compile(r'^(?P<indent>[ \t]*)(?P<ticks>`{3,}|~{3,})(?P<info>[^\n]*)$')
MARKER = re.compile(r'<!--\s*peachq:\s*(.*?)\s*-->\s*$', re.DOTALL)
HEADING = re.compile(r'^#{1,6}\s+(.+?)\s*#*\s*$')


def plain_title(value):
    value = re.sub(r'\[([^]]+)\]\([^)]*\)', r'\1', value)
    return unescape(re.sub(r'<[^>]*>|[`*]', '', value)).strip()


def on_page_markdown(markdown, page, config, files):
    lines = markdown.splitlines(keepends=True)
    output = []
    heading = plain_title(str(page.meta.get('title') or page.title or 'Example'))
    block = 0
    i = 0
    while i < len(lines):
        line = lines[i]
        opening = FENCE.match(line.rstrip('\r\n'))
        if not opening:
            title = HEADING.match(line.strip())
            if title:
                heading = plain_title(title.group(1))
            output.append(line)
            i += 1
            continue
        indent, ticks, info = opening.group('indent', 'ticks', 'info')
        end = i + 1
        closing = re.compile(r'^[ \t]*' + re.escape(ticks[0]) + '{' + str(len(ticks)) + r',}\s*$')
        while end < len(lines) and not closing.match(lines[end].rstrip('\r\n')):
            end += 1
        if end == len(lines):
            output.extend(lines[i:])
            break
        if info.strip() != 'q':
            output.extend(lines[i:end + 1])
            i = end + 1
            continue
        block += 1
        # Only the immediately preceding comment applies to this fence.
        previous = i - 1
        while previous >= 0 and not lines[previous].strip():
            previous -= 1
        marker = MARKER.search(lines[previous].strip()) if previous >= 0 else None
        tokens = shlex.split(marker.group(1)) if marker else []
        title = next((token[6:] for token in tokens if token.startswith('title=')), heading)
        code = ''.join(part[len(indent):] if part.startswith(indent) else part
                       for part in lines[i + 1:end]).rstrip('\r\n')
        # Expected output stays in the displayed transcript, not in the editor.
        if any(part.startswith('q)') for part in code.splitlines()):
            code = '\n'.join(part[2:] for part in code.splitlines() if part.startswith('q)'))
        query = {'code': code, 'title': title,
                 'example': page.file.src_uri + ':' + str(block)}
        autorun = 'runnable' in tokens
        if autorun:
            query['autorun'] = '1'
        label = 'Run in REPL (new tab)' if autorun else 'Open in REPL (new tab)'
        url = '/repl?' + urlencode(query)
        action = ('<a class="peachq-repl-link" href="' + escape(url, quote=True)
                  + '" target="_blank" rel="noopener noreferrer" aria-label="' + label
                  + '" title="' + label + '"><svg viewBox="0 0 24 24" aria-hidden="true"'
                  + ' focusable="false"><path d="M8 5v14l11-7z"/></svg></a>')
        output.append(indent + '<div class="peachq-example" markdown="1">\n\n')
        output.extend(lines[i:end + 1])
        output.append('\n' + indent + action + '\n\n' + indent + '</div>\n')
        i = end + 1
    return ''.join(output)
