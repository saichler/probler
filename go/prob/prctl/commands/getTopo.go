package commands

import (
	"fmt"
	"os"
	"time"

	common2 "github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8types/go/types"
	"github.com/saichler/l8web/go/web/client"
	"github.com/saichler/probler/go/prob/topology/service"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

func GetTopo(cmd string, rc *client.RestClient, resources common2.IResources) {
	defer time.Sleep(time.Second)

	if cmd != "" {
		rc.PUT("0/"+service.ServiceName, "Empty", "", "", &types.Empty{})
		return
	}

	resp, err := rc.GET("0/"+service.ServiceName, "NetworkTopology", "", "", &types.Empty{})
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
	os.WriteFile("/tmp/topo.json", jsn, 0777)
}
