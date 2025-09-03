package commands

import (
	"strconv"
	"time"

	"github.com/saichler/l8collector/go/collector/devices"
	"github.com/saichler/l8pollaris/go/types"
	common2 "github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8web/go/web/client"
	"github.com/saichler/probler/go/prob/prctl/creates"
)

func AddDevices(cmd string, rc *client.RestClient, resources common2.IResources) {
	defer time.Sleep(time.Second)

	for i := 1; i <= 19; i++ {
		device := creates.CreateDevice("10.20.30."+strconv.Itoa(i), 0)
		resp, err := rc.POST("0/"+devices.ServiceName, "Device",
			"", "", device)
		if err != nil {
			resources.Logger().Error(err.Error())
			//return
		}
		_, ok := resp.(*types.Device)
		if ok {
			resources.Logger().Info("Added ", device.DeviceId, " Successfully")
		}
		time.Sleep(time.Millisecond * 500)
	}
	if cmd != "" {
		ip := 1
		sub := 10
		for i := 1; i <= 1000; i++ {
			device := creates.CreateDevice("30.20."+strconv.Itoa(sub)+"."+strconv.Itoa(ip), 0)
			resp, err := rc.POST("0/"+devices.ServiceName, "Device",
				"", "", device)
			if err != nil {
				resources.Logger().Error(err.Error())
				//return
			}
			_, ok := resp.(*types.Device)
			if ok {
				resources.Logger().Info("Added ", device.DeviceId, " Successfully")
			}
			time.Sleep(time.Millisecond * 500)
			ip++
			if ip >= 255 {
				sub++
				ip = 0
			}
		}
	}
}
