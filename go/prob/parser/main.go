package main

import (
	"os"

	"github.com/saichler/l8parser/go/parser/boot"
	"github.com/saichler/l8parser/go/parser/service"
	"github.com/saichler/l8pollaris/go/pollaris"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/layer8/go/overlay/vnic"
	common2 "github.com/saichler/probler/go/prob/common"
	types2 "github.com/saichler/probler/go/types"
	types3 "github.com/saichler/probler/go/types"
)

func main() {
	resources := common2.CreateResources("parser-" + os.Getenv("HOSTNAME"))
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Start()
	nic.WaitForConnection()

	nic.Resources().Services().RegisterServiceHandlerType(&service.ParsingService{})
	nic.Resources().Services().RegisterServiceHandlerType(&pollaris.PollarisService{})

	//Register the inventory for NetworkBox as Parser-NetworkBox service name on area 0
	nic.Resources().Services().Activate(service.ServiceType, common2.PARSER_SERVICE_BOX, common2.PARSER_AREA_BOX,
		nic.Resources(), nic, &types3.NetworkDevice{}, "Id", false)

	//Register the inventory for K8s clusters as Parser-Cluster. we need to place it on area 1 as the service point type is the same
	//as the NetworkBox
	nic.Resources().Services().Activate(service.ServiceType, common2.PARSER_SERVICE_K8s,
		common2.PARSER_AREA_K8S, nic.Resources(), nic, &types2.K8SCluster{}, "Name", false)

	//The polling config, e.g. what to poll per protocol, is also agnostic to the model, hence always on service are 0
	nic.Resources().Services().Activate(pollaris.ServiceType, pollaris.ServiceName,
		pollaris.ServiceArea, nic.Resources(), nic)

	ps := pollaris.Pollaris(nic.Resources())
	for _, p := range boot.GetAllPolarisModels() {
		err := ps.Add(p, true)
		if err != nil {
			panic(err)
		}
	}
	ps.Add(boot.CreateK8sBootPolls(), true)

	common2.WaitForSignal(resources)
}
