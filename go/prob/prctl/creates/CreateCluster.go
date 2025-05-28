package creates

import (
	"encoding/base64"
	"github.com/saichler/collect/go/types"
	"github.com/saichler/probler/go/prob/common"
	"os"
)

func CreateCluster(kubeconfig, context string, serviceArea int32) *types.DeviceConfig {
	device := &types.DeviceConfig{}
	device.DeviceId = context
	device.InventoryService = &types.DeviceServiceInfo{ServiceName: common.INVENTORY_SERVICE_K8S,
		ServiceArea: common.INVENTORY_AREA_K8S}
	device.ParsingService = &types.DeviceServiceInfo{ServiceName: common.PARSER_SERVICE_K8s,
		ServiceArea: common.PARSER_AREA_K8S}
	device.Hosts = make(map[string]*types.HostConfig)
	host := &types.HostConfig{}
	host.DeviceId = device.DeviceId

	host.Configs = make(map[int32]*types.ConnectionConfig)
	device.Hosts[device.DeviceId] = host

	k8sConfig := &types.ConnectionConfig{}

	data, err := os.ReadFile(kubeconfig)
	if err != nil {
		panic(err)
	}
	k8sConfig.KubeConfig = base64.StdEncoding.EncodeToString(data)

	k8sConfig.KukeContext = context
	k8sConfig.Protocol = types.Protocol_K8s

	host.Configs[int32(k8sConfig.Protocol)] = k8sConfig

	return device
}
