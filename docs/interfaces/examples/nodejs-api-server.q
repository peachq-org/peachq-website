trade:([]time:`timestamp$();sym:`symbol$();price:`float$();size:`int$();stop:`boolean$();cond:`char$();ex:`char$())
subs:`int$()
.u.sub:{[t;s] subs,:.z.w; 0#value t}
.u.upd:{[t;x] t insert x; {neg[x] (`upd;y;z)}[;t;x] each subs;}

.z.po:{-1 "open  handle ",string x;}
.z.pc:{subs::subs except x; -1 "close handle ",string x;}
.z.pg:{-1 "query ",$[10h=type x;x;-3!x]; value x}
