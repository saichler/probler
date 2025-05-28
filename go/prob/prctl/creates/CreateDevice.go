package creates

import (
	"github.com/saichler/collect/go/types"
	"github.com/saichler/probler/go/prob/common"
)

func CreateDevice(ip string) *types.DeviceConfig {
	device := &types.DeviceConfig{}
	device.DeviceId = ip
	device.InventoryService = &types.DeviceServiceInfo{ServiceName: common.INVENTORY_SERVICE_BOX,
		ServiceArea: common.INVENTORY_AREA_BOX}
	device.ParsingService = &types.DeviceServiceInfo{ServiceName: common.PARSER_SERVICE_BOX,
		ServiceArea: common.PARSER_AREA_BOX}
	device.Hosts = make(map[string]*types.HostConfig)
	host := &types.HostConfig{}
	host.DeviceId = device.DeviceId

	host.Configs = make(map[int32]*types.ConnectionConfig)
	device.Hosts[device.DeviceId] = host

	sshConfig := &types.ConnectionConfig{}
	sshConfig.Protocol = types.Protocol_SSH
	sshConfig.Port = 22
	sshConfig.Addr = ip
	sshConfig.Username = "admin"
	sshConfig.Password = "admin"
	sshConfig.Terminal = "vt100"
	sshConfig.Timeout = 15

	host.Configs[int32(sshConfig.Protocol)] = sshConfig

	snmpConfig := &types.ConnectionConfig{}
	snmpConfig.Protocol = types.Protocol_SNMPV2
	snmpConfig.Addr = ip
	snmpConfig.Port = 161
	snmpConfig.Timeout = 15
	snmpConfig.ReadCommunity = "public"

	host.Configs[int32(snmpConfig.Protocol)] = snmpConfig

	return device
}
