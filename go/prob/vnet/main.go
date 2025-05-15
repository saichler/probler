package main

import (
	"github.com/saichler/collect/go/types"
	"github.com/saichler/l8types/go/ifs"
	types3 "github.com/saichler/l8types/go/types"
	"github.com/saichler/l8web/go/web/server"
	"github.com/saichler/layer8/go/overlay/protocol"
	"github.com/saichler/layer8/go/overlay/vnet"
	"github.com/saichler/layer8/go/overlay/vnic"
	common2 "github.com/saichler/probler/go/prob/common"
	types2 "github.com/saichler/probler/go/types"
	"github.com/saichler/reflect/go/reflect/introspecting"
	"os"
	"time"
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
	time.Sleep(time.Second)
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

	/*
		topEnd := server.NewServiceHandler(health.ServiceName, 0, nic)
		topEnd.AddMethodType(http.MethodGet, &types3.Top{})

		pollConfigEndpoint := server.NewServiceHandler(poll_config.ServiceName, poll_config.ServiceArea, nic)
		pollConfigEndpoint.AddMethodType(http.MethodPost, &types.PollConfig{})
		pollConfigEndpoint.AddMethodType(http.MethodGet, &types.PollConfig{})

		deviceConfigEndpoint := server.NewServiceHandler(device_config.ServiceName, 0, nic)
		deviceConfigEndpoint.AddMethodType(http.MethodPost, &types.DeviceConfig{})
		deviceConfigEndpoint.AddMethodType(http.MethodGet, &types.DeviceConfig{})

		boxEndpoint := server.NewServiceHandler("NetworkBox", 0, nic)
		boxEndpoint.AddMethodType(http.MethodPost, &types.NetworkBox{})
		boxEndpoint.AddMethodType(http.MethodGet, &types.NetworkBox{})

		k8sEndpoint := server.NewServiceHandler("Cluster", 1, nic)
		k8sEndpoint.AddMethodType(http.MethodPost, &types2.Cluster{})
		k8sEndpoint.AddMethodType(http.MethodGet, &types2.Cluster{})

		orm1Endpoint := server.NewServiceHandler(common2.ORM_SERVICE, 0, nic)
		orm1Endpoint.AddMethodType(http.MethodGet, &types3.Query{})

		orm2Endpoint := server.NewServiceHandler(common2.ORM_SERVICE, 1, nic)
		orm2Endpoint.AddMethodType(http.MethodGet, &types3.Query{})

		svr.AddServiceHandler(pollConfigEndpoint)
		svr.AddServiceHandler(deviceConfigEndpoint)
		svr.AddServiceHandler(boxEndpoint)
		svr.AddServiceHandler(k8sEndpoint)
		svr.AddServiceHandler(topEnd)
		svr.AddServiceHandler(orm1Endpoint)
		svr.AddServiceHandler(orm2Endpoint)
	*/

	//Activate the webpoints service
	nic.Resources().Services().RegisterServiceHandlerType(&server.WebEndPointsService{})
	_, err = nic.Resources().Services().Activate(server.ServiceTypeName, server.ServiceName,
		0, nic.Resources(), nic, svr)

	nic.Resources().Logger().Info("Web Server Started!")

	svr.Start()
}
