package main

import (
	"os"

	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8collector/go/collector/common"
	"github.com/saichler/l8collector/go/collector/service"
	"github.com/saichler/l8collector/go/collector/targets"
	"github.com/saichler/l8parser/go/parser/boot"
	"github.com/saichler/l8pollaris/go/pollaris"
	"github.com/saichler/l8types/go/ifs"
	common2 "github.com/saichler/probler/go/prob/common"
)

func main() {
	common.SmoothFirstCollection = false
	res := common2.CreateResources("collector-" + os.Getenv("HOSTNAME"))
	res.Logger().SetLogLevel(ifs.Info_Level)
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()

	res.Services().RegisterServiceHandlerType(&targets.TargetService{})
	res.Services().RegisterServiceHandlerType(&service.CollectorService{})
	res.Services().RegisterServiceHandlerType(&pollaris.PollarisService{})

	//Register the collector on service area 0
	//The collector is agnostic to the model, hence there is no reason to vertically scale it via different service areas
	nic.Resources().Services().Activate(service.ServiceType, common.CollectorService, 0, nic.Resources(), nic)
	nic.Resources().Services().Activate(targets.ServiceType, targets.ServiceName, 0, nic.Resources(), nic)

	initData := []interface{}{}
	for _, p := range boot.GetAllPolarisModels() {
		initData = append(initData, p)
	}
	initData = append(initData, boot.CreateK8sBootPolls())

	//The polling config, e.g. what to poll per protocol, is also agnostic to the model, hence always on service are 0
	nic.Resources().Services().Activate(pollaris.ServiceType, pollaris.ServiceName,
		pollaris.ServiceArea, nic.Resources(), nic, initData)

	res.Logger().SetLogLevel(ifs.Error_Level)

	common2.WaitForSignal(res)
}
