package common

import (
	"github.com/saichler/reflect/go/reflect/introspecting"
	"github.com/saichler/servicepoints/go/points/service_points"
	logger2 "github.com/saichler/shared/go/share/logger"
	"github.com/saichler/shared/go/share/registry"
	"github.com/saichler/shared/go/share/resources"
	"github.com/saichler/types/go/common"
	"github.com/saichler/types/go/types"
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

func CreateResources(alias string) common.IResources {
	return CreateResources2(alias, "/home/run")
}

func CreateResources2(alias string, path string) common.IResources {
	logger := logger2.NewLoggerImpl(&logger2.FmtLogMethod{})
	_registry := registry.NewRegistry()
	_security, err := common.LoadSecurityProvider("security.so", path)
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

func WaitForSignal(resources common.IResources) {
	resources.Logger().Info("Waiting for os signal...")
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	sig := <-sigs
	resources.Logger().Info("End signal received! ", sig)
}
