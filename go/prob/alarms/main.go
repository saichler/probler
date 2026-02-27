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
	ui.RegisterAlmTypes(resources)

	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Start()
	nic.WaitForConnection()

	//Start postgres
	startDb(nic)

	services.ActivateAlmServices(common.DB_CREDS, common.DB_ALARMS_NAME, nic)
	resources.Logger().Info("alm services activated!")
	common.WaitForSignal(resources)
}

func startDb(nic ifs.IVNic) {
	_, user, pass, port, err := nic.Resources().Security().Credential(common.DB_CREDS, common.DB_ALARMS_NAME, nic.Resources())
	if err != nil {
		panic(common.DB_CREDS + " " + err.Error())
	}
	fmt.Println("/start-postgres.sh", common.DB_ALARMS_NAME, user, pass)
	cmd := exec.Command("nohup", "/start-postgres.sh", common.DB_ALARMS_NAME, user, pass, port)
	out, err := cmd.Output()
	if err != nil {
		panic(err)
	}
	fmt.Println(string(out))
	time.Sleep(time.Second * 5)
}
