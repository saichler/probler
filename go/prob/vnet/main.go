package main

import (
	"github.com/saichler/layer8/go/overlay/vnet"
	common2 "github.com/saichler/probler/go/prob/common"
	"os"
)

func main() {
	resources := common2.CreateResources("vnet-" + os.Getenv("HOSTNAME"))
	net := vnet.NewVNet(resources)
	net.Start()

	common2.WaitForSignal(resources)
}
