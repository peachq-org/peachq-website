/ peachq - An open source q.

/ Warning first ever load will take up to 50 seconds.

/ Within this editor:
/ Press Control+Enter to run a line
/ Press Control+E to run the highlighted text

/ It supports most the simple mathematical operations
2+2
10%2
// Both against atoms and lists
1 2 3 - 100 200 10
100 * 1 2 3
where (0=til[1000] mod 5) or 0=til[1000] mod 5

/ storing values
a:13
b:til 10
a + b

// Many of the types are supported
.z.t
.z.d
ts:2019.01.13D12:22:11.1234
`minute$ts
`second$ts

// These behave as you would expect
2013.07.17+1
08:01 + 1 2 3

// Almost all casting and parsing
`int$1.5 2.9
`$"hello world"

// A subset of operations

type `ppp`ooo
l:20?20
l
first l
l 2 3 2 2  / and indexing

/ We can create dictionaries
`a`b`c!1 2 3
/ of various types
`pp`oo`ii!(100 200; 0.1 0.2 0.3; "asda")
type `pp`oo`ii!(100 200; 0.1 0.2 0.3; "asda")

/ and tables
t:([] date:2030.01.01+0 1 2; sym:`pp`oo`ii; time:09:00+ 1 2 3; v:3?10)
t


/ What you are seeing within the web version
/ is a javascript based JVM running the q application.
/ The full version can be downloaded from:
/ http://timestored.com/jq



`a set 13; get "a"
@[neg;1]
a:*[;3];a 2
.[*;2 3]

asc 3 1 2
null 3 0N 1 2

/ Strings
upper "test"
lower "TEst"

// Boolean logic
1100b and 1010b
all 111b
any 0001b

-1^1.1 2.2 0n 4.4 0n 5.5

system "cd"
\cd
