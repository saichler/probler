package main

import (
	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8pollaris/go/pollaris/targets"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/probler/go/prob/common"
	"os/exec"
	"time"
)

func main() {
	res := common.CreateResources("targets")
	res.Logger().SetLogLevel(ifs.Info_Level)
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()

	//Start postgres
	startDb(nic)

	//Activate targets
	targets.Activate(common.DB_CREDS, common.DB_NAME, nic)

	/*
		ts, _ := targets.Targets(nic)
		deviceList := &l8tpollaris.L8PTargetList{}
		deviceList.List = make([]*l8tpollaris.L8PTarget, 0)
		for i := 1; i <= 19; i++ {
			device := creates.CreateDevice("10.20.30."+strconv.Itoa(i), common.NetworkDevice_Links_ID, "sim")
			deviceList.List = append(deviceList.List, device)
		}
		ts.Post(object.New(nil, deviceList), nic)
		cluster := creates.CreateCluster("lab")
		ts.Post(object.New(nil, cluster), nic)
	*/
	common.WaitForSignal(res)
}

func startDb(nic ifs.IVNic) {
	_, user, pass, _, err := nic.Resources().Security().Credential(common.DB_CREDS, common.DB_NAME, nic.Resources())
	if err != nil {
		panic(err)
	}
	cmd := exec.Command("/start-postgres.sh", common.DB_NAME, user, pass)
	err = cmd.Run()
	if err != nil {
		panic(err)
	}
	time.Sleep(time.Second * 5)
}
