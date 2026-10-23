/### Defining and Calling Functions

f:{[a] a*a}

/ Create function calculating square of its argument
/ The first square bracket specifies the arguments
/ The remainder of the function body contained within curly braces

/ calling
f[3]
f 5
f@7

/ 2 args
add:{[a;b] a+b}
add[10;3]

/### Anonymous functions

{[a] a*a} 4
{[a;b] a+b}[10;3]

/### Implicit Arguments
/ up to three x/y/z implicit args.
{x*x} 5
{x+y+z}[1;2;3]
{x+z}[1;2;3] / see how this still needed three args

/ ##### variables
f:{a:1; b:2; a+b*x}
f[11]

/ globals
d:10
f:{d+x}
f 1

/ locals take precedence
f:{d:20; d+x}
f 1


/ ##### projection
/ Functions with 1+ argument can have some of the arguments set as constants.
raise:{ x xexp y};

tenToPower:raise[10;];
tenToPower 4
tenToPower:raise 10;

square: raise[;2];
cube: raise[;3];
square 12
cube 3

/ ##### functional form
raise . (2 2 2 2;3 4 5 6)
.[raise; (2 2 2 2;3 4 5 6)]
@[square ; 3 4 5]
@[cube ; 3 4 5]
