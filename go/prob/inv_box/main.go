package main

import (
	_ "github.com/lib/pq"
	"github.com/saichler/collect/go/collection/inventory"
	"github.com/saichler/collect/go/types"
	"github.com/saichler/layer8/go/overlay/vnic"
	common2 "github.com/saichler/probler/go/prob/common"
	"github.com/saichler/reflect/go/reflect/introspecting"
	"github.com/saichler/l8types/go/ifs"
	"os"
)

func main() {
	res := common2.CreateResources("box-" + os.Getenv("HOSTNAME"))
	res.Logger().Info("Starting box")
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()
	res.Logger().Info("Registering box service")
	//Add the inventory model and mark the Id field as key
	inventoryNode, _ := nic.Resources().Introspector().Inspect(&types.NetworkBox{})
	introspecting.AddPrimaryKeyDecorator(inventoryNode, "Id")

	//Activate the box inventory service with the primary key & sample model instance
	res.Services().RegisterServiceHandlerType(&inventory.InventoryServicePoint{})
	_, err := nic.Resources().Services().Activate(inventory.ServicePointType, common2.INVENTORY_SERVICE_BOX, common2.INVENTORY_AREA_BOX, nic.Resources(),
		nic, "Id", &types.NetworkBox{}, &types.DeviceServiceInfo{ServiceName: common2.ORM_SERVICE, ServiceArea: 0})

	if err != nil {
		res.Logger().Error(err)
	}

	common2.WaitForSignal(nic.Resources())
}
