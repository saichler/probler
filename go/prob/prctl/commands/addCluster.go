package commands

import (
	common2 "github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8web/go/web/client"
)

func AddCluster(kubeadm, context string, rc *client.RestClient, resources common2.IResources) {
	/*
		defer time.Sleep(time.Second)
		device := creates.CreateCluster(kubeadm, context, 0)
		resp, err := rc.POST("0/"+device_config.ServiceName, "DeviceConfig",
			"", "", device)
		if err != nil {
			resources.Logger().Error(err.Error())
			return
		}
		_, ok := resp.(*types.PollConfig)
		if ok {
			resources.Logger().Info("Added ", device.DeviceId, " Successfully")
		}*/
}
