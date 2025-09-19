package main

import (
	"os"

	"github.com/saichler/l8inventory/go/inv/service"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8types/go/types/l8services"
	"github.com/saichler/layer8/go/overlay/vnic"
	common2 "github.com/saichler/probler/go/prob/common"
	types2 "github.com/saichler/probler/go/types"
	"github.com/saichler/reflect/go/reflect/introspecting"
)

func main() {
	res := common2.CreateResources("k8s-" + os.Getenv("HOSTNAME"))
	res.Logger().SetLogLevel(ifs.Info_Level)
	res.Logger().Info("Starting k8s")
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()
	res.Logger().Info("Registering k8s service")
	nic.Resources().Registry().Register(&types2.K8SClusterList{})
	//Add the inventory model and mark the Id field as key
	clusterNode, _ := nic.Resources().Introspector().Inspect(&types2.K8SCluster{})
	introspecting.AddPrimaryKeyDecorator(clusterNode, "Name")

	//Activate the box inventory service with the primary key & sample model instance
	res.Services().RegisterServiceHandlerType(&inventory.InventoryService{})
	_, err := nic.Resources().Services().Activate(inventory.ServiceType, common2.INVENTORY_SERVICE_K8S, common2.INVENTORY_AREA_K8S, nic.Resources(),
		nic, "Name", &types2.K8SCluster{}, &l8services.L8ServiceLink{ZsideServiceName: common2.ORM_SERVICE, ZsideServiceArea: 1})

	if err != nil {
		res.Logger().Error(err)
	}

	res.Logger().SetLogLevel(ifs.Error_Level)
	common2.WaitForSignal(nic.Resources())
}
