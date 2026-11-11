/ select from `:http and duckdb demo. 
/ parquet, SQL and S3 need DuckDB: the -duckdb release archive, or PEACHQ_DUCKDB_LIB=/path/libduckdb.so
.duckdb.main[];

/ 1. select straight from a CSV over https
dj:select from `:https://peachq.org/repl/files/dowjones.csv
meta dj
select open:first Price, high:max Price, low:min Price, close:last Price, pct:100*-1+last[Price]%first Price by decade:10 xbar Date.year from dj
r:update ret12:-1+exp 12 msum log Price%prev Price from dj
select from r where ret12 in (max;min)@\:ret12

/ 2. select from parquet over https, read in place by DuckDB
t:delete Cabin_q_isnull,Embarked_q_isnull from select from `:https://peachq.org/repl/files/titanic.parquet
select n:count i, survived:avg Survived, avgAge:avg Age, avgFare:avg Fare by Pclass, `$Sex from t
select n:count i, survived:avg Survived by band:10 xbar Age from t where not null Age

/ 3. JSON over https is a table too
crypto:update `$symbol, "F"$price from select from `:https://peachq.org/repl/files/price.json
10#`price xdesc select from crypto where symbol like "*USDT"

/ 4. a DuckDB-backed table under a q name: qSQL and SQL over the same rows, writes go through
`:pq:duckdb:main:titanic/ set t
titanic:get `:pq:duckdb:main:titanic/
select n:count i, survived:avg Survived by Pclass from titanic
s)SELECT Pclass, count(*) AS n, avg(Survived) AS survived FROM titanic GROUP BY Pclass ORDER BY Pclass
`titanic insert update PassengerId:892, Name:enlist "Peach, Mr. Q" from -1#t
s)SELECT PassengerId, Name, Fare FROM titanic ORDER BY PassengerId DESC LIMIT 2
select from titanic where PassengerId>890
-3!titanic

/ 5. SQL straight over a URL
s)SELECT Pclass, Survived, count(*) AS n, round(avg(Age), 1) AS age, round(avg(Fare), 2) AS fare FROM 'https://peachq.org/repl/files/titanic.parquet' GROUP BY ALL ORDER BY ALL

/ 6. S3: a public bucket (Ookla open data, 3.2M rows) as a q table; credentials would be DuckDB secrets too
.duckdb.secret[`ookla;`s3;enlist[`region]!enlist "us-west-2"]
.duckdb.exec[.duckdb.main[];"CREATE OR REPLACE VIEW tiles AS SELECT * FROM 's3://ookla-open-data/parquet/performance/type=mobile/year=2019/quarter=1/2019-01-01_performance_mobile_tiles.parquet'"]
tiles:get `:pq:duckdb:main:tiles/
s)SELECT count(*) AS tiles, round(avg(avg_d_kbps)/1000, 1) AS avg_down_mbps FROM tiles
select tests:sum tests, mbps:avg avg_d_kbps%1000 by tier:100 xbar avg_d_kbps div 1000 from tiles where tests>50

/ 7. the classic pivot, https://stackoverflow.com/a/30791851, on generated data
piv:{[t;k;p;v]
    f:{[v;P]`${raze " " sv x} each string raze P[;0],'/:v,/:\:P[;1]};
    v:(),v; k:(),k; p:(),p;
    G:group flip k!(t:.Q.v t)k;
    F:group flip p!t p;
    key[G]!flip(C:f[v]P:flip value flip key F)!raze
     {[i;j;k;x;y]
      a:count[x]#x 0N;
      a[y]:x y;
      b:count[x]#0b;
      b[y]:1b;
      c:a i;
      c[k]:first'[a[j]@'where'[b j]];
      c}[I[;0];I J;J:where 1<>count'[I:value G]]/:\:[t v;value F]};
n:1000;
trades:([] date:n?2024.01.01+til 3; sym:n?`AAPL`MSFT`GOOG; venue:n?`NYSE`ARCA`BATS; size:100*1+n?10; px:100+n?10f);
agg:select size:sum size, px:avg px by date, sym, venue from trades;
piv[0!agg;`date`sym;`venue;`size`px]
