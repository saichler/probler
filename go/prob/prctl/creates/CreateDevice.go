package creates

import (
	common2 "github.com/saichler/l8collector/go/collector/common"
	"github.com/saichler/l8pollaris/go/types/l8tpollaris"
	"github.com/saichler/l8types/go/types/l8services"
	"github.com/saichler/probler/go/prob/common"
)

func CreateDevice(ip string, serviceArea byte) *l8tpollaris.L8PTarget {
	device := &l8tpollaris.L8PTarget{}
	device.TargetId = ip
	device.LinkData = &l8services.L8ServiceLink{ZsideServiceName: common.INVENTORY_SERVICE_BOX, ZsideServiceArea: int32(serviceArea)}
	device.LinkParser = &l8services.L8ServiceLink{ZsideServiceName: common2.ParserServicePrefix + common.INVENTORY_SERVICE_BOX,
		ZsideServiceArea: int32(serviceArea)}
	device.Hosts = make(map[string]*l8tpollaris.L8PHost)
	host := &l8tpollaris.L8PHost{}
	host.TargetId = device.TargetId

	host.Configs = make(map[int32]*l8tpollaris.L8PHostProtocol)
	device.Hosts[device.TargetId] = host

	sshConfig := &l8tpollaris.L8PHostProtocol{}
	sshConfig.Protocol = l8tpollaris.L8PProtocol_L8PSSH
	sshConfig.Port = 22
	sshConfig.Addr = ip
	sshConfig.Username = "simadmin"
	sshConfig.Password = "simadmin"
	sshConfig.Terminal = "vt100"
	sshConfig.Timeout = 60

	host.Configs[int32(sshConfig.Protocol)] = sshConfig

	snmpConfig := &l8tpollaris.L8PHostProtocol{}
	snmpConfig.Protocol = l8tpollaris.L8PProtocol_L8PPSNMPV2
	snmpConfig.Addr = ip
	snmpConfig.Port = 161
	snmpConfig.Timeout = 60
	snmpConfig.ReadCommunity = "public"

	host.Configs[int32(snmpConfig.Protocol)] = snmpConfig

	return device
}
