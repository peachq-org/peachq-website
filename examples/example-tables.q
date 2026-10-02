/ ##### Creating a table #####
d:`company`employees!(`ford`bmw;300 100)
/ table = flipped rectangular dictionary
t:flip d

type d
type t

/ table shorthand definition
/ column name to vector data sepearated by semi-colons.
/ the square bracket is for defining keyed tables
t~([] company:`ford`bmw; employees:300 100)

/ must enlist data if creating one row table
([] company:`ford; employees:300)
([] company:enlist `ford; employees:enlist 300)


([] syms:`a`b`c; floats:1.1 2.2 3.3; strings:("bob";"jim";"john"))
([] syms:`a`b`c; chars:"aaa"; times:08:00 08:30 09:00)
/ atoms get expanded to fill columns
([] syms:`a`b`c; num:33)


/ ### empty tables
t:([] company:`ford`bmw; employees:300 100)
meta t
t:([] company:(); employees:())
meta t
t:([] company:`symbol$(); employees:`int$())
meta t
/ where this becomes important later is when we look at inserts


/ ##### Common Table Functions #####
t:([] company:`ford`bmw; employees:300 100)
t
type t
count t
cols t
meta t

/ List the tables that exist
tables `.

/ ##### qsql select query format #####
select from t
select from t where company=`ford


/ ##### inserts #####
t:([] company:(); employees:())
meta t

meta t
insert[`t; ([] company:`subaru`hyundai; employees:55 56)]


/ ##### Accessing #####

t:([] company:`ferrari`ford`rover`bmw`AA; employees:3 66 200 88 1)

/ Three methods to access an unkeyed table
/ qSQL
select from t
/ as a dictionary
t[`company]

/ as a list
-3#t
