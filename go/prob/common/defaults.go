package common

import (
	"github.com/saichler/reflect/go/reflect/introspecting"
	"github.com/saichler/servicepoints/go/points/service_points"
	logger2 "github.com/saichler/shared/go/share/logger"
	"github.com/saichler/shared/go/share/registry"
	"github.com/saichler/shared/go/share/resources"
	"github.com/saichler/types/go/common"
	"github.com/saichler/types/go/types"
)

const (
	PROBLER_VNET = 26000
)

func CreateResources(alias string) common.IResources {
	logger := logger2.NewLoggerImpl(&logger2.FmtLogMethod{})
	_registry := registry.NewRegistry()
	_security, err := common.LoadSecurityProvider("security.so", "/home/run")
	if err != nil {
		panic("Failed to load security provider")
	}
	_config := &types.SysConfig{MaxDataSize: resources.DEFAULT_MAX_DATA_SIZE,
		RxQueueSize: resources.DEFAULT_QUEUE_SIZE,
		TxQueueSize: resources.DEFAULT_QUEUE_SIZE,
		LocalAlias:  alias,
		VnetPort:    uint32(PROBLER_VNET)}
	_introspector := introspecting.NewIntrospect(_registry)
	_servicepoints := service_points.NewServicePoints(_introspector, _config)
	_resources := resources.NewResources(_registry, _security, _servicepoints, logger, nil, nil, _config, _introspector)
	return _resources
}
