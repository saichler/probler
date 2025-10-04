package tests

import (
	"fmt"
	"os"
	"testing"

	"github.com/saichler/l8types/go/types/l8api"
	"google.golang.org/protobuf/encoding/protojson"
)

func TestExamples(t *testing.T) {
	os.Remove("./samples")
	os.Mkdir("./samples", 0777)
	user := &l8api.AuthUser{User: "<user>", Pass: "<password>"}
	jsn, _ := protojson.Marshal(user)
	fmt.Println(string(jsn))

	token := &l8api.AuthToken{Token: "<token>"}
	jsn, _ = protojson.Marshal(token)
	fmt.Println(string(jsn))
}
