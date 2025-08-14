package commands

import (
	common2 "github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8web/go/web/client"
)

func GetCluster(rc *client.RestClient, resources common2.IResources, name string) {
	/*
		defer time.Sleep(time.Second)
		q, e := object.NewQuery("select * from cluster where Name="+name, resources)
		pq := q.PQuery()

		if e != nil {
			fmt.Println("Error: ", e.Error())
			return
		}
		resp, err := rc.GET("1/"+common.ORM_SERVICE, "Cluster",
			"", "", pq)
		if err != nil {
			resources.Logger().Error("Get Error:", err.Error())
			return
		}
		fmt.Println(resp)
	*/
}
