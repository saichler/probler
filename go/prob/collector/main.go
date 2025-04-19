package main

import (
	"github.com/saichler/collect/go/collection/device_config"
	"github.com/saichler/collect/go/collection/poll_config"
	"github.com/saichler/layer8/go/overlay/vnic"
	common2 "github.com/saichler/probler/go/prob/common"
	"github.com/saichler/types/go/common"
	"os"
)

func main() {
	res := common2.CreateResources("vnic-" + os.Getenv("HOSTNAME"))
	common.SetNetworkMode(common.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()

	res.ServicePoints().AddServicePointType(&device_config.DeviceConfigServicePoint{})
	res.ServicePoints().AddServicePointType(&poll_config.PollConfigServicePoint{})

	//Register the collector on service area 0
	//The collector is agnostic to the model, hence there is no reason to vertically scale it via different service areas
	nic.Resources().ServicePoints().Activate(device_config.ServicePointType, device_config.ServiceName, 0, nic.Resources(), nic)

	//The polling config, e.g. what to poll per protocol, is also agnostic to the model, hence always on service are 0
	nic.Resources().ServicePoints().Activate(poll_config.ServicePointType, poll_config.ServiceName, poll_config.ServiceArea, nic.Resources(), nic)

	common2.WaitForSignal(res)
}
