package main

import (
	"github.com/saichler/l8alarms/go/alm/services"
	"github.com/saichler/l8alarms/go/alm/ui"
	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/probler/go/prob/common"
	"os"
)

func main() {
	resources := common.CreateResources("alm-" + os.Getenv("HOSTNAME"))
	ui.RegisterAlmTypes(resources)

	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Start()
	nic.WaitForConnection()

	services.ActivateAlmServices(common.DB_CREDS, common.DB_NAME, nic)
	resources.Logger().Info("alm services activated!")
	common.WaitForSignal(resources)
}
