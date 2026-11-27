"""Keep deferred link cleanup in the imported documentation out of strict CI.

The basics/ref snapshot imports only those two upstream sections. Some links
to the upstream repository's other sections remain unresolved after targeted
repairs, so MkDocs reports them as missing. Downgrade warnings for
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
