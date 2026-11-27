---
title: "Typed parameters"
peachq_source: user-docs/typed-parameters.md
peachq_revision: 49be5a234a51c44a393cf353c0ff0f3f85c9cc4c
---

# Typed parameters

A q function signature tells you how many arguments a function takes and what they are called.
With the pattern matching that kdb+ 4.1 added, it can also say what **type** each argument must
be, and how a list argument **unpacks** into names. peachq supports both, in the standard syntax.

```q
q)quote:{[sym:`s;size:`j;price:`f] (sym;size;price)}
q)quote[`IBM;100;1.5]
`IBM
100
1.5
q)quote[`IBM;100;1]
'type
```

| feature | syntax | status |
|---|---|---|
| type checks | ``{[x:`j;y:`f] … }`` | supported |
| list patterns | `{[x;(m;n)] … }` | supported |
| null pattern | `{[x;] … }` | supported |
| filter functions | `{[x:check] … }` | not supported |
| defaults, varargs, named apply | `{[x;y=10] … }`, `{[...rest] … }`, ``.[f;`x`y!1 2]`` | not supported |

## Type checks

Annotate a parameter with `:` and a type symbol.

```q
q)f:{[x:`j;y:`j] x+y}
q)f[1;2]
3
q)f[1f;2]
'type
```

Type checking is **exact**. A float is not accepted where a long is declared, and a long is not
accepted where a float is declared: there is no automatic widening. If you want a float
parameter, pass a float:

```q
q)price:{[p:`f] p*2}
q)price 42
'type
q)price 42f
84f
```

### Atoms and lists

**Lowercase means an atom and uppercase means a list**:

```q
q)atom:{[x:`j] x}
q)atom 5
5
q)atom 1 2 3
'type

q)vec:{[x:`J] sum x}
q)vec 1 2 3
6
q)vec 5
'type
```

This is worth understanding before you annotate: **an annotation narrows a function.** An
unannotated q function often works on both atoms and vectors, and declaring `` `j `` gives that
up.

```q
q)plus:{[x;y] x+y}
q)plus[1 2 3;4]
5 6 7

q)tplus:{[x:`j;y:`j] x+y}
q)tplus[1 2 3;4]
'type
```

Iterators are unaffected, because they pass atoms:

```q
q)tplus[;1] each 1 2 3
2 3 4
```

Annotate where you want the narrowing: boundaries, public entry points, anything called from
somewhere you cannot see. Leave general-purpose internal functions unannotated.

### Type symbols

The type character is the standard one, lowercase for an atom and uppercase for a list:

| symbol | type | | symbol | type | | symbol | type |
|---|---|---|---|---|---|---|---|
| `` `b `` | boolean | | `` `e `` | real | | `` `d `` | date |
| `` `g `` | guid | | `` `f `` | float | | `` `z `` | datetime |
| `` `x `` | byte | | `` `c `` | char | | `` `n `` | timespan |
| `` `h `` | short | | `` `s `` | symbol | | `` `u `` | minute |
| `` `i `` | int | | `` `p `` | timestamp | | `` `v `` | second |
| `` `j `` | long | | `` `m `` | month | | `` `t `` | time |

There is no character for a table, a dictionary, a general list or a function, so those
parameters go unannotated. A type position takes exactly one type character: an unknown
character, a list of characters or a type name is rejected when the function is defined.

```q
q){[x:`q] x}
'parse
q){[x:`J`j] x}
'parse
q){[x:`long] x}
'parse
```

## List patterns

A parameter can be a list pattern in parentheses. The argument is unpacked into the names, which
are local to the function, as any parameter is.

```q
q)r:{[x;(m;n)] x*m+n}
q)r[2;3 4]
14
q)r[2;3 4 5]
'length
```

Patterns nest, and a name inside a pattern can carry a type check of its own:

```q
q)s:{[(a:`j;b);c] (a;b;c)}
q)s[(1;`x);2]
1
`x
2
q)s[(1f;`x);2]
'type
```

The same patterns work on the left of an assignment, where they need parentheses:

```q
q)(a:`j;b:`s):(1;`x)
q)(a:`j;b:`s):(1f;`x)
'type
```

## The null pattern

An empty slot in the parameter list is the null pattern: the function takes that argument and
ignores it.

```q
q)nul:{[x;] x}
q)nul[1;2]
1
```

## Errors

| you get | when |
|---|---|
| `'parse` | the signature itself is not valid, reported when the function is **defined** |
| `'type` | an argument does not match its declared type |
| `'length` | a list argument has a different count from its list pattern |
| `'rank` | too many arguments |

A bad type character is a load-time error: it cannot reach production, because the file will not
load.

## Not supported

| not supported | write this instead |
|---|---|
| filter functions, ``{[x:tempCheck] … }`` | validate on the first line of the body |
| defaults, `{[x;y=10] … }` | test for the argument in the body, or define a projection |
| varargs, `{[...rest] … }` | compose with `enlist`: `` v:('[{x};enlist]) `` makes `v[1;2;3]` give `1 2 3` |
| named apply, ``.[f;`x`y!1 2]`` | pass a dictionary as one argument and index it |
| dictionary and table patterns | index the dictionary or table in the body |

## Portability

Type checks and list patterns use the pattern syntax that kdb+ 4.1 introduced. A function annotated
with type checks, such as this one, uses no PeachQ-specific syntax:

```q
q)portable:{[x:`j;y:`f] x*y}
q)portable[2;1.5]
3f
```
