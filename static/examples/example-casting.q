/ ######## Casting ########

/ The $ symbol is used to perform casting from one native
/ type to another in kdb. The right hand side contains our value,
/ The left hand specifies the type we want to cast to,
/ this can be specified in three ways:
/   1. Type Symbol name
/   2. Type char
/   3. Type short number

`int$7.3
"i"$7.3
6h$7.3

n:7.321
`long$n
"j"$n
7h$n

/ casting rounds integers
"j"$7.5
"j"$7.4
/ depends on binary representation
"j"$7.49999999999999999999999999999999
"e"$8
"f"$8

/ When casting to some types the behaviour may not be intuitive
/ When casting to boolean, Zero/0 is false, everything else is true.
`boolean$9 / anything non-zero is true
`boolean$-9
`boolean$0

/ #### Dates / Times
/ Earlier we saw `int$date returned the underlying value of the bytes. i.e.
/ Dates - number of days since 1st January 2000
/ Times - number of milliseconds since midnight
`int$2000.01.05
`int$00:30:59

/ these can in fact be cast back to date/time etc.
/ where the integer number is the number of units of the smallest measure
`date$4
`second$1859

`time$2
`minute$2
`second$2
`timestamp$2
`timespan$2

/ #### Chars / Symbols ####
`int$"A" / casting char to int returns ascii value
`char$65 / reversible


/ kdb will attempt to convert almost anything, while rarely throwing an error
`time$-1.4  / floats are rounded
`time$"sad" / characters to time!?

`time$`asd / gives an error

/ operations on date time types work on the underlying numeric values
/ types are automatically converted to the more complex type.
2013.07.17+1
2013.07.17+2
09:30:22 + 18
1b+13
2013.08.09D13:05:24.237584000 + 100


/ ######## Parsing ########

/ parsing from strings, use upper case letter
"I"$"99"
"J"$"99"
"E"$"99.5"
"F"$"99.5"


/ dates and times are the same format as expected.
dayb:"2013.07.17"
"D"$dayb;
"D"$"2013-07-17"; / accepts hyphens aswell as dots in dates.

"T"$"10:42:27.824"

/ if we tried the lowercase, it attempts to convert each character to a number instead.
"i"$"99"
"e"$"99.5"

/ any items which fail to parse return a null rather than fail.
"J"$"99.4"
"M"$"2013.03.14"
