package main

import (
	"github.com/saichler/l8inventory/go/inv/service"
	types2 "github.com/saichler/l8inventory/go/types"
	"github.com/saichler/l8pollaris/go/types"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/layer8/go/overlay/vnic"
	common2 "github.com/saichler/probler/go/prob/common"
	"github.com/saichler/reflect/go/reflect/introspecting"
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
	inventoryNode, _ := nic.Resources().Introspector().Inspect(&types2.NetworkDevice{})
	introspecting.AddPrimaryKeyDecorator(inventoryNode, "Id")
	nic.Resources().Registry().Register(&types2.NetworkDeviceList{})

	//Activate the box inventory service with the primary key & sample model instance
	res.Services().RegisterServiceHandlerType(&inventory.InventoryService{})
	_, err := nic.Resources().Services().Activate(inventory.ServiceType, common2.INVENTORY_SERVICE_BOX, common2.INVENTORY_AREA_BOX,
		nic.Resources(), nic, "Id", &types2.NetworkDevice{}, &types.DeviceServiceInfo{ServiceName: common2.ORM_SERVICE, ServiceArea: 0})

	if err != nil {
		res.Logger().Error(err)
	}

	common2.WaitForSignal(nic.Resources())
}
