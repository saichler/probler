package main

import (
	"os"

	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8inventory/go/inv/service"
	"github.com/saichler/l8reflect/go/reflect/introspecting"
	"github.com/saichler/l8types/go/ifs"
	common2 "github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/serializers"
	types2 "github.com/saichler/probler/go/types"
)

func main() {
	ifs.LogToFiles = true
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

	podsNode, ok := nic.Resources().Introspector().Node("k8scluster.pods")
	if !ok {
		nic.Resources().Logger().Error("Failed to get pods node ")
	} else {
		introspecting.AddAlwayOverwriteDecorator(podsNode)
	}

	//&l8services.L8ServiceLink{ZsideServiceName: common2.ORM_SERVICE, ZsideServiceArea: 1}

	//Activate the box inventory service with the primary key & sample model instance
	sla := ifs.NewServiceLevelAgreement(&inventory.InventoryService{}, common2.INVENTORY_SERVICE_K8S, common2.INVENTORY_AREA_K8S, true, nil)
	sla.SetServiceItem(&types2.K8SCluster{})
	sla.SetServiceItemList(&types2.K8SClusterList{})
	sla.SetPrimaryKeys("Name")
	nic.Resources().Services().Activate(sla, nic)
	res.Services().RegisterServiceHandlerType(&inventory.InventoryService{})

	if err != nil {
		res.Logger().Error(err)
	}

	res.Logger().SetLogLevel(ifs.Error_Level)
	common2.WaitForSignal(nic.Resources())
}
