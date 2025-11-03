package main

import (
	"github.com/saichler/l8bus/go/overlay/vnet"
	"github.com/saichler/l8logfusion/go/agent/logserver"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/probler/go/prob/common"
)

func main() {
	resources := common.CreateResources("log-vnet")
	resources.SysConfig().VnetPort = common.LOGS_VNET
	resources.Logger().SetLogLevel(ifs.Info_Level)
	net := vnet.NewVNet(resources, true)
	net.Start()
	logserver.ActivateLogService(net.VnetVnic())
	resources.Logger().Info("logs vnet started!")
	resources.Logger().SetLogLevel(ifs.Error_Level)
	common.WaitForSignal(resources)
}
