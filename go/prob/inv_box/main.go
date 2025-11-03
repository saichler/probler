package main

import (
	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8inventory/go/inv/service"
	"github.com/saichler/l8types/go/ifs"
	common2 "github.com/saichler/probler/go/prob/common"
	types2 "github.com/saichler/probler/go/types"
)

func main() {
	res := common2.CreateResources("box")
	res.Logger().SetLogLevel(ifs.Info_Level)
	res.Logger().Info("Starting box")
	ifs.SetNetworkMode(ifs.NETWORK_K8s)

	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()
	res.Logger().Info("Registering box service")

	/*&l8services.L8ServiceLink{ZsideServiceName: common2.ORM_SERVICE, ZsideServiceArea: 0}*/

	sla := ifs.NewServiceLevelAgreement(&inventory.InventoryService{}, common2.INVENTORY_SERVICE_BOX, common2.INVENTORY_AREA_BOX, true, nil)
	sla.SetServiceItem(&types2.NetworkDevice{})
	sla.SetServiceItemList(&types2.NetworkDeviceList{})
	sla.SetPrimaryKeys("Id")
	_, err := nic.Resources().Services().Activate(sla, nic)

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
