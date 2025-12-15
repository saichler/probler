package main

import (
	"strconv"

	"github.com/saichler/l8bus/go/overlay/health"
	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8logfusion/go/types/l8logf"
	"github.com/saichler/l8pollaris/go/types/l8tpollaris"
	"github.com/saichler/l8topology/go/types/l8topo"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8types/go/types/l8api"
	"github.com/saichler/l8types/go/types/l8health"
	"github.com/saichler/l8types/go/types/l8web"
	"github.com/saichler/l8utils/go/utils/ipsegment"
	"github.com/saichler/l8web/go/web/server"
	"github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/types"
	types2 "github.com/saichler/probler/go/types"
)

func main() {
	startWebServer(2443, "/data/probler")
}

func startWebServer(port int, cert string) {
	serverConfig := &server.RestServerConfig{
		Host:           ipsegment.MachineIP,
		Port:           port,
		Authentication: true,
		CertName:       cert,
		Prefix:         common.PREFIX,
	}
	svr, err := server.NewRestServer(serverConfig)
	if err != nil {
		panic(err)
	}

	nic1 := createVnic(common.PROBLER_VNET)
	nic2 := createVnic(common.LOGS_VNET)

	hs, ok := nic1.Resources().Services().ServiceHandler(health.ServiceName, 0)
	if ok {
		ws := hs.WebService()
		svr.RegisterWebService(ws, nic1)
	}

	//Activate the webpoints service
	sla := ifs.NewServiceLevelAgreement(&server.WebService{}, ifs.WebService, 0, false, nil)
	sla.SetArgs(svr, nic2)
	nic1.Resources().Services().Activate(sla, nic1)

	nic1.Resources().Logger().Info("Web Server Started!")

	svr.Start()
}

func createVnic(vnet uint32) ifs.IVNic {
	resources := common.CreateResources("web-" + strconv.Itoa(int(vnet)))
	resources.SysConfig().VnetPort = vnet

	resources.Introspector().Decorators().AddPrimaryKeyDecorator(&types.NetworkDevice{}, "Id")
	resources.Introspector().Decorators().AddPrimaryKeyDecorator(&types2.K8SCluster{}, "Name")

	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Resources().SysConfig().KeepAliveIntervalSeconds = 60
	nic.Start()
	nic.WaitForConnection()

	nic.Resources().Registry().Register(&l8tpollaris.L8Pollaris{})
	nic.Resources().Registry().Register(&l8tpollaris.L8PTarget{})
	nic.Resources().Registry().Register(&l8tpollaris.L8PTargetList{})
	nic.Resources().Registry().Register(&types.NetworkDevice{})
	nic.Resources().Registry().Register(&types.NetworkDeviceList{})
	nic.Resources().Registry().Register(&types2.K8SCluster{})
	nic.Resources().Registry().Register(&types2.K8SClusterList{})
	nic.Resources().Registry().Register(&l8api.L8Query{})
	nic.Resources().Registry().Register(&l8health.L8Top{})
	nic.Resources().Registry().Register(&l8web.L8Empty{})
	nic.Resources().Registry().Register(&l8tpollaris.CJob{})
	nic.Resources().Registry().Register(&l8health.L8Health{})
	nic.Resources().Registry().Register(&l8health.L8HealthList{})
	nic.Resources().Registry().Register(&l8logf.L8File{})

	nic.Resources().Registry().Register(&l8topo.L8Topology{})
	nic.Resources().Registry().Register(&l8topo.L8TopologyQuery{})

	nic.Resources().Introspector().Decorators().AddPrimaryKeyDecorator(&l8topo.L8TopologyMetadata{}, "ServiceName", "ServiceArea")
	nic.Resources().Introspector().Decorators().AddPrimaryKeyDecorator(&l8tpollaris.L8PTarget{}, "TargetId")

	nic.Resources().Registry().Register(&l8topo.L8TopologyMetadataList{})
	nic.Resources().Registry().Register(&l8topo.L8TopologyMetadata{})

	nic.Resources().Introspector().Decorators().AddPrimaryKeyDecorator(&l8logf.L8File{}, "Path", "Name")
	return nic
}
