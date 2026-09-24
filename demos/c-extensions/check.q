add:`:./add 2:(`add;2)
show add[2;3]
inc:add 1
show inc each 1 2 3
show type add
show add
show value add
show @[ {add[2;3.5]};0;{x}]
total:`:./add 2:(`total;1)
show total 1 2 3.5
twice:`:./add 2:(`twice;2)
show twice[{x*10};7]
show @[ {`:./add 2:(`nosuch;1)};0;{x}]
show @[ {`:./add 2:(`add;0)};0;{x}]
show "C EXTENSION CHECK COMPLETE"
\\
