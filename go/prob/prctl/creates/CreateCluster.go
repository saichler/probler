package creates

import (
	"encoding/base64"
	"os"

	"github.com/saichler/l8pollaris/go/types/l8poll"
	"github.com/saichler/l8types/go/types/l8services"
	"github.com/saichler/probler/go/prob/common"
)

func CreateCluster(kubeconfig, context string, serviceArea int32) *l8poll.L8C_Target {

	device := &l8poll.L8C_Target{}
	device.TargetId = context
	device.LinkD = &l8services.L8ServiceLink{ZsideServiceName: common.INVENTORY_SERVICE_K8S,
		ZsideServiceArea: common.INVENTORY_AREA_K8S}
	device.LinkP = &l8services.L8ServiceLink{ZsideServiceName: common.PARSER_SERVICE_K8s,
		ZsideServiceArea: common.PARSER_AREA_K8S}
	device.Hosts = make(map[string]*l8poll.L8C_Host)
	host := &l8poll.L8C_Host{}
	host.TargetId = device.TargetId

	host.Configs = make(map[int32]*l8poll.L8T_Connection)
	device.Hosts[device.TargetId] = host

	k8sConfig := &l8poll.L8T_Connection{}

	data, err := os.ReadFile(kubeconfig)
	if err != nil {
		panic(err)
	}
	k8sConfig.KubeConfig = base64.StdEncoding.EncodeToString(data)

	k8sConfig.KukeContext = context
	k8sConfig.Protocol = l8poll.L8C_Protocol_L8P_Kubectl

	host.Configs[int32(k8sConfig.Protocol)] = k8sConfig

	return device

	return nil
}
