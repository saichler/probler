package main

import (
	"github.com/saichler/collect/go/collection/device_config"
	"github.com/saichler/collect/go/collection/poll_config"
	"github.com/saichler/collect/go/types"
	"github.com/saichler/l8web/go/web/server"
	"github.com/saichler/layer8/go/overlay/protocol"
	"github.com/saichler/layer8/go/overlay/vnet"
	"github.com/saichler/layer8/go/overlay/vnic"
	common2 "github.com/saichler/probler/go/prob/common"
	types2 "github.com/saichler/probler/go/types"
	"net/http"
	"os"
	"time"
)

func main() {
	resources := common2.CreateResources("vnet-" + os.Getenv("HOSTNAME"))
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

	resources := common2.CreateResources("vnic-" + os.Getenv("HOSTNAME"))
	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Resources().SysConfig().KeepAliveIntervalSeconds = 60
	nic.Start()

	pollConfigEndpoint := server.NewServicePointHandler(poll_config.ServiceName, poll_config.ServiceArea, nic)
	pollConfigEndpoint.AddMethodType(http.MethodPost, &types.PollConfig{})
	pollConfigEndpoint.AddMethodType(http.MethodGet, &types.PollConfig{})

	deviceConfigEndpoint := server.NewServicePointHandler(device_config.ServiceName, 0, nic)
	deviceConfigEndpoint.AddMethodType(http.MethodPost, &types.DeviceConfig{})
	deviceConfigEndpoint.AddMethodType(http.MethodGet, &types.DeviceConfig{})

	boxEndpoint := server.NewServicePointHandler("NetworkBox", 0, nic)
	boxEndpoint.AddMethodType(http.MethodPost, &types.NetworkBox{})
	boxEndpoint.AddMethodType(http.MethodGet, &types.NetworkBox{})

	k8sEndpoint := server.NewServicePointHandler("Cluster", 1, nic)
	k8sEndpoint.AddMethodType(http.MethodPost, &types2.Cluster{})
	k8sEndpoint.AddMethodType(http.MethodGet, &types2.Cluster{})

	svr.AddServicePointHandler(pollConfigEndpoint)
	svr.AddServicePointHandler(deviceConfigEndpoint)
	svr.AddServicePointHandler(boxEndpoint)
	svr.AddServicePointHandler(k8sEndpoint)
	nic.Resources().Logger().Info("Web Server Started!")

	svr.Start()
}
