---
title: Data types
description: Learn the common q data types by describing one trade, reading what type returns, and working with text, dates, times, nulls and infinities.
---

<!-- peachq: audience="You are learning kdb+/q for the first time as part of a course. You have installed PeachQ and entered a few commands, but know nothing about q types." goal="Write a literal of each common type, read what type returns (negative for atoms, positive for lists), tell char, string and symbol apart, recognise and use nulls and infinities, extract date and time components and get the current date and time." -->

# Data types

In this article we are going to cover the data types that q provides. You will
write a value of each common type, check it with `type`, and learn how q
represents text, dates, times, missing values and infinities. The examples
describe one stock trade: its symbol, price, size, date and time.

<video class="peachq-video" controls preload="none" playsinline src="/video/data-types-HD.mp4" poster="/recordings/data-types/intro-frame.png"></video>

Start PeachQ and enter the examples at its `q)` prompt, or use the **Run**
buttons on this page. In the examples, `q)` marks what you enter; the following
lines show the result. Do not type the prompt itself.

## Every value has a type

Every value in q has a **type**, and the `type` keyword tells you what it is:

<!-- peachq: inline -->

```q
q)type 42
-7h
q)type 42 43 44
7h
```

`42` is a single value, called an **atom**. `42 43 44` is a **list** of three
values of the same kind. Both have type 7, which is `long`, a whole number. The
sign carries the extra information:

- A **negative** type means an atom.
- A **positive** type means a list whose items are all that type.

The trailing `h` shows that `type` returns a small whole number, a `short`.
You will meet `h` again below as a suffix you can type yourself.

A list can also hold values of different types. Its type is `0h`, a **general
list**:

<!-- peachq: inline -->

```q
q)type (1;`a)
0h
```

## Numbers

Start the trade with its size and price:

<!-- peachq: inline -->

```q
q)size:300
q)type size
-7h
q)price:182.35
q)type price
-9h
q)price*size
54705f
```

A whole number such as `300` is a `long` (type 7) unless you say otherwise. A
decimal point makes a `float` (type 9), a number that can hold a fractional
part. Multiplying a float by a long gives a float, which q displays with an `f`
when there is no fractional part to show.

To choose a different numeric type, add a suffix letter:

<!-- peachq: inline -->

```q
q)type 300h
-5h
q)type 300i
-6h
q)type 300j
-7h
q)type 182.35e
-8h
q)type 300f
-9h
```

| Suffix | Type | Holds |
|---|---|---|
| `h` | short | Whole numbers, 2 bytes |
| `i` | int | Whole numbers, 4 bytes |
| `j` | long | Whole numbers, 8 bytes (the default) |
| `e` | real | Decimal numbers, 4 bytes |
| `f` | float | Decimal numbers, 8 bytes (the default) |

For most work, the defaults `long` and `float` are the ones you want. Smaller
types save memory in very large tables.

### Display precision

q shows floats to 7 significant digits by default. The value itself keeps its
full precision. The `\P` system command changes how many digits are shown:

<!-- peachq: inline -->

```q
q)price:182.35
q)price%3
60.78333
q)\P 10
q)price%3
60.78333333
```

`%` is division in q. Setting `\P` affects display only; calculations are
unchanged.

## Booleans and bytes

A **boolean** is true or false, written `1b` or `0b`. Comparisons return
booleans. Several booleans written together form a boolean list:

<!-- peachq: inline -->

```q
q)price:182.35
q)price>100
1b
q)type 1b
-1h
q)type 101b
1h
```

A **byte** is written in hexadecimal after `0x`. Two hex digits make one byte,
so `0x1234ff` is a list of three bytes:

<!-- peachq: inline -->

```q
q)type 0x12
-4h
q)type 0x1234ff
4h
```

## Text: char, string and symbol

q has three ways to hold text, and beginners often mix them up.

A **char** is a single character in double quotes. A **string** is a list of
chars, so it also uses double quotes but has a positive type:

<!-- peachq: inline -->

```q
q)type "a"
-10h
q)type "IBM"
10h
q)count "IBM"
3
```

A **symbol** starts with a backtick. It is a single atom, however many
characters it has. Several symbols written together form a symbol list:

<!-- peachq: inline -->

```q
q)sym:`IBM
q)type sym
-11h
q)count sym
1
q)type `IBM`MSFT
11h
```

The difference shows when you compare values. `=` compares a string character
by character, but compares symbols as whole values. Use `~` (match) to ask
whether two strings are identical:

<!-- peachq: inline -->

```q
q)"IBM"="IBM"
111b
q)`IBM=`IBM
1b
q)"IBM"~"IBM"
1b
```

When should you use each?

| Use | For | Example |
|---|---|---|
| Symbol | Names and codes that repeat, such as stock tickers, exchanges or sides | `` `IBM `` |
| String | Free text you need to search inside or take apart, such as comments or addresses | `"Order filled"` |
| Char | A single character, such as a one-letter code | `"B"` |

The trade's stock is a symbol: there are few tickers, they repeat in every
trade, and you compare them whole. To convert between symbols and strings, see
[Casting and parsing](casting-parsing.md).

## Dates and times

Give the trade a date and an exact timestamp:

<!-- peachq: inline -->

```q
q)tradeDate:2026.09.28
q)type tradeDate
-14h
q)tradeTime:2026.09.28D14:30:15.123456789
q)type tradeTime
-12h
```

A **date** is written year, month and day, separated by dots. A **timestamp**
adds `D` and a time of day with up to nine decimal places, so it is precise to
the nanosecond.

q has several other temporal types. Each has its own literal form:

<!-- peachq: inline -->

```q
q)type 2026.09m
-13h
q)type 14:30:15.123
-19h
q)type 14:30
-17h
q)type 14:30:15
-18h
q)type 0D02:30:00.000000000
-16h
```

| Type | Literal | Holds |
|---|---|---|
| month | `2026.09m` | A calendar month |
| date | `2026.09.28` | A calendar day |
| timestamp | `2026.09.28D14:30:15.123456789` | A date and time, to the nanosecond |
| time | `14:30:15.123` | A time of day, to the millisecond |
| minute | `14:30` | Hours and minutes |
| second | `14:30:15` | Hours, minutes and seconds |
| timespan | `0D02:30:00.000000000` | A length of time, to the nanosecond |

A timestamp is a point in time; a timespan is a duration. `0D02:30:00.000000000`
means zero days, two hours and thirty minutes.

### Get the parts of a date or time

Put a dot and a part name after a variable to read that part:

<!-- peachq: inline -->

```q
q)tradeDate:2026.09.28
q)tradeTime:2026.09.28D14:30:15.123456789
q)tradeDate.year
2026i
q)tradeDate.month
2026.09m
q)tradeTime.date
2026.09.28
q)tradeTime.time
14:30:15.123
```

You can also cast to a part name with `$`. This works on literals as well as
variables, and gives the month, day and hour as whole numbers:

<!-- peachq: inline -->

```q
q)tradeTime:2026.09.28D14:30:15.123456789
q)`mm$tradeTime
9i
q)`dd$tradeTime
28i
q)`hh$tradeTime
14i
q)`minute$tradeTime
14:30
```

Casting to a narrower time type truncates rather than rounds: `14:30:15` becomes
the minute `14:30`.

Dates are counted in days, so you can add days or subtract two dates:

<!-- peachq: inline -->

```q
q)tradeDate:2026.09.28
q)tradeDate+1
2026.09.29
q)tradeDate-2026.01.01
270i
```

### The current date and time

The `.z` namespace holds system values, including the current date and time.
Your output will show the moment you run it:

```q
q).z.d
2026.09.28
q).z.t
18:19:46.660
q).z.p
2026.09.28D18:19:46.660602984
```

`.z.d`, `.z.t` and `.z.p` give the date, time and timestamp in UTC. The
uppercase forms `.z.D`, `.z.T` and `.z.P` give local time.

## Nulls and infinities

A **null** is a missing value. Each type has its own null, written `0N`
followed by the type's letter. A bare `0N` is a long null, and `0n` is a float
null:

<!-- peachq: inline -->

```q
q)type 0N
-7h
q)type 0n
-9h
q)type 0Nd
-14h
q)null 1 0N 3
010b
```

`null` returns `1b` for each missing value. Text has nulls too: the null symbol
is a lone backtick, and the null char is a space:

<!-- peachq: inline -->

```q
q)null `
1b
q)null " "
1b
```

Aggregations such as `sum` skip nulls. That is usually what you want, but check
for nulls before trusting a total built from incomplete data:

<!-- peachq: inline -->

```q
q)sum 1 2 0N 4
7
```

An **infinity** is written `0W`, or `0w` for a float. Put a minus sign in front
for negative infinity. Dividing by zero gives a float infinity, and zero divided
by zero gives a float null:

<!-- peachq: inline -->

```q
q)0W
0W
q)-0W
-0W
q)4%0
0w
q)-4%0
-0w
q)0%0
0n
```

## Data types table

The table below lists the basic types. For every type, including functions,
tables and dictionaries, see the [datatypes reference](../basics/datatypes.md).

The number is what `type` returns for a list; an atom's type is its negative.
The char is the letter used for casting (lowercase) and parsing (uppercase),
as in [Casting and parsing](casting-parsing.md).

A few notes on the table:

- A guid has no literal form. Parse one from text with `"G"$`, for example
  `"G"$"0a369037-75d3-b24d-6721-5a1d44d4bed5"`.
- Datetime is an older type; use timestamp for new work.
- An enumeration stores a symbol as a position in a list of allowed values.
  The example needs that list first, for example `` sym:`IBM`MSFT ``.
- PeachQ displays `0Wh` as `32767h`, its numeric value. `0We` displays as `0we`
  and `0Wz` as `0wz`.

| Type | Char | Number | Size (bytes) | Literal | Null | Infinity |
|---|---|---|---|---|---|---|
| boolean | `b` | 1 | 1 | `1b` | | |
| guid | `g` | 2 | 16 | | `0Ng` | |
| byte | `x` | 4 | 1 | `0x12` | | |
| short | `h` | 5 | 2 | `42h` | `0Nh` | `0Wh` |
| int | `i` | 6 | 4 | `42i` | `0Ni` | `0Wi` |
| long | `j` | 7 | 8 | `42` or `42j` | `0N` or `0Nj` | `0W` or `0Wj` |
| real | `e` | 8 | 4 | `182.35e` | `0Ne` | `0We` |
| float | `f` | 9 | 8 | `182.35` or `182f` | `0n` or `0Nf` | `0w` or `0Wf` |
| char | `c` | 10 | 1 | `"a"` | `" "` | |
| symbol | `s` | 11 | | `` `IBM `` | `` ` `` | |
| timestamp | `p` | 12 | 8 | `2026.09.28D14:30:15.123456789` | `0Np` | `0Wp` |
| month | `m` | 13 | 4 | `2026.09m` | `0Nm` | `0Wm` |
| date | `d` | 14 | 4 | `2026.09.28` | `0Nd` | `0Wd` |
| datetime | `z` | 15 | 8 | `2026.09.28T14:30:15.123` | `0Nz` | `0Wz` |
| timespan | `n` | 16 | 8 | `0D02:30:00.000000000` | `0Nn` | `0Wn` |
| minute | `u` | 17 | 4 | `14:30` | `0Nu` | `0Wu` |
| second | `v` | 18 | 4 | `14:30:15` | `0Nv` | `0Wv` |
| time | `t` | 19 | 4 | `14:30:15.123` | `0Nt` | `0Wt` |
| enumeration | | 20 to 76 | | `` `sym$`IBM `` | | |

## Next steps

- Convert values between these types and read numbers from text in
  [Casting and parsing](casting-parsing.md).
- Look up any type in the [datatypes reference](../basics/datatypes.md) and
  the [`type` keyword](../ref/type.md).
