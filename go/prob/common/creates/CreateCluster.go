package creates

import (
	"github.com/saichler/l8pollaris/go/types/l8tpollaris"
	"github.com/saichler/probler/go/prob/common"
)

func CreateCluster(id string) *l8tpollaris.L8PTarget {
	device := &l8tpollaris.L8PTarget{}
	device.TargetId = id
	device.LinksId = common.K8s_Links_ID
	device.InventoryType = l8tpollaris.L8PTargetType_K8s_Cluster

	device.Hosts = make(map[string]*l8tpollaris.L8PHost)
	host := &l8tpollaris.L8PHost{}
	host.HostId = id

	host.Configs = make(map[int32]*l8tpollaris.L8PHostProtocol)
	device.Hosts[device.TargetId] = host

	k8sConfig := &l8tpollaris.L8PHostProtocol{}

	k8sConfig.CredId = "lab"
	k8sConfig.Protocol = l8tpollaris.L8PProtocol_L8PKubectl

	host.Configs[int32(k8sConfig.Protocol)] = k8sConfig

	return device
}
