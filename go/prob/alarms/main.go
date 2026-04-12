package main

import (
	"fmt"
	"github.com/saichler/l8alarms/go/alm/services"
	"github.com/saichler/l8alarms/go/alm/ui"
	"github.com/saichler/l8bus/go/overlay/vnic"
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

	services.ActivateAlmServices(nic.Resources().SysConfig().TimeSeriesStoreConfig.Type, nic.Resources().SysConfig().TimeSeriesStoreConfig.Name, nic)
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
