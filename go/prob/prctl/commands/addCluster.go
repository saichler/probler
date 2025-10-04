package commands

import (
	"time"

	"github.com/saichler/l8collector/go/collector/targets"
	"github.com/saichler/l8pollaris/go/types/l8tpollaris"
	common2 "github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8web/go/web/client"
	"github.com/saichler/probler/go/prob/prctl/creates"
)

func AddCluster(kubeadm, context string, rc *client.RestClient, resources common2.IResources) {
	defer time.Sleep(time.Second)
	device := creates.CreateCluster(kubeadm, context, 0)
	resp, err := rc.POST("0/"+targets.ServiceName, "Device",
		"", "", device)
	if err != nil {
		resources.Logger().Error(err.Error())
		return
	}
	_, ok := resp.(*l8poll.L8Pollaris)
	if ok {
		resources.Logger().Info("Added ", device.TargetId, " Successfully")
	}
}
