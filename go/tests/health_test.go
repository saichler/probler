package tests

import (
	"fmt"
	"os"
	"testing"

	"google.golang.org/protobuf/encoding/protojson"
)

func TestHealth(t *testing.T) {
	top := LoadHealth()
	fmt.Println(top)
}

func LoadHealth() *types.Top {
	data, err := os.ReadFile("./health.json")
	if err != nil {
		panic(err)
	}
	top := &types.Top{}
	err = protojson.Unmarshal(data, top)
	if err != nil {
		panic(err)
	}
	return top
}
