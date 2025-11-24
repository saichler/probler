package main

import (
	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8topology/go/topo/discover"
	"github.com/saichler/l8topology/go/topo/topo_list"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/probler/go/prob/common"
)

func main() {
	resources := common.CreateResources("topo")
	resources.Logger().SetLogLevel(ifs.Info_Level)
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Start()
	nic.WaitForConnection()

	topo_list.Activate(nic)
	discover.ActivateLayer1(nic)

	common.WaitForSignal(resources)
}
