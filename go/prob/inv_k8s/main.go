package main

import (
	_ "github.com/lib/pq"
	"github.com/saichler/collect/go/collection/inventory"
	"github.com/saichler/collect/go/types"
	"github.com/saichler/layer8/go/overlay/vnic"
	common2 "github.com/saichler/probler/go/prob/common"
	types2 "github.com/saichler/probler/go/types"
	"github.com/saichler/reflect/go/reflect/introspecting"
	"github.com/saichler/types/go/common"
	"os"
)

func main() {
	res := common2.CreateResources("k8s-" + os.Getenv("HOSTNAME"))
	res.Logger().Info("Starting k8s")
	common.SetNetworkMode(common.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()
	res.Logger().Info("Registering k8s service")
	//Add the inventory model and mark the Id field as key
	clusterNode, _ := nic.Resources().Introspector().Inspect(&types2.Cluster{})
	introspecting.AddPrimaryKeyDecorator(clusterNode, "Name")

	//Activate the box inventory service with the primary key & sample model instance
	res.ServicePoints().AddServicePointType(&inventory.InventoryServicePoint{})
	_, err := nic.Resources().ServicePoints().Activate(inventory.ServicePointType, common2.INVENTORY_SERVICE_K8S, common2.INVENTORY_AREA_K8S, nic.Resources(),
		nic, "Name", &types2.Cluster{}, &types.DeviceServiceInfo{ServiceName: common2.ORM_SERVICE, ServiceArea: 1})

	if err != nil {
		res.Logger().Error(err)
	}

	common2.WaitForSignal(nic.Resources())
}
