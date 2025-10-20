package main

import (
	"os"

	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8collector/go/collector/common"
	"github.com/saichler/l8collector/go/collector/service"
	"github.com/saichler/l8collector/go/collector/targets"
	"github.com/saichler/l8parser/go/parser/boot"
	"github.com/saichler/l8pollaris/go/pollaris"
	"github.com/saichler/l8types/go/ifs"
	common2 "github.com/saichler/probler/go/prob/common"
)

func main() {
	common.SmoothFirstCollection = false
	res := common2.CreateResources("collector-" + os.Getenv("HOSTNAME"))
	res.Logger().SetLogLevel(ifs.Info_Level)
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()

	initData := []interface{}{}
	for _, p := range boot.GetAllPolarisModels() {
		initData = append(initData, p)
	}
	initData = append(initData, boot.CreateK8sBootPolls())

	//Activate Polaris
	sla := ifs.NewServiceLevelAgreement(&pollaris.PollarisService{}, pollaris.ServiceName, pollaris.ServiceArea, true, nil)
	sla.SetInitItems(initData)
	nic.Resources().Services().Activate(sla, nic)

	//Activate Targets
	sla = ifs.NewServiceLevelAgreement(&targets.TargetService{}, targets.ServiceName, 0, true, nil)
	nic.Resources().Services().Activate(sla, nic)

	//Activate Collector
	sla = ifs.NewServiceLevelAgreement(&service.CollectorService{}, common.CollectorService, 0, false, nil)
	nic.Resources().Services().Activate(sla, nic)

	res.Logger().SetLogLevel(ifs.Error_Level)

	common2.WaitForSignal(res)
}
