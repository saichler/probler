package main

import (
	"os"

	"github.com/saichler/l8inventory/go/inv/service"
	"github.com/saichler/l8pollaris/go/types/l8poll"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/layer8/go/overlay/vnic"
	common2 "github.com/saichler/probler/go/prob/common"
	types2 "github.com/saichler/probler/go/types"
	"github.com/saichler/reflect/go/reflect/introspecting"
)

func main() {
	res := common2.CreateResources("box-" + os.Getenv("HOSTNAME"))
	res.Logger().SetLogLevel(ifs.Info_Level)
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
		nic.Resources(), nic, "Id", &types2.NetworkDevice{}, &l8poll.L8ServiceInfo{ServiceName: common2.ORM_SERVICE, ServiceArea: 0})

	invCenter := inventory.Inventory(res, common2.INVENTORY_SERVICE_BOX, common2.INVENTORY_AREA_BOX)
	invCenter.AddStats("Total", Total)
	invCenter.AddStats("Online", Online)

	if err != nil {
		res.Logger().Error(err)
	}

	res.Logger().SetLogLevel(ifs.Error_Level)
	common2.WaitForSignal(nic.Resources())
}

func Total(any interface{}) bool {
	if any == nil {
		return false
	}
	return true
}

func Online(any interface{}) bool {
	if any == nil {
		return false
	}
	nd := any.(*types2.NetworkDevice)
	if nd.Equipmentinfo == nil {
		return false
	}
	if nd.Equipmentinfo.DeviceStatus == types2.DeviceStatus_DEVICE_STATUS_ONLINE {
		return true
	}
	return false
}
