package main

import (
	"os"

	"github.com/saichler/l8pollaris/go/types/l8poll"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8types/go/types/l8api"
	"github.com/saichler/l8types/go/types/l8health"
	"github.com/saichler/l8types/go/types/l8web"
	"github.com/saichler/l8web/go/web/server"
	"github.com/saichler/layer8/go/overlay/health"
	"github.com/saichler/layer8/go/overlay/protocol"
	"github.com/saichler/layer8/go/overlay/vnic"
	common2 "github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/types"
	types2 "github.com/saichler/probler/go/types"
	"github.com/saichler/reflect/go/reflect/introspecting"
)

func main() {
	resources := common2.CreateResources("vnet-" + os.Getenv("HOSTNAME"))
	resources.Logger().SetLogLevel(ifs.Info_Level)
	startWebServer(443, "/data/probler")
}

func startWebServer(port int, cert string) {
	serverConfig := &server.RestServerConfig{
		Host:           protocol.MachineIP,
		Port:           port,
		Authentication: false,
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

	nic.Resources().Registry().Register(&l8poll.L8Pollaris{})
	nic.Resources().Registry().Register(&l8poll.L8C_Target{})
	nic.Resources().Registry().Register(&l8poll.L8C_TargetList{})
	nic.Resources().Registry().Register(&types.NetworkDevice{})
	nic.Resources().Registry().Register(&types.NetworkDeviceList{})
	nic.Resources().Registry().Register(&types2.K8SCluster{})
	nic.Resources().Registry().Register(&types2.K8SClusterList{})
	nic.Resources().Registry().Register(&l8api.L8Query{})
	nic.Resources().Registry().Register(&l8health.L8Top{})
	nic.Resources().Registry().Register(&l8web.L8Empty{})
	nic.Resources().Registry().Register(&l8poll.CJob{})
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
