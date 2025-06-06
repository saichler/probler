package main

import (
	"github.com/saichler/collect/go/collection/parsing"
	"github.com/saichler/collect/go/collection/poll_config"
	"github.com/saichler/collect/go/types"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/layer8/go/overlay/vnic"
	common2 "github.com/saichler/probler/go/prob/common"
	types2 "github.com/saichler/probler/go/types"
	"os"
)

func main() {
	resources := common2.CreateResources("parser-" + os.Getenv("HOSTNAME"))
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Start()
	nic.WaitForConnection()

	nic.Resources().Services().RegisterServiceHandlerType(&parsing.ParsingService{})
	nic.Resources().Services().RegisterServiceHandlerType(&poll_config.PollConfigService{})

	//Register the inventory for NetworkBox as Parser-NetworkBox service name on area 0
	nic.Resources().Services().Activate(parsing.ServiceType, common2.PARSER_SERVICE_BOX, common2.PARSER_AREA_BOX,
		nic.Resources(), nic, &types.NetworkBox{}, "Id")

	//Register the inventory for K8s clusters as Parser-Cluster. we need to place it on area 1 as the service point type is the same
	//as the NetworkBox
	nic.Resources().Services().Activate(parsing.ServiceType, common2.PARSER_SERVICE_K8s,
		common2.PARSER_AREA_K8S, nic.Resources(), nic, &types2.Cluster{}, "Name")

	//The polling config, e.g. what to poll per protocol, is also agnostic to the model, hence always on service are 0
	nic.Resources().Services().Activate(poll_config.ServiceType, poll_config.ServiceName,
		poll_config.ServiceArea, nic.Resources(), nic)

	common2.WaitForSignal(resources)
}
