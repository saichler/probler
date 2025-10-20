package main

import (
	"os"

	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/prob/topology/service"
)

func main() {
	resources := common.CreateResources("topo-" + os.Getenv("HOSTNAME"))
	resources.Logger().SetLogLevel(ifs.Info_Level)
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Start()
	nic.WaitForConnection()

	nic.Resources().Services().RegisterServiceHandlerType(&service.TopologyService{})

	//Register the topo service
	sla := ifs.NewServiceLevelAgreement(&service.TopologyService{}, service.ServiceName, service.ServiceArea, true, nil)
	nic.Resources().Services().Activate(sla, nic)

	common.WaitForSignal(resources)
}
