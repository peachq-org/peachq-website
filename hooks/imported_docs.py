"""Keep deferred link cleanup in the imported documentation out of strict CI.

The initial basics/ref snapshot is intentionally byte-for-byte upstream while
only those two sections have been imported. MkDocs consequently reports links
to the upstream repository's other sections as missing. Downgrade warnings for
those two source trees only; warnings in PeachQ-authored documentation remain
warnings and still fail ``mkdocs build --strict``.
"""

import logging


class _ImportedDocsFilter(logging.Filter):
    _PREFIXES = (
        "Doc file 'docs/basics/",
        "Doc file 'docs/ref/",
    )

    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        if record.levelno == logging.WARNING and message.startswith(self._PREFIXES):
            record.levelno = logging.INFO
            record.levelname = "INFO"
        return True


def on_config(config):
    logging.getLogger("mkdocs.structure.pages").addFilter(_ImportedDocsFilter())
    return config
