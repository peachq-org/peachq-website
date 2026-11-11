package main

import (
	"fmt"
	"log"
	"strings"

	kdb "github.com/sv/kdbgo"
)

func main() {
	con, err := kdb.DialKDB("localhost", 5004, "")
	if err != nil {
		log.Fatal("connect: ", err)
	}
	defer con.Close()

	if _, err := con.Call(".u.sub[`trade;`]"); err != nil {
		log.Fatal("subscribe: ", err)
	}
	for {
		msg, _, err := con.ReadMessage()
		if err != nil {
			log.Fatal("read: ", err)
		}
		parts := msg.Data.([]*kdb.K)
		name := parts[1].Data.(string)
		rows := parts[2].Data.(kdb.Table)
		fmt.Printf("%s update. row 1/%d -> %s\n", name, parts[2].Len(), firstRow(rows))
	}
}

func firstRow(t kdb.Table) string {
	cells := make([]string, len(t.Columns))
	for i, col := range t.Data {
		value := col.Index(0)
		if col.Type == kdb.KC {
			value = string(col.Data.(string)[0])
		}
		cells[i] = fmt.Sprintf("%s:%v", t.Columns[i], value)
	}
	return strings.Join(cells, " ")
}
