package main

import (
	"fmt"
	"github.com/saichler/l8alarms/go/alm/services"
	"github.com/saichler/l8alarms/go/alm/ui"
	"github.com/saichler/l8bus/go/overlay/vnic"
	l8c "github.com/saichler/l8common/go/common"
	"github.com/saichler/l8common/go/system"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8types/go/types/l8api"
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

	// Data import templates (SYS > Data Import). l8services' dataimport.Activate
	// (run by the web server) leaves this ORM-backed CRUD service to the app.
	// It lives here, next to the other l8common ORM services: NewOrmSLA puts
	// every such service in replication group L8SG, and a group member on a
	// different node (it used to be probler-orm) gets its requests handled by
	// nodes that do not know the type.
	activateImportTemplates(creds, dbname, nic)

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

func activateImportTemplates(creds, dbname string, nic ifs.IVNic) {
	cb := l8c.NewValidation(&l8api.L8ImportTemplate{}, nic).
		Require(func(v interface{}) string { return v.(*l8api.L8ImportTemplate).Name }, "Name").
		Require(func(v interface{}) string { return v.(*l8api.L8ImportTemplate).TargetModelType }, "TargetModelType").
		Require(func(v interface{}) string { return v.(*l8api.L8ImportTemplate).TargetServiceName }, "TargetServiceName").
		Build()
	sla := l8c.NewOrmSLA("ImprtTmpl", 0, "TemplateId", cb, &l8api.L8ImportTemplate{}, &l8api.L8ImportTemplateList{})
	l8c.ActivateService(sla, creds, dbname, nic)
}
