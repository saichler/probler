package main

import (
	"os"
	"time"

	"github.com/saichler/l8bus/go/overlay/health"
	"github.com/saichler/l8bus/go/overlay/protocol"
	"github.com/saichler/l8bus/go/overlay/vnet"
	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8reflect/go/reflect/introspecting"
	"github.com/saichler/l8services/go/services/manager"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8types/go/types/l8api"
	"github.com/saichler/l8types/go/types/l8health"
	"github.com/saichler/l8types/go/types/l8sysconfig"
	"github.com/saichler/l8types/go/types/l8web"
	"github.com/saichler/l8utils/go/utils/logger"
	"github.com/saichler/l8utils/go/utils/registry"
	"github.com/saichler/l8utils/go/utils/resources"
	"github.com/saichler/l8web/go/web/server"
	"github.com/saichler/probler/go/types"
	types2 "github.com/saichler/probler/go/types"
)

func main() {
	resources := CreateResources("vnet-" + os.Getenv("HOSTNAME"))
	resources.Logger().SetLogLevel(ifs.Info_Level)
	net := vnet.NewVNet(resources)
	net.Start()
	startWebServer(4443, "/data/layer-8")
}

func startWebServer(port int, cert string) {
	serverConfig := &server.RestServerConfig{
		Host:           protocol.MachineIP,
		Port:           port,
		Authentication: true,
		CertName:       "layer-8",
		Prefix:         "/layer8/",
	}
	svr, err := server.NewRestServer(serverConfig)
	if err != nil {
		panic(err)
	}

	resources := CreateResources("web-" + os.Getenv("HOSTNAME"))

	node, _ := resources.Introspector().Inspect(&types.NetworkDevice{})
	introspecting.AddPrimaryKeyDecorator(node, "Id")

	node, _ = resources.Introspector().Inspect(&types2.K8SCluster{})
	introspecting.AddPrimaryKeyDecorator(node, "Name")

	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Resources().SysConfig().KeepAliveIntervalSeconds = 60
	nic.Start()
	nic.WaitForConnection()

	nic.Resources().Registry().Register(&l8health.L8Top{})
	nic.Resources().Registry().Register(&l8web.L8Empty{})

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

func CreateResources(alias string) ifs.IResources {
	log := logger.NewLoggerImpl(&logger.FmtLogMethod{})
	log.SetLogLevel(ifs.Error_Level)
	res := resources.NewResourcesWithUser(log, &l8api.AuthUser{User: "admin", Pass: "Admin123!"})

	res.Set(registry.NewRegistry())

	sec, err := ifs.LoadSecurityProvider(res)
	if err != nil {
		time.Sleep(time.Second * 10)
		panic(err.Error())
	}
	res.Set(sec)

	conf := &l8sysconfig.L8SysConfig{MaxDataSize: resources.DEFAULT_MAX_DATA_SIZE,
		RxQueueSize:              resources.DEFAULT_QUEUE_SIZE,
		TxQueueSize:              resources.DEFAULT_QUEUE_SIZE,
		LocalAlias:               alias,
		VnetPort:                 uint32(12345),
		KeepAliveIntervalSeconds: 30}
	res.Set(conf)

	res.Set(introspecting.NewIntrospect(res.Registry()))
	res.Set(manager.NewServices(res))

	return res
}
