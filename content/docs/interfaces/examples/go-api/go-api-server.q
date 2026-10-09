trade:([]time:`time$();sym:`symbol$();price:`float$();size:`int$();stop:`boolean$();cond:`char$();ex:`char$())
quote:([]sym:`symbol$();bid:`float$();size:`long$())
subs:`int$()
.u.sub:{[t;s] subs,:.z.w; 0#value t}
.u.upd:{[t;x] t insert x; {neg[x] (`upd;y;z)}[;t;x] each subs;}

.z.po:{-1 "open  handle ",string x;}
.z.pc:{subs::subs except x; -1 "close handle ",string x;}
.z.pg:{-1 "query ",$[10h=type x;x;-3!x]; value x}

.z.ts:{n:1+rand 5; .u.upd[`trade;([]time:n#.z.t;sym:n?`A`GM`GOOG`KX;price:(floor 10000*n?1f)%100;size:n?1000i;stop:n?0b;cond:n?"BS";ex:n?"LN")]}
\t 500
