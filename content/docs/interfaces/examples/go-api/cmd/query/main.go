package main

import (
	"fmt"
	"log"

	kdb "github.com/sv/kdbgo"
)

type summary struct {
	Sym    string
	Trades int64
	Size   int32
}

func main() {
	con, err := kdb.DialKDB("localhost", 5004, "username:password")
	if err != nil {
		log.Fatal("connect: ", err)
	}
	defer con.Close()

	res, err := con.Call("0!select trades:count i,sum size by sym from trade")
	if err != nil {
		log.Fatal("query: ", err)
	}
	table, ok := res.Data.(kdb.Table)
	if !ok {
		log.Fatalf("not a table: q type %d", res.Type)
	}

	syms := table.Data[0].Data.([]string)
	trades := table.Data[1].Data.([]int64)
	sizes := table.Data[2].Data.([]int32)
	fmt.Printf("%-6s %8s %8s\n", table.Columns[0], table.Columns[1], table.Columns[2])
	for i := range syms {
		fmt.Printf("%-6s %8d %8d\n", syms[i], trades[i], sizes[i])
	}

	var rows []summary
	out, err := kdb.UnmarshalTable(table, &rows)
	if err != nil {
		log.Fatal("unmarshal: ", err)
	}
	fmt.Printf("as structs: %+v\n", out.([]summary)[0])

	keyed, err := con.Call("select trades:count i by sym from trade")
	if err != nil {
		log.Fatal("query: ", err)
	}
	fmt.Printf("without 0!: %T\n", keyed.Data)

	res, err = con.Call("til", kdb.Int(10))
	if err != nil {
		log.Fatal("til: ", err)
	}
	fmt.Println("til 10:", res)
}
