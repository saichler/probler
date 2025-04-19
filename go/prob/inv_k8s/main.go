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
	resources := common2.CreateResources("vnic-" + os.Getenv("HOSTNAME"))
	common.SetNetworkMode(common.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Start()

	//Add the k8s cluster model and mark the Name as key
	k8sClusterNode, _ := nic.Resources().Introspector().Inspect(&types2.Cluster{})
	introspecting.AddPrimaryKeyDecorator(k8sClusterNode, "Name")

	//Activate the k8s inventory service with the primary key & sample model instance
	nic.Resources().ServicePoints().Activate(inventory.ServicePointType, common2.INVENTORY_SERVICE_K8S, common2.INVENTORY_AREA_K8S, nic.Resources(),
		nic, "Name", &types2.Cluster{}, &types.DeviceServiceInfo{ServiceName: common2.ORM_SERVICE, ServiceArea: 0})

	common2.WaitForSignal(nic.Resources())
}
