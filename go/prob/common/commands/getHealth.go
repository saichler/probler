package commands

import (
	"fmt"
	"time"

	"github.com/saichler/l8srlz/go/serialize/object"
	common2 "github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8web/go/web/client"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

func GetHealth(rc *client.RestClient, resources common2.IResources) {
	defer time.Sleep(time.Second)
	elems, e := object.NewQuery("select * from L8Health ", resources)
	q := elems.(*object.Elements)
	pq := q.PQuery()

	if e != nil {
		fmt.Println("Error: ", e.Error())
		return
	}
	jsn, err := protojson.Marshal(pq)
	fmt.Println(string(jsn))

	resp, err := rc.GET("0/Health", "L8HealthList", "", "", pq)
	if err != nil {
		resources.Logger().Error("Get Error:", err.Error())
		return
	}
	jsn, err = protojson.Marshal(resp.(proto.Message))
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println(string(jsn))
}
