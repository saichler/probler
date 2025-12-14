package main

import (
	"fmt"
	_ "github.com/lib/pq"
	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8pollaris/go/pollaris/targets"
	"github.com/saichler/l8types/go/ifs"
	common2 "github.com/saichler/probler/go/prob/common"
	"os/exec"
	"time"
)

func main() {
	res := common2.CreateResources("orm")
	res.Logger().SetLogLevel(ifs.Info_Level)
	res.Logger().Info("Starting ORM")
	ifs.SetNetworkMode(ifs.NETWORK_K8s)

	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()
	res.Logger().Info("Registering ORM Services")

	_, user, pass, _, err := nic.Resources().Security().Credential(common2.DB_CREDS, common2.DB_NAME, nic.Resources())
	if err != nil {
		panic("Failed to get security credentials")
	}

	cmd := exec.Command("/usr/bin/bash", "-c", "/start-postgres.sh "+common2.DB_NAME+" "+user+" "+pass)
	_, err = cmd.Output()
	if err != nil {
		fmt.Println(err)
	}

	fmt.Println("Allowing db to load")
	time.Sleep(time.Second * 5)
	targets.Activate(common2.DB_CREDS, common2.DB_NAME, nic)

	common2.WaitForSignal(nic.Resources())
}
