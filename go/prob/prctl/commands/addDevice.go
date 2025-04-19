package commands

import (
	"github.com/saichler/collect/go/collection/device_config"
	"github.com/saichler/collect/go/types"
	"github.com/saichler/l8web/go/web/client"
	"github.com/saichler/probler/go/prob/prctl/creates"
	common2 "github.com/saichler/types/go/common"
	"time"
)

func AddDevice(ip string, rc *client.RestClient, resources common2.IResources) {
	defer time.Sleep(time.Second)
	device := creates.CreateDevice(ip)
	resp, err := rc.POST("0/"+device_config.ServiceName, "DeviceConfig",
		"", "", device)
	if err != nil {
		resources.Logger().Error(err.Error())
		return
	}
	_, ok := resp.(*types.PollConfig)
	if ok {
		resources.Logger().Info("Added ", device.DeviceId, " Successfully")
	}
}
