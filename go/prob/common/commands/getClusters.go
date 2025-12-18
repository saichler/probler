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
)

func GetCluster(rc *client.RestClient, resources common2.IResources, name string) {
	defer time.Sleep(time.Second)
	elems, e := object.NewQuery("select * from k8scluster where Name="+name, resources)
	q := elems.(*object.Elements)
	pq := q.PQuery()

	jsn, _ := protojson.Marshal(pq)
	fmt.Println(string(jsn))

	if e != nil {
		fmt.Println("Error: ", e.Error())
		return
	}

	cs, _ := targets.Links.Cache(common.K8s_Links_ID)

	resp, err := rc.GET("1/"+cs, "K8SClusterList",
		"", "", pq)
	if err != nil {
		resources.Logger().Error("Get Error:", err.Error())
		return
	}
	fmt.Println(resp)
}

func GetClusterOrm(rc *client.RestClient, resources common2.IResources, name string) {
	defer time.Sleep(time.Second)
	elems, e := object.NewQuery("select * from k8scluster where Name="+name, resources)
	q := elems.(*object.Elements)
	pq := q.PQuery()

	jsn, _ := protojson.Marshal(pq)
	fmt.Println(string(jsn))

	if e != nil {
		fmt.Println("Error: ", e.Error())
		return
	}

	cs, _ := targets.Links.Cache(common.K8s_Links_ID)

	resp, err := rc.GET("1/"+cs, "K8SCluster",
		"", "", pq)
	if err != nil {
		resources.Logger().Error("Get Error:", err.Error())
		return
	}
	fmt.Println(resp)
}
