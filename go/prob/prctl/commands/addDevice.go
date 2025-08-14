package commands

import (
	"github.com/saichler/l8collector/go/collector/devices"
	"github.com/saichler/l8pollaris/go/types"
	common2 "github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8web/go/web/client"
	"github.com/saichler/probler/go/prob/prctl/creates"
	"time"
)

func AddDevice(ip string, rc *client.RestClient, resources common2.IResources) {
	defer time.Sleep(time.Second)
	device := creates.CreateDevice(ip, 0)
	resp, err := rc.POST("0/"+devices.ServiceName, "Device",
		"", "", device)
	if err != nil {
		resources.Logger().Error(err.Error())
		return
	}
	_, ok := resp.(*types.Device)
	if ok {
		resources.Logger().Info("Added ", device.DeviceId, " Successfully")
	}
}
