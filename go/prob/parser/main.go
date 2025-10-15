package main

import (
	"os"

	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8parser/go/parser/boot"
	"github.com/saichler/l8parser/go/parser/service"
	"github.com/saichler/l8pollaris/go/pollaris"
	"github.com/saichler/l8reflect/go/reflect/introspecting"
	"github.com/saichler/l8types/go/ifs"
	common2 "github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/serializers"
	types2 "github.com/saichler/probler/go/types"
	types3 "github.com/saichler/probler/go/types"
)

func main() {
	resources := common2.CreateResources("parser-" + os.Getenv("HOSTNAME"))
	resources.Logger().SetLogLevel(ifs.Info_Level)
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Start()
	nic.WaitForConnection()

	clusterNode, _ := nic.Resources().Introspector().Inspect(&types2.K8SCluster{})
	introspecting.AddPrimaryKeyDecorator(clusterNode, "Name")

	ready, err := nic.Resources().Registry().Info("K8SReadyState")
	if err != nil {
		nic.Resources().Logger().Error(err)
	} else {
		ready.AddSerializer(&serializers.Ready{})
	}

	nic.Resources().Services().RegisterServiceHandlerType(&service.ParsingService{})
	nic.Resources().Services().RegisterServiceHandlerType(&pollaris.PollarisService{})

	//Register the inventory for NetworkBox as Parser-NetworkBox service name on area 0
	nic.Resources().Services().Activate(service.ServiceType, common2.PARSER_SERVICE_BOX, common2.PARSER_AREA_BOX,
		nic.Resources(), nic, &types3.NetworkDevice{}, "Id", false)

	//Register the inventory for K8s clusters as Parser-Cluster. we need to place it on area 1 as the service point type is the same
	//as the NetworkBox
	nic.Resources().Services().Activate(service.ServiceType, common2.PARSER_SERVICE_K8s,
		common2.PARSER_AREA_K8S, nic.Resources(), nic, &types2.K8SCluster{}, "Name", false)

	initData := []interface{}{}
	for _, p := range boot.GetAllPolarisModels() {
		initData = append(initData, p)
	}
	initData = append(initData, boot.CreateK8sBootPolls())

	//The polling config, e.g. what to poll per protocol, is also agnostic to the model, hence always on service are 0
	nic.Resources().Services().Activate(pollaris.ServiceType, pollaris.ServiceName,
		pollaris.ServiceArea, nic.Resources(), nic, initData)

	resources.Logger().SetLogLevel(ifs.Error_Level)
	common2.WaitForSignal(resources)
}
