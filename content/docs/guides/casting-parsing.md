---
title: Casting and parsing
description: Learn to convert numbers and text in q, check invalid input and total a list of prices.
source: https://www.timestored.com/kdb-guides/casting-parsing
---

<!-- peachq: audience="You have installed PeachQ and entered a few simple commands, but have no experience with q types, lists or functions." goal="Distinguish casting a number from parsing text, recognize invalid input, and convert text prices into numbers to calculate a checked total." -->

# Casting and parsing

Convert text prices into numbers you can add together. Along the way, you will
learn how q distinguishes numbers from text, how casting differs from parsing,
and how to check a conversion before trusting its result.

<video class="peachq-video" controls preload="none" playsinline src="/video/casting-parsing-HD.mp4" poster="/recordings/casting-parsing/intro-frame.png"></video>

Start PeachQ and enter the examples at its `q)` prompt. In the examples below,
`q)` marks what you enter; the following lines show the result. Do not type the
prompt itself. For the complete conversion syntax, see the [cast reference](../ref/cast.md).

## Numbers and text are different

Enter these two values:

```q
q)42
42
q)"42"
"42"
```

The first value is a number. The second is text: the quotation marks tell q to
treat the characters `4` and `2` as a string. A **type** describes what kind of
value you have. These values look similar to us, but q needs a number to do
numeric arithmetic.

## Cast an existing number

**Casting** converts an existing value to another type. Use `$` with the target
type on the left and the value on the right:

```q
q)`long$9.4
9
q)`long$9.6
10
```

A `long` is a whole-number type. The backtick in `` `long `` makes the name a
**symbol**, a name value used here to identify the target type. It is different
from the quoted text strings above.

These casts round to the nearest whole number: `9.4` becomes `9`, while `9.6`
becomes `10`. They do not simply discard the decimal part. We use values away
from halfway points here so the rounding is easy to see.

## Parse a number from text

**Parsing** interprets text as a value. Use an uppercase type letter in quotes
on the left of `$`. `"J"` asks q to read a whole number of type `long`:

```q
q)"J"$"42"
42
q)1+("J"$"42")
43
```

The parsed result no longer has quotation marks. It is a number you can add to.
The parentheses group the conversion, so this example first reads `"42"` as a
number and then adds `1`.

For a decimal number, use `"F"` to parse a **float**, a numeric type that can
hold a fractional part:

```q
q)"F"$"12.50"
12.5
```

The trailing zero is formatting in the original text, not part of the numeric
value. The result is still twelve and a half.

## Casting or parsing?

| What you have | What you want to do | Example |
|---|---|---|
| A number, `9.6` | Convert it to a whole-number type | `` `long$9.6 `` |
| Text, `"42"` | Read it as a whole number | `"J"$"42"` |
| Text, `"12.50"` | Read it as a decimal number | `"F"$"12.50"` |

You may also see a lowercase letter used for casting. `"j"` is the short form
of `` `long ``:

```q
q)"j"$9.6
10
```

Case matters: lowercase `"j"` casts; uppercase `"J"` parses text. You do not
need to memorize the full list of type letters to use these examples.

## Convert a list of prices

A **list** holds several values. Put these three strings inside parentheses,
separated by semicolons. The colon assigns the list to a name, `priceText`, so
we can use it again:

```q
q)priceText:("12.50";"3.25";"4.00")
q)priceText
"12.50"
"3.25"
"4.00"
```

Assignment does not print a result. Entering the name displays its value.
Now parse the whole list and save the resulting numbers as `prices`:

```q
q)prices:"F"$priceText
q)prices
12.5 3.25 4
```

The same `"F"$` operation reads each string. q displays this numeric list on one
line, with spaces between its values. `sum` adds the values in a numeric list:

```q
q)sum prices
19.75
```

That total uses valid input. Next, check what happens when a price is not a number.

## Check invalid input before adding

Suppose the second price is the text `"oops"`:

```q
q)badText:("12.50";"oops";"4.00")
q)parsed:"F"$badText
q)parsed
12.5 0n 4
```

The float parser returns `0n` for this invalid text. This is a **null**, meaning
a missing numeric value. It is not the number zero, and it is not a valid price.

Use `null` to check each value, then `any` to ask whether at least one value
is missing:

```q
q)null parsed
010b
q)any null parsed
1b
```

These are **boolean** results: `1` means true and `0` means false. The suffix `b`
marks booleans. `010b` is a list of three answers: only the second value is null.
`1b` says there is at least one null. In `any null parsed`, q first checks
`null parsed`, then applies `any` to those answers.

Do not accept a total while that check returns `1b`. `sum` skips null values,
which could make an incomplete total look successful. Correct the source price
and parse again. Here we restore `3.25`, check all three prices, then add them:

```q
q)priceText:("12.50";"3.25";"4.00")
q)prices:"F"$priceText
q)prices
12.5 3.25 4
q)any null prices
0b
q)sum prices
19.75
```

`0b` means none of these parsed prices is missing. The checked total is `19.75`.
This check detects missing parsed values; it does not decide whether a valid
number is a sensible price for your application.

## Try it yourself

Edit and run these examples to test your understanding. Each run starts fresh;
Reset restores the original code.

### 1. Cast a number

Convert `7.8` to a `long`. What result do you expect?

<!-- peachq: inline -->

```q
q)`long$7.8
8
```

The cast rounds to the nearest whole number, which is 8 here.

### 2. Parse a price

Read the text `"6.75"` as a float.

<!-- peachq: inline -->

```q
q)"F"$"6.75"
6.75
```

Uppercase `"F"` parses the text as a numeric value.

### 3. Find invalid text

Parse `("2.50";"unknown";"1.25")` as floats and check which value is missing.

<!-- peachq: inline -->

```q
q)exercisePrices:"F"$("2.50";"unknown";"1.25")
q)null exercisePrices
010b
```

The second string could not be read as a float. Fix that input before
accepting a total.
