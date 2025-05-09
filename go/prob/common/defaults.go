package common

import (
	"github.com/saichler/reflect/go/reflect/introspecting"
	"github.com/saichler/l8services/go/services/manager"
	logger2 "github.com/saichler/l8utils/go/utils/logger"
	"github.com/saichler/l8utils/go/utils/registry"
	"github.com/saichler/l8utils/go/utils/resources"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8types/go/types"
	"os"
	"os/signal"
	"syscall"
)

const (
	PROBLER_VNET          = 26000
	ORM_SERVICE           = "MyPostgresOrmService"
	PARSER_SERVICE_BOX    = "Parser-NetworkBox"
	PARSER_SERVICE_K8s    = "Parser-Cluster"
	PARSER_AREA_BOX       = 0
	PARSER_AREA_K8S       = 1
	INVENTORY_SERVICE_BOX = "NetworkBox"
	INVENTORY_AREA_BOX    = 0
	INVENTORY_SERVICE_K8S = "Cluster"
	INVENTORY_AREA_K8S    = 1
	PREFIX                = "/probler/"
)

func CreateResources(alias string) ifs.IResources {
	return CreateResources2(alias, "/home/run")
}

func CreateResources2(alias string, path string) ifs.IResources {
	logger := logger2.NewLoggerImpl(&logger2.FmtLogMethod{})
	_registry := registry.NewRegistry()
	_security, err := ifs.LoadSecurityProvider()
	if err != nil {
		panic("Failed to load security provider")
	}
	_config := &types.SysConfig{MaxDataSize: resources.DEFAULT_MAX_DATA_SIZE,
		RxQueueSize:              resources.DEFAULT_QUEUE_SIZE,
		TxQueueSize:              resources.DEFAULT_QUEUE_SIZE,
		LocalAlias:               alias,
		VnetPort:                 uint32(PROBLER_VNET),
		KeepAliveIntervalSeconds: 30}
	_introspector := introspecting.NewIntrospect(_registry)
	_servicepoints := service_points.NewServicePoints(_introspector, _config)
	_resources := resources.NewResources(_registry, _security, _servicepoints, logger, nil, nil, _config, _introspector)
	return _resources
}

func WaitForSignal(resources ifs.IResources) {
	resources.Logger().Info("Waiting for os signal...")
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	sig := <-sigs
	resources.Logger().Info("End signal received! ", sig)
}
