# C# API examples

Sources for `../csharp-api-examples.tar.gz`, which the
[C# API article](../../csharp-api.md) offers for download. This folder
is excluded from the website build; the archive contains the same sources.

## Contents

| Path | Source |
|---|---|
| `csharp-api-examples/` | One .NET 8 console project with the `feed`, `query` and `subscribe` commands, written for this website as a C# counterpart of the Java API examples in `../java-api/`. |
| `csharp-api-examples/csharp-api-examples.csproj` | References the `CSharpKDB` 1.7.0 NuGet package (Apache License 2.0, [KxSystems/csharpkdb](https://github.com/KxSystems/csharpkdb)). The package is downloaded by `dotnet build`; it is not included in the archive. |
| `../csharp-api-server.q` | Server script for the recipe, a copy of `../java-api-server.q` written for this website. |

## Build

```sh
./build.sh
```

This compiles the project in a temporary copy when `dotnet` is on the PATH,
then writes `../csharp-api-examples.tar.gz` containing only the `.cs` and
`.csproj` files, with fixed entry timestamps and ownership so the output is
reproducible. Pass a path to write the archive elsewhere, for example to
compare it with the committed copy:

```sh
./build.sh /tmp/csharp-api-examples.tar.gz
cmp /tmp/csharp-api-examples.tar.gz ../csharp-api-examples.tar.gz
```
