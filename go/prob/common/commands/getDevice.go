package commands

import (
	"fmt"
	"github.com/saichler/l8pollaris/go/pollaris/targets"
	"time"

	"github.com/saichler/l8srlz/go/serialize/object"
	common2 "github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8web/go/web/client"
	"github.com/saichler/probler/go/prob/common"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

func GetDevice(rc *client.RestClient, resources common2.IResources, ip string) {
	defer time.Sleep(time.Second)
	elems, e := object.NewQuery("select * from NetworkDevice where Id="+ip, resources)
	q := elems.(*object.Elements)
	pq := q.PQuery()

	if e != nil {
		fmt.Println("Error: ", e.Error())
		return
	}
	jsn, err := protojson.Marshal(pq)
	fmt.Println(string(jsn))

	cs, _ := targets.Links.Cache(common.NetworkDevice_Links_ID)

	resp, err := rc.GET("0/"+cs, "NetworkDeviceList",
		"", "", pq)
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
