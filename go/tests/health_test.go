package tests

import (
	"fmt"
	"os"
	"testing"

	"github.com/saichler/l8types/go/types/l8health"
	"google.golang.org/protobuf/encoding/protojson"
)

func TestHealth(t *testing.T) {
	top := LoadHealth()
	fmt.Println(top)
}

func LoadHealth() *l8health.L8Top {
	data, err := os.ReadFile("./health.json")
	if err != nil {
		panic(err)
	}
	top := &l8health.L8Top{}
	err = protojson.Unmarshal(data, top)
	if err != nil {
		panic(err)
	}
	return top
}
