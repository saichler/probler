package main

import (
	"github.com/saichler/collect/go/types"
	"github.com/saichler/l8types/go/ifs"
	types3 "github.com/saichler/l8types/go/types"
	"github.com/saichler/l8web/go/web/server"
	"github.com/saichler/layer8/go/overlay/health"
	"github.com/saichler/layer8/go/overlay/protocol"
	"github.com/saichler/layer8/go/overlay/vnet"
	"github.com/saichler/layer8/go/overlay/vnic"
	common2 "github.com/saichler/probler/go/prob/common"
	types2 "github.com/saichler/probler/go/types"
	"github.com/saichler/reflect/go/reflect/introspecting"
	"os"
)

func main() {
	resources := common2.CreateResources("vnet-" + os.Getenv("HOSTNAME"))
	resources.Logger().SetLogLevel(ifs.Info_Level)
	net := vnet.NewVNet(resources)
	net.Start()
	resources.Logger().Info("vnet started!")
	startWebServer()
}

func startWebServer() {
	serverConfig := &server.RestServerConfig{
		Host:           protocol.MachineIP,
		Port:           443,
		Authentication: false,
		CertName:       "probler",
		Prefix:         common2.PREFIX,
	}
	svr, err := server.NewRestServer(serverConfig)
	if err != nil {
		panic(err)
	}

	resources := common2.CreateResources("web-" + os.Getenv("HOSTNAME"))

	node, _ := resources.Introspector().Inspect(&types.NetworkBox{})
	introspecting.AddPrimaryKeyDecorator(node, "Id")
	node, _ = resources.Introspector().Inspect(&types2.Cluster{})
	introspecting.AddPrimaryKeyDecorator(node, "Name")

	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Resources().SysConfig().KeepAliveIntervalSeconds = 60
	nic.Start()
	nic.WaitForConnection()

	nic.Resources().Registry().Register(&types.PollConfig{})
	nic.Resources().Registry().Register(&types.DeviceConfig{})
	nic.Resources().Registry().Register(&types.NetworkBox{})
	nic.Resources().Registry().Register(&types2.Cluster{})
	nic.Resources().Registry().Register(&types3.Query{})
	nic.Resources().Registry().Register(&types3.Top{})

	hs, ok := nic.Resources().Services().ServiceHandler(health.ServiceName, 0)
	if ok {
		ws := hs.WebService()
		svr.RegisterWebService(ws, nic)
	}

	//Activate the webpoints service
	nic.Resources().Services().RegisterServiceHandlerType(&server.WebEndPointsService{})
	_, err = nic.Resources().Services().Activate(server.ServiceTypeName, server.ServiceName,
		0, nic.Resources(), nic, svr)

	nic.Resources().Logger().Info("Web Server Started!")

	svr.Start()
}
