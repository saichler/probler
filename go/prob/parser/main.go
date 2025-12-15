package main

import (
	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8parser/go/parser/service"
	"github.com/saichler/l8pollaris/go/pollaris"
	"github.com/saichler/l8types/go/ifs"
	common2 "github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/serializers"
	types3 "github.com/saichler/probler/go/types"
)

func main() {
	resources := common2.CreateResources("parser")
	resources.Logger().SetLogLevel(ifs.Info_Level)
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Start()
	nic.WaitForConnection()

	nic.Resources().Registry().Register(&types3.K8SReadyState{})
	nic.Resources().Registry().Register(&types3.K8SRestartsState{})

	info, err := nic.Resources().Registry().Info("K8SReadyState")
	if err != nil {
		nic.Resources().Logger().Error(err)
	} else {
		info.AddSerializer(&serializers.Ready{})
	}

	info, err = nic.Resources().Registry().Info("K8SRestartsState")
	if err != nil {
		nic.Resources().Logger().Error(err)
	} else {
		info.AddSerializer(&serializers.Restarts{})
	}

	nic.Resources().Registry().RegisterEnums(types3.K8SPodStatus_value)

	//Activate Polaris
	pollaris.Activate(nic)

	//Activate Inventory parser
	service.Activate(common2.NetworkDevice_Links_ID, &types3.NetworkDevice{}, false, nic, "Id")

	//Activate Kubernetes parser
	service.Activate(common2.K8s_Links_ID, &types3.K8SCluster{}, false, nic, "Name")

	resources.Logger().SetLogLevel(ifs.Error_Level)
	common2.WaitForSignal(resources)
}
