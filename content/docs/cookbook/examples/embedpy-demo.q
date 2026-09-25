\l p.q
np:.p.import`numpy
show np[`:arange;<]5
p)print("hello from python")
/ q data -> NumPy statistics
prices:100 102 101 105 104f
show np[`:mean;<]prices
show np[`:std;<]prices
/ q table -> pandas -> grouped totals -> q dictionary
pd:.p.import`pandas
trades:([]sym:`AAPL`MSFT`AAPL`MSFT;size:10 20 30 40;price:100 200 102 201f)
df:pd[`:DataFrame.from_dict;flip trades]
show df[`:groupby;`sym][`:sum][`numeric_only pykw 1b][`:to_dict][]`
/ scipy calls a q function while fitting a line
fit:.p.import[`scipy.optimize;`:curve_fit;<]
show first fit[{[x;a;b](a*x)+b};0 1 2 3 4f;1 3 5 7 9f;1 0f]
/ q arrays -> saved matplotlib chart, no GUI required
.p.import[`matplotlib;`:use;`Agg];
plt:.p.import`matplotlib.pyplot
plt[`:plot;til count prices;prices];
plt[`:title;"Prices from q, plotted by Python"];
plt[`:xlabel;"Sample"];
plt[`:ylabel;"Price"];
plt[`:savefig;"prices.png"];
plt[`:close][];
show "DEMO COMPLETE"
\\
