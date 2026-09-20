# Builtin help snapshot

`help-builtins.tsv` is an unchanged copy of `lib/help-builtins.tsv` from a
local [PeachQ](https://github.com/peachq-org/peachq) source checkout. `source.json` records its exact
revision and SHA-256 hash, without asserting that the commit is available
in the public repository. The source repository's MIT licence is preserved in
[LICENSE](LICENSE); it applies to this snapshot.

Builds retain the source record and licence beside `search/q_lookup.json`.

The website uses the name and meaning columns for search descriptions. Invocation
examples remain in the source snapshot but are not displayed by search. Each
meaning keeps its own row, including overloaded glyphs. Descriptions do not
replace the reference or API specifications.

Resync using `tools/sync-search-help.py`; see **Documentation search** in
[CONTRIBUTING.md](../../CONTRIBUTING.md). Review the licence at the proposed source
revision as well as changes to the descriptions.
