---
title: Download PeachQ
description: Download PeachQ preview builds and browser runtime.
---

# Download PeachQ

Native packages for the current preview, plus the browser REPL for a no-install
first look. Current preview **v0.41**, uploaded 2026-07-16.

=== "Linux"

    ```bash
    curl -LO https://peachq.org/file/peachq-v0.41.0-linux-x86_64.tar.gz
    mkdir -p peachq
    tar -xzf peachq-v0.41.0-linux-x86_64.tar.gz -C peachq
    cd peachq
    ./q
    ```

=== "macOS"

    ```bash
    curl -LO https://peachq.org/file/peachq-v0.41.0-darwin-arm64.tar.gz
    mkdir -p peachq
    tar -xzf peachq-v0.41.0-darwin-arm64.tar.gz -C peachq
    cd peachq
    ./q
    ```

=== "Windows"

    ```powershell
    Invoke-WebRequest https://peachq.org/file/peachq-v0.41.0-windows-x86_64.zip -OutFile peachq.zip
    Expand-Archive peachq.zip -DestinationPath peachq
    cd peachq
    .\q.exe
    ```

No install needed? [Launch the browser REPL](https://peachq.org/repl).

Want to follow development or contribute fixes?
[Open GitHub](https://github.com/peachq-org/peachq).

## Release path

PeachQ's version is its q-conformance score, so each release is a step up the
pass rate.

| Version | Theme | What landed |
|---|---|---|
| 0.4 | Breadth and polish | Deeper qSQL, self-hosted q verbs, a Windows build, the browser REPL and in-REPL help. |
| 0.3 | Talking and joining | IPC over the kdb wire, keyed tables, the first joins and a real string model. |
| 0.2 | qSQL and time | `select` and `exec` over in-memory tables, temporal types and reference-matched display. |
| 0.1 | The language takes shape | Core datatypes, adverbs, dictionaries and tables, with `parse` and `type` starting to match kdb. |
