package main

import (
	"os"

	"github.com/saichler/l8bus/go/overlay/vnet"
	"github.com/saichler/l8logfusion/go/agent/logserver"
	"github.com/saichler/l8types/go/ifs"
	common2 "github.com/saichler/probler/go/prob/common"
)

func main() {
	ifs.LogToFiles = true
	resources := common2.CreateResources("vnet-" + os.Getenv("HOSTNAME"))
	resources.Logger().SetLogLevel(ifs.Info_Level)
	net := vnet.NewVNet(resources)
	net.Start()
	resources.Logger().Info("vnet started!")
	resources.Logger().SetLogLevel(ifs.Error_Level)
	logserver.ActivateLogService(net.VnetVnic())
	common2.WaitForSignal(resources)
}
