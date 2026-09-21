package main

import (
	"fmt"
	"github.com/saichler/l8alarms/go/alm/services"
	"github.com/saichler/l8alarms/go/alm/ui"
	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8common/go/system"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/probler/go/prob/common"
	"os"
	"os/exec"
	"time"
)

func main() {
	resources := common.CreateResources("alm-" + os.Getenv("HOSTNAME"))
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	ui.RegisterAlmTypes(resources)

	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Start()
	nic.WaitForConnection()

	//Start postgres
	startDb(nic)

	creds := nic.Resources().SysConfig().TimeSeriesStoreConfig.Type
	dbname := nic.Resources().SysConfig().TimeSeriesStoreConfig.Name

	services.ActivateAlmServices(creds, dbname, nic)

	// Required system services: l8events (Events, area 76 -- what the Events UI tab
	// reads now that the alm-local /10/Event service is gone) plus l8notify (Notify,
	// IntegCfg), which l8alarms needs for notification/escalation delivery.
	// Always through l8common's system.Activate, never by calling the individual
	// Activate* functions -- see layer-8-arch.md.
	system.Activate(creds, dbname, nic)

	resources.Logger().Info("alm services activated!")
	common.WaitForSignal(resources)
}

func startDb(nic ifs.IVNic) {
	_, user, pass, port, err := nic.Resources().Security().Credential(nic.Resources().SysConfig().TimeSeriesStoreConfig.Type, nic.Resources().SysConfig().TimeSeriesStoreConfig.Name, nic.Resources())
	if err != nil {
		panic(nic.Resources().SysConfig().TimeSeriesStoreConfig.Type + " " + nic.Resources().SysConfig().TimeSeriesStoreConfig.Name + " " + err.Error())
	}
	cmd := exec.Command("nohup", "/start-postgres.sh", nic.Resources().SysConfig().TimeSeriesStoreConfig.Name, user, pass, port)
	out, err := cmd.Output()
	if err != nil {
		panic(err)
	}
	fmt.Println(string(out))
	time.Sleep(time.Second * 5)
}
