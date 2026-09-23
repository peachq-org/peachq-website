/ Read the bundled data and load both scripts using ordinary q commands.
first read0 `:dowjones.csv
/=> "Date,Price"
count get `:dowjones.csv
/=> 649
count get `:price.json
/=> 2628
\l examples/dowjones.q
\l examples/prices.q
select from dowjones where Price=55
/=> | Date       | Price |
/=> | date       | float |
/=> |------------|-------|
/=> | 1914.12.01 | 55    |
count prices
/=> 2628
