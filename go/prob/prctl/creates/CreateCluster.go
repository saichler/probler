package creates

import (
	"encoding/base64"
	"os"

	"github.com/saichler/l8pollaris/go/types/l8tpollaris"
	"github.com/saichler/l8types/go/types/l8services"
	"github.com/saichler/probler/go/prob/common"
)

func CreateCluster(kubeconfig, context string, serviceArea int32) *l8tpollaris.L8PTarget {
	device := &l8tpollaris.L8PTarget{}
	device.TargetId = context
	device.LinkData = &l8services.L8ServiceLink{ZsideServiceName: common.INVENTORY_SERVICE_K8S,
		ZsideServiceArea: common.INVENTORY_AREA_K8S}
	device.LinkParser = &l8services.L8ServiceLink{ZsideServiceName: common.PARSER_SERVICE_K8s,
		ZsideServiceArea: common.PARSER_AREA_K8S}
	device.Hosts = make(map[string]*l8tpollaris.L8PHost)
	host := &l8tpollaris.L8PHost{}
	host.TargetId = device.TargetId

	host.Configs = make(map[int32]*l8tpollaris.L8PHostProtocol)
	device.Hosts[device.TargetId] = host

	k8sConfig := &l8tpollaris.L8PHostProtocol{}

	data, err := os.ReadFile(kubeconfig)
	if err != nil {
		panic(err)
	}
	k8sConfig.KubeConfig = base64.StdEncoding.EncodeToString(data)

	k8sConfig.KukeContext = context
	k8sConfig.Protocol = l8tpollaris.L8PProtocol_L8PKubectl

	host.Configs[int32(k8sConfig.Protocol)] = k8sConfig

	return device

	return nil
}
