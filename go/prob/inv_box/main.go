package main

import (
	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8inventory/go/inv/service"
	"github.com/saichler/l8pollaris/go/pollaris/targets"
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

	inventory.Activate(common2.NetworkDevice_Links_ID, &types2.NetworkDevice{}, &types2.NetworkDeviceList{}, nic, "Id")

	s, a := targets.Links.Cache(common2.NetworkDevice_Links_ID)
	invCenter := inventory.Inventory(res, s, a)
	invCenter.AddMetadata("Online", Online)

	res.Logger().SetLogLevel(ifs.Error_Level)
	common2.WaitForSignal(nic.Resources())
}

func Online(any interface{}) (bool, string) {
	if any == nil {
		return false, ""
	}
	nd := any.(*types2.NetworkDevice)
	if nd.Equipmentinfo == nil {
		return false, ""
	}
	if nd.Equipmentinfo.DeviceStatus == types2.DeviceStatus_DEVICE_STATUS_ONLINE {
		return true, ""
	}
	return false, ""
}
