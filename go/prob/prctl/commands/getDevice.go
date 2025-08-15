package commands

import (
	"fmt"
	"github.com/saichler/l8srlz/go/serialize/object"
	common2 "github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8web/go/web/client"
	"github.com/saichler/probler/go/prob/common"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"time"
)

func GetDevice(rc *client.RestClient, resources common2.IResources, ip string) {
	defer time.Sleep(time.Second)
	q, e := object.NewQuery("select * from NetworkDevice where Id="+ip, resources)
	pq := q.PQuery()

	if e != nil {
		fmt.Println("Error: ", e.Error())
		return
	}
	resp, err := rc.GET("0/"+common.INVENTORY_SERVICE_BOX, "NetworkDeviceList",
		"", "", pq)
	if err != nil {
		resources.Logger().Error("Get Error:", err.Error())
		return
	}
	jsn, err := protojson.Marshal(resp.(proto.Message))
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println(string(jsn))
}
