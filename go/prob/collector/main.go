package main

import (
	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8collector/go/collector/common"
	"github.com/saichler/l8collector/go/collector/service"
	"github.com/saichler/l8pollaris/go/pollaris"
	"github.com/saichler/l8types/go/ifs"
	common2 "github.com/saichler/probler/go/prob/common"
)

func main() {
	common.SmoothFirstCollection = true
	res := common2.CreateResources("collector")
	res.Logger().SetLogLevel(ifs.Info_Level)
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()

	//Activate pollaris
	pollaris.Activate(nic)

	//no need to activate with links id k8s as they are the same area for collection
	service.Activate(common2.NetworkDevice_Links_ID, nic)
	common2.WaitForSignal(res)
}
