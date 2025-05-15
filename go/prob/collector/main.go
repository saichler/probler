package main

import (
	"github.com/saichler/collect/go/collection/device_config"
	"github.com/saichler/collect/go/collection/poll_config"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/layer8/go/overlay/vnic"
	common2 "github.com/saichler/probler/go/prob/common"
	"os"
)

func main() {
	res := common2.CreateResources("collector-" + os.Getenv("HOSTNAME"))
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()

	res.Services().RegisterServiceHandlerType(&device_config.DeviceConfigService{})
	res.Services().RegisterServiceHandlerType(&poll_config.PollConfigService{})

	//Register the collector on service area 0
	//The collector is agnostic to the model, hence there is no reason to vertically scale it via different service areas
	nic.Resources().Services().Activate(device_config.ServiceType, device_config.ServiceName, 0, nic.Resources(), nic)

	//The polling config, e.g. what to poll per protocol, is also agnostic to the model, hence always on service are 0
	nic.Resources().Services().Activate(poll_config.ServiceType, poll_config.ServiceName,
		poll_config.ServiceArea, nic.Resources(), nic)

	common2.WaitForSignal(res)
}
