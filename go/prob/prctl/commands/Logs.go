package commands

import (
	"fmt"

	"github.com/saichler/l8parser/go/parser/boot"
	"github.com/saichler/l8pollaris/go/types"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8web/go/web/client"
	"google.golang.org/protobuf/encoding/protojson"
)

func Logs(rc *client.RestClient, namespace, podname string, resources ifs.IResources) {
	resources.Registry().Register(&types.CJob{})
	job := boot.LogsJob("lab", "lab", "probler-collector", "probler-collector-0")
	jsn, err := protojson.Marshal(job)
	fmt.Println("body:", string(jsn))
	resp, err := rc.POST("0/exec", "CJob", "", "", job)
	if err != nil {
		resources.Logger().Error("POST Error:", err.Error())
		return
	}

	job = resp.(*types.CJob)
	fmt.Println(string(job.Result))
}
