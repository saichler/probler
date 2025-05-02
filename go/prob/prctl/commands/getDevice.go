package commands

import (
	"fmt"
	"github.com/saichler/l8web/go/web/client"
	"github.com/saichler/probler/go/prob/common"
	"github.com/saichler/serializer/go/serialize/object"
	common2 "github.com/saichler/types/go/common"
	"time"
)

func GetDevice(rc *client.RestClient, resources common2.IResources, ip string) {
	defer time.Sleep(time.Second)
	q, e := object.NewQuery("select * from NetworkBox where Id="+ip, resources)
	pq := q.PQuery()

	if e != nil {
		fmt.Println("Error: ", e.Error())
		return
	}
	resp, err := rc.GET("0/"+common.ORM_SERVICE, "NetworkBox",
		"", "", pq)
	if err != nil {
		resources.Logger().Error("Get Error:", err.Error())
		return
	}
	fmt.Println(resp)
}
