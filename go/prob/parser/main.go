package main

import (
	"os"

	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8parser/go/parser/boot"
	"github.com/saichler/l8parser/go/parser/service"
	"github.com/saichler/l8pollaris/go/pollaris"
	"github.com/saichler/l8reflect/go/reflect/introspecting"
	"github.com/saichler/l8types/go/ifs"
	common2 "github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/serializers"
	types2 "github.com/saichler/probler/go/types"
	types3 "github.com/saichler/probler/go/types"
)

func main() {
	resources := common2.CreateResources("parser-" + os.Getenv("HOSTNAME"))
	resources.Logger().SetLogLevel(ifs.Info_Level)
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Start()
	nic.WaitForConnection()

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

	nic.Resources().Registry().RegisterEnums(types3.K8SPodStatus_value)

	initData := []interface{}{}
	for _, p := range boot.GetAllPolarisModels() {
		initData = append(initData, p)
	}
	initData = append(initData, boot.CreateK8sBootPolls())

	//Activate Polaris
	sla := ifs.NewServiceLevelAgreement(&pollaris.PollarisService{}, pollaris.ServiceName, pollaris.ServiceArea, true, nil)
	sla.SetInitItems(initData)
	nic.Resources().Services().Activate(sla, nic)

	//Activate Inventory parser
	sla = ifs.NewServiceLevelAgreement(&service.ParsingService{}, common2.PARSER_SERVICE_BOX, common2.PARSER_AREA_BOX, false, nil)
	sla.SetServiceItem(&types3.NetworkDevice{})
	sla.SetPrimaryKeys("Id")
	sla.SetArgs(false)
	nic.Resources().Services().Activate(sla, nic)

	//Activate Kubernetes parser
	sla = ifs.NewServiceLevelAgreement(&service.ParsingService{}, common2.PARSER_SERVICE_K8s, common2.PARSER_AREA_K8S, false, nil)
	sla.SetServiceItem(&types2.K8SCluster{})
	sla.SetPrimaryKeys("Name")
	sla.SetArgs(false)
	nic.Resources().Services().Activate(sla, nic)

	resources.Logger().SetLogLevel(ifs.Error_Level)
	common2.WaitForSignal(resources)
}
