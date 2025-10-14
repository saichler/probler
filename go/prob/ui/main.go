package main

import (
	"os"

	"github.com/saichler/l8bus/go/overlay/health"
	"github.com/saichler/l8bus/go/overlay/protocol"
	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8pollaris/go/types/l8tpollaris"
	"github.com/saichler/l8reflect/go/reflect/introspecting"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8types/go/types/l8api"
	"github.com/saichler/l8types/go/types/l8health"
	"github.com/saichler/l8types/go/types/l8web"
	"github.com/saichler/l8web/go/web/server"
	common2 "github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/types"
	types2 "github.com/saichler/probler/go/types"
)

func main() {
	startWebServer(10443, "/data/probler")
}

func startWebServer(port int, cert string) {
	serverConfig := &server.RestServerConfig{
		Host:           protocol.MachineIP,
		Port:           port,
		Authentication: true,
		CertName:       cert,
		Prefix:         common2.PREFIX,
	}
	svr, err := server.NewRestServer(serverConfig)
	if err != nil {
		panic(err)
	}

	resources := common2.CreateResources("web-" + os.Getenv("HOSTNAME"))

	node, _ := resources.Introspector().Inspect(&types.NetworkDevice{})
	introspecting.AddPrimaryKeyDecorator(node, "Id")

	node, _ = resources.Introspector().Inspect(&types2.K8SCluster{})
	introspecting.AddPrimaryKeyDecorator(node, "Name")

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
	nic.Resources().Registry().Register(&types2.NetworkTopology{})

	hs, ok := nic.Resources().Services().ServiceHandler(health.ServiceName, 0)
	if ok {
		ws := hs.WebService()
		svr.RegisterWebService(ws, nic)
	}

	//Activate the webpoints service
	nic.Resources().Services().RegisterServiceHandlerType(&server.WebService{})
	_, err = nic.Resources().Services().Activate(server.ServiceTypeName, ifs.WebService,
		0, nic.Resources(), nic, svr)

	nic.Resources().Logger().Info("Web Server Started!")

	svr.Start()
}
