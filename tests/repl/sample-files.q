/ Read the bundled data and load both scripts using ordinary q commands.
first read0 `:dowjones.csv
/=> "Date,Price"
count get `:dowjones.csv
/=> 649
count get `:price.json
/=> 2628
\l dowjones.q
\l crypto.q
select from dowjones where Price=55
/=> | Date       | Price |
/=> | date       | float |
/=> |------------|-------|
/=> | 1914.12.01 | 55    |
count crypto
/=> 2628
