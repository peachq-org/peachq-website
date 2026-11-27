---
title: Debugging q code
description: Find and fix a failing q function with the error display, the q)) debugger, stack navigation, Ctrl-C, temporary breakpoints and .Q.trp backtraces.
---

<!-- peachq: audience="You write q regularly and know lambdas, lists, tables and common errors, but have not used the q)) debugger seriously." goal="Find and fix a failing function using the error display, the q)) debugger, stack navigation, resume and abort, Ctrl-C, a temporary breakpoint and .Q.trp backtrace logging." -->

# Debugging q code

When a q function fails, the error already tells you which function failed and
which primitive inside it. The `q))` debugger then lets you look inside the
suspended function, walk up to its callers, and either resume or abandon the
call. This guide chases one bad order through a small batch calculation, then
interrupts slow and runaway loops, adds a temporary breakpoint and logs a
backtrace without suspending.

!!! info "PeachQ 0.91 or later"
    Earlier releases suspend at `q))` and have `.Q.bt` and `.Q.trp`. The caret
    under the failing primitive, suspending and continuing after Ctrl-C, traps
    that catch Ctrl-C, and some stack and backtrace details shown here arrived
    in 0.91.

<video class="peachq-video" controls preload="none" playsinline src="/video/debugging-HD.mp4" poster="/recordings/debugging/intro-frame.png"></video>

Start PeachQ with `./q` and enter the examples at its console. `q)` and `q))`
mark what you enter;
the following lines show the result. For the full list of debugger commands, see
the [debugging reference](../basics/debug.md).

## A batch with one bad order

Each order has a quantity and a price. `orderValue` multiplies them for one
order, and `batchTotal` adds the values for a whole batch. The third order
arrived with the symbol `` `tbd `` in its price field:

```q
q)batch:([] id:1 2 3; qty:100 50 200; price:(10.5;20.25;`tbd))
q)orderValue:{[o] o[`qty]*o`price}
q)batchTotal:{[b] sum orderValue each b}
q)batch
| id   | qty  | price |
| long | long |       |
|------|------|-------|
| 1    | 100  | 10.5  |
| 2    | 50   | 20.25 |
| 3    | 200  | `tbd  |
q)batchTotal 2#batch
2062.5
```

The first two orders total `2062.5`. The empty type under `price` is a hint:
the column is a mixed list, not floats.

## Read the error

An error in an expression typed at the `q)` prompt prints and returns to `q)`:

```q
q)200*`tbd
'type
  [0]  200*`tbd
          ^
```

The first line is the error name. The next line is a stack frame: its number in
brackets, then the source. The caret sits under the primitive that failed, here
the multiplication.

An error inside a function prints the same way, then suspends execution:

```q
q)batchTotal batch
'type
  [2]  orderValue:{[o] o[`qty]*o`price}
                              ^
q))
```

Frame `[2]` is `orderValue`, called from `batchTotal` at frame `[1]`, called
from your input at frame `[0]`. The caret points at the `*`. The extra `)` in
the prompt means the call is suspended: `orderValue` is still running, and you
are inside it.

## Look inside the suspended function

At `q))`, expressions run in the scope of the suspended function, so its
arguments and locals are available by name:

```q
q))o
id   | 3
qty  | 200
price| `tbd
q))o`qty
200
```

`.z.ex` holds the primitive that failed and `.z.ey` its arguments:

```q
q)).z.ex
*
q)).z.ey
200
`tbd
```

The failure is `` 200*`tbd ``: order 3 has a symbol where a price belongs.

## Walk the stack

Enter `` ` `` to move up one frame to the caller and `.` to move back down.
Each move prints the frame you arrive at:

```q
q))`
  [1]  batchTotal:{[b] sum orderValue each b}
                                      ^
```

Now names resolve in `batchTotal`, so `b` is the whole batch. Find every order
whose price is not a float atom (type `-9h`):

```q
q))where -9h<>type each b`price
,2
```

Only row 2, the order with id 3, is bad. Moving further up reaches your input,
and `.` comes back down:

```q
q))`
  [0]  batchTotal batch
       ^
q)).
  [1]  batchTotal:{[b] sum orderValue each b}
                                      ^
```

`&` repeats the error and the current frame. `.Q.bt[]` prints the whole stack,
with `>>` marking where you are:

```q
q))&
'type
  [1]  batchTotal:{[b] sum orderValue each b}
                                      ^
q)).Q.bt[]
  [2]  orderValue:{[o] o[`qty]*o`price}
                              ^
>>[1]  batchTotal:{[b] sum orderValue each b}
                                      ^
  [0]  batchTotal batch
       ^
q)).
  [2]  orderValue:{[o] o[`qty]*o`price}
                              ^
```

## Resume, abort or signal

`:value` resumes the suspended call, using `value` as the result of the
operation that failed. Here `0f` stands in for `` 200*`tbd ``, so `orderValue`
returns `0f` for order 3 and the batch finishes:

```q
q)):0f
2062.5
q)
```

That total quietly leaves out order 3, so treat resuming as a way to see what
happens next rather than a fix.

To abandon the call instead, enter `\`. Debug sessions can nest: an error in a
function you call at `q))` suspends again, one level deeper, and each `\` leaves
one level. The deeper frame numbers count the frames of the outer suspension
and of the debugger itself:

```q
q)batchTotal batch
'type
  [2]  orderValue:{[o] o[`qty]*o`price}
                              ^
q))orderValue o
'type
  [5]  orderValue:{[o] o[`qty]*o`price}
                              ^
q)))o
id   | 3
qty  | 200
price| `tbd
q)))\
q))
```

Entering `'name` at `q))` signals that error from the deepest frame and removes
the frame, leaving you suspended in its caller:

```q
q))'badprice
'badprice
  [1]  batchTotal:{[b] sum orderValue each b}
                                      ^
q))\
q)
```

With the debugger closed, fix the data and run the batch again:

```q
q)fixed:update price:20.0 from batch where id=3
q)fixed
| id   | qty  | price |
| long | long | float |
|------|------|-------|
| 1    | 100  | 10.5  |
| 2    | 50   | 20.25 |
| 3    | 200  | 20    |
q)batchTotal fixed
6062.5
```

The `price` column is now `float`, and all three orders count.

## Interrupt a long-running loop

Ctrl-C does not have to end a long calculation. `countTo` is a slow but correct
loop:

```q
q)countTo:{[n] i:0;while[i<n;i+:1];i}
q)countTo 10000000
```

Press Ctrl-C while it runs. If it finishes first, add a zero to `n`. q signals `'stop` and suspends inside the loop, so
you can check its progress. The caret and the value of `i` depend on when you
press the keys:

```q
'stop
  [1]  countTo:{[n] i:0;while[i<n;i+:1];i}
                                   ^
q))i
1618906
```

A bare `:` continues the loop from where it stopped, and the call returns its
result as normal:

```q
q)):
10000000
```

Inside Trap or `.Q.trp`, Ctrl-C does not suspend. The handler receives `stop`
and q stays at `q)`:

```q
q)spin:{[n] i:0;while[1;i+:1]}
q)@[spin;0;{"caught: ",x}]
"caught: stop"
```

## Stop a runaway loop

`firstGap` should return the first id missing from a list, but it never
returns:

```q
q)firstGap:{[ids] i:1;while[i in ids;i+1];i}
q)firstGap 1 2 3
```

Press Ctrl-C and look at the loop counter. The caret depends on when you press
the keys:

```q
'stop
  [1]  firstGap:{[ids] i:1;while[i in ids;i+1];i}
                                           ^
q))i
1
q))ids
1 2 3
```

`i` is still `1` because `i+1` computes a value and throws it away. The update
needs `i+:1`. Abort, fix and run it again:

```q
q))\
q)firstGap:{[ids] i:1;while[i in ids;i+:1];i}
q)firstGap 1 2 3
4
```

## Add a temporary breakpoint

To inspect a function that does not fail, insert a signal where you want it to
stop. Here `'bp` stops `batchTotal` after it computes the order values and
before it adds them:

```q
q)batchTotal:{[b] v:orderValue each b;'bp;sum v}
q)batchTotal fixed
'bp
  [1]  batchTotal:{[b] v:orderValue each b;'bp;sum v}
                                            ^
q))v
1050 1012.5 4000
q)):
6062.5
```

A bare `:` resumes, and the function carries on to return `sum v`. Restore the
original definition when you are done, so the breakpoint does not stop the next
caller:

```q
q)batchTotal:{[b] sum orderValue each b}
```

## Log a backtrace instead of suspending

A server or scheduled job cannot wait at `q))`. [Trap](../ref/apply.md#trap-at)
catches the error and keeps going, but its handler receives only the error name:

```q
q)@[batchTotal;batch;{"batchTotal failed: ",x}]
"batchTotal failed: type"
```

That does not say which order or which function failed. `.Q.trp` works like
trap, and also passes the backtrace to the handler as a second argument.
`.Q.sbt` formats it as text and `2@` writes it to stderr. The handler returns
`0n` as the result:

```q
q).Q.trp[batchTotal;batch;{2@"batchTotal failed: ",x,"\n",.Q.sbt y;0n}]
batchTotal failed: type
  [3]  orderValue:{[o] o[`qty]*o`price}
                              ^
  [2]  batchTotal:{[b] sum orderValue each b}
                                      ^
  [1]  (.Q.trp)

  [0]  .Q.trp[batchTotal;batch;{2@"batchTotal failed: ",x,"\n",.Q.sbt y;0n}]
       ^
0n
q)
```

The log names the function and the failing primitive, and q stays at `q)`.
When the batch is good, the handler is not called:

```q
q).Q.trp[batchTotal;fixed;{2@"batchTotal failed: ",x,"\n",.Q.sbt y;0n}]
6062.5
```

## Differences from kdb+

These PeachQ behaviours affect the techniques above:

- **Some keywords do not suspend inside themselves.** The
  [debugging reference](../basics/debug.md) notes that many kdb+ keywords are
  defined as lambdas and can suspend inside their own code. PeachQ implements
  many keywords, such as `ssr`, natively, so the error suspends in your function,
  with the caret under the keyword. Keywords still defined in q, such as `xasc`,
  can suspend inside their own code as in kdb+:

    ```q
    q)tag:{[s;n] ssr[s;"tbd";n]}
    q)tag["price tbd";0]
    'type
      [1]  tag:{[s;n] ssr[s;"tbd";n]}
                      ^
    ```

- **Deep recursion signals `'limit`.** The kdb+ [error list](../basics/errors.md#stack)
  documents `'stack` for running out of stack space. PeachQ signals `'limit`
  after about 2,000 nested calls and suspends in the deepest one. This is not
  the kdb+ `'limit` error, which reports a list too long to create:

    ```q
    q)r:{r x+1}
    q)r 0
    'limit
      [2046]  r:{r x+1}
                    ^
    ```

## Further reading

- [Debugging](../basics/debug.md): every debugger command, error trap modes and
  how system commands appear on the stack.
- [`.Q.bt`](../ref/dotq.md#bt-backtrace), [`.Q.trp`](../ref/dotq.md#trp-extend-trap-at)
  and [`.Q.sbt`](../ref/dotq.md#sbt-string-backtrace): printing, trapping and
  formatting backtraces.
- [Signal](../ref/signal.md): raising your own errors with `'`.
