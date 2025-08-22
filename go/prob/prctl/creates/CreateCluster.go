package creates

import (
	"encoding/base64"
	"os"

	"github.com/saichler/l8pollaris/go/types"
	"github.com/saichler/probler/go/prob/common"
)

func CreateCluster(kubeconfig, context string, serviceArea int32) *types.Device {

	device := &types.Device{}
	device.DeviceId = context
	device.InventoryService = &types.DeviceServiceInfo{ServiceName: common.INVENTORY_SERVICE_K8S,
		ServiceArea: common.INVENTORY_AREA_K8S}
	device.ParsingService = &types.DeviceServiceInfo{ServiceName: common.PARSER_SERVICE_K8s,
		ServiceArea: common.PARSER_AREA_K8S}
	device.Hosts = make(map[string]*types.Host)
	host := &types.Host{}
	host.DeviceId = device.DeviceId

	host.Configs = make(map[int32]*types.Connection)
	device.Hosts[device.DeviceId] = host

	k8sConfig := &types.Connection{}

	data, err := os.ReadFile(kubeconfig)
	if err != nil {
		panic(err)
	}
	k8sConfig.KubeConfig = base64.StdEncoding.EncodeToString(data)

	k8sConfig.KukeContext = context
	k8sConfig.Protocol = types.Protocol_PK8s

	host.Configs[int32(k8sConfig.Protocol)] = k8sConfig

	return device

	return nil
}
