# Java API examples

Sources for `../java-api-examples.jar`, which the
[Java API cookbook recipe](../../java-api.md) offers for download. This folder
is excluded from the website build; the jar contains the same sources.

## Contents

| Path | Source |
|---|---|
| `src/com/timestored/kdb/examples/` | TimeStored Java API examples (query, subscriber and feed handler), adapted for javakdb 2.2 as listed below. |
| `javakdb/src/com/kx/` | `c.java`, `ByteArrayAccess.java` and `package-info.java`, unmodified, from `javakdb/src/main/java/com/kx/` in [KxSystems/javakdb](https://github.com/KxSystems/javakdb) tag `2.2`, commit `57d7bc80d0dac0884cf43488b37e3060b7cf7d8e`. |
| `javakdb/LICENSE` | The Apache License 2.0 from the same javakdb commit. The repository has no NOTICE file. The build copies this licence into the jar as `META-INF/javakdb/LICENSE`. |
| `../java-api-server.q` | Server script for the recipe, written for this website. |

javakdb's Java 9 multi-release variant of `ByteArrayAccess`
(`javakdb/src/main/java9/`) is not included; the Java 8 implementation is used
on all Java versions.

Adaptations to the TimeStored examples:

- Import `com.kx.c` instead of the older `kx.c`.
- Use `java.time.LocalTime` instead of `java.sql.Time` for the time column.
- `TableQueryExample` also prints the first rows to the console, and opens its
  Swing window only when a display is available.
- `SubscriberExample` prints the row count of each update and stops when the
  connection closes.
- Update comments and messages to refer to a q server on port 5001.

The original examples also included a JDBC example and an older bundled
`kx/c.java`; neither is used here.

## Build

```sh
./build.sh
```

This compiles for Java 8 with `javac --release 8` and writes
`../java-api-examples.jar` with fixed entry timestamps. With the same JDK, the
output is byte-for-byte identical. The committed jar was built with OpenJDK
17.0.20.1. Pass a path to write the jar elsewhere, for example to compare it
with the committed copy:

```sh
./build.sh /tmp/java-api-examples.jar
cmp /tmp/java-api-examples.jar ../java-api-examples.jar
```
