package main

import (
	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8inventory/go/inv/service"
	"github.com/saichler/l8types/go/ifs"
	common2 "github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/serializers"
	types2 "github.com/saichler/probler/go/types"
)

func main() {
	res := common2.CreateResources("k8s")
	res.Logger().SetLogLevel(ifs.Info_Level)
	res.Logger().Info("Starting k8s")
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()
	res.Logger().Info("Registering k8s service")

	//Add the inventory model and mark the Id field as key
	nic.Resources().Introspector().Decorators().AddPrimaryKeyDecorator(&types2.K8SCluster{}, "Name")

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

	nic.Resources().Registry().RegisterEnums(types2.K8SPodStatus_value)
	err = nic.Resources().Introspector().Decorators().AddAlwayOverwriteDecorator("k8scluster.pods")
	if err != nil {
		panic("Failed to register k8s pods")
	}

	//&l8services.L8ServiceLink{ZsideServiceName: common2.ORM_SERVICE, ZsideServiceArea: 1}

	//Activate the box inventory service with the primary key & sample model instance
	inventory.Activate(common2.K8s_Links_ID, types2.K8SCluster{}, types2.K8SClusterList{}, nic, "Name")

	if err != nil {
		res.Logger().Error(err)
	}

	res.Logger().SetLogLevel(ifs.Error_Level)
	common2.WaitForSignal(nic.Resources())
}
