package main

import (
	"os/exec"

	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8pollaris/go/pollaris/targets"
	"github.com/saichler/l8srlz/go/serialize/object"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/prob/common/creates"
)

func main() {
	res := common.CreateResources("targets")
	res.Logger().SetLogLevel(ifs.Info_Level)
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()

	//Activate targets
	targets.Activate(common.DB_CREDS, common.DB_NAME, nic)

	ts, _ := targets.Targets(nic)
	device := creates.CreateDevice("10.20.30.3", common.NetworkDevice_Links_ID, "sim")
	ts.Post(object.New(nil, device), nic)

	cluster := creates.CreateCluster("lab")
	ts.Post(object.New(nil, cluster), nic)

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
}
