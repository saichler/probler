package main

import (
	"os"

	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/layer8/go/overlay/vnet"
	common2 "github.com/saichler/probler/go/prob/common"
)

func main() {
	resources := common2.CreateResources("vnet-" + os.Getenv("HOSTNAME"))
	resources.Logger().SetLogLevel(ifs.Info_Level)
	net := vnet.NewVNet(resources)
	net.Start()
	resources.Logger().Info("vnet started!")
	common2.WaitForSignal(resources)
}
