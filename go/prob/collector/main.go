package main

import (
	"github.com/saichler/l8collector/go/collector/common"
	"github.com/saichler/l8collector/go/collector/devices"
	"github.com/saichler/l8collector/go/collector/service"
	"github.com/saichler/l8pollaris/go/pollaris"
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

	res.Services().RegisterServiceHandlerType(&devices.DeviceService{})
	res.Services().RegisterServiceHandlerType(&service.CollectorService{})
	res.Services().RegisterServiceHandlerType(&pollaris.PollarisService{})

	//Register the collector on service area 0
	//The collector is agnostic to the model, hence there is no reason to vertically scale it via different service areas
	nic.Resources().Services().Activate(service.ServiceType, common.CollectorService, 0, nic.Resources(), nic)
	nic.Resources().Services().Activate(devices.ServiceType, devices.ServiceName, 0, nic.Resources(), nic)

	//The polling config, e.g. what to poll per protocol, is also agnostic to the model, hence always on service are 0
	nic.Resources().Services().Activate(pollaris.ServiceType, pollaris.ServiceName,
		pollaris.ServiceArea, nic.Resources(), nic)

	common2.WaitForSignal(res)
}
