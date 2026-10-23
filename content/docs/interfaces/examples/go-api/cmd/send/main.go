package main

import (
	"fmt"
	"log"

	kdb "github.com/sv/kdbgo"
)

func main() {
	con, err := kdb.DialKDB("localhost", 5004, "")
	if err != nil {
		log.Fatal("connect: ", err)
	}
	defer con.Close()

	quotes := kdb.NewTable(
		[]string{"sym", "bid", "size"},
		[]*kdb.K{
			kdb.SymbolV([]string{"A", "GM", "KX"}),
			kdb.FloatV([]float64{101.25, 37.5, 12.75}),
			kdb.LongV([]int64{300, 1200, 50}),
		})
	if err := con.AsyncCall("upsert", kdb.Symbol("quote"), quotes); err != nil {
		log.Fatal("send: ", err)
	}

	count, err := con.Call("count quote")
	if err != nil {
		log.Fatal("count: ", err)
	}
	fmt.Printf("sent %d rows; quote now has %v rows\n", quotes.Len(), count)
}
