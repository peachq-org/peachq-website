\l rinit.q
show Ropen 0
/ a small trade table, reproducible with a fixed seed
\S 42
base:`AAPL`IBM`MSFT!180 140 100f
drift:`AAPL`IBM`MSFT!0.05 -0.03 0.08
trades:([]time:raze 3#'09:30+til 40;sym:120#key base)
trades:update price:base[sym]+(drift[sym]*`int$time-09:30)+-0.5+120?1f from trades
show 3#trades
/ q table -> R data.frame
Rset["trades";trades]
show Rget"class(trades)"
Rcmd"print(head(trades, 3))"
/ R statistics -> q values
Rcmd"stats <- aggregate(price ~ sym, trades, mean)"
show Rget"stats"
show select avg price by sym from trades
Rcmd"fits <- lapply(split(trades, trades$sym), function(d) lm(price ~ time, d))"
Rcmd"coefs <- data.frame(sym = factor(names(fits)), slope = sapply(fits, function(f) coef(f)[[2]]), r2 = sapply(fits, function(f) summary(f)$r.squared))"
show Rget"coefs"
/ call R functions with q arguments
show Rfunc["cor";(exec price from trades where sym=`AAPL;exec price from trades where sym=`MSFT)]
Rcmd"zscore <- function(x) (x - mean(x)) / sd(x)"
show Rfunc["zscore";enlist 100 101 102 103f]
/ R base graphics -> PNG file
Rcmd"plot_sym <- function(s) { d <- trades[trades$sym == s, ]; plot(d$time, d$price, main = s, xlab = 'Minutes after midnight', ylab = 'Price', pch = 19, col = 'grey40'); abline(fits[[s]], col = 'firebrick', lwd = 2) }"
Rcmd"png('trades.png', width = 960, height = 360, pointsize = 15)"
Rcmd"par(mfrow = c(1, 3))"
Rfunc["plot_sym"] each `AAPL`IBM`MSFT;
Roff[];
show Rget"file.exists('trades.png')"
\\
