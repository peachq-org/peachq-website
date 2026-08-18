show `pppppp
tables[]
system "p"
\p


/### dyadic functions
1 + 3
/ single atom - expanded to list size
1 + 0 2 4
10 20 30 40 + 15
/ lists of equal length apply item wise
1 2 3 4 + 10 20 30 40


/### relational / logical
15 <= 10 20 30 15
15 < 10 20 30 15
15 > 10 20 30 15
15 >= 10 20 30 15

any 15 < 10 20 30 15
not any 15 < 10 20 30 15
all 15 < 10 20 30 15

// where converts boolean list to list of indices where true
l:10 20 30 15
15<l
where 15<l
l where 15<l

1100b and 1010b
1100b or 1010b
1100b ^ 1010b


/### match / equals
/ equals performs an item-wise comparison
2 = 1 2 3 4 5 4 3 2 1
1 2 3 = 1 2 3

/ equals is tolerant of type and slight differences
1 2 3 = 1 2 3.0
3=1 2 3.00000000000001


/ match checks for full equality of entire object
2 ~ 1 2 3
1 2 3 ~ 1 2 3
/ match demands types are the same
1 2 3 ~ 1 2 3.0

/ this also ensures exact equality
/ equals is tolerant
all 1 2 3.00000000000001 = 1 2 3
1 2 3.00000000000001 ~ 1 2 3


// math
l: 10*til 9
max l
min l
med l
avg l
log l
sqrt l

2 xexp 1 2 3 4 5
1 2 3 4 5 6 7 mod 3

sums l
prds l

3 msum l
3 mavg l

// sets
l: 10 20 30 40 50
k: 20 40 100 1000

l in k
l except k
l inter k
distinct 10 20 20 10 40 30 10

/ general list functions
raze (1 2 3; 60 70 80)

reverse (1 2 3; `A`B`C)
reverse each (1 2 3; `A`B`C)
reverse "hello world"
count 20 10 30

// string maniuplation
string 10 20 30
"hello aa where is aa" ss "aa"
ssr["hello aa where is aa"; "aa"; "bb"]
upper "Hello World!"
lower "Hello World!"
