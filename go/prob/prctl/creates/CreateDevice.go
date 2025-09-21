package creates

import (
	common2 "github.com/saichler/l8collector/go/collector/common"
	"github.com/saichler/l8pollaris/go/types/l8poll"
	"github.com/saichler/l8types/go/types/l8services"
	"github.com/saichler/probler/go/prob/common"
)

func CreateDevice(ip string, serviceArea byte) *l8poll.L8C_Target {
	device := &l8poll.L8C_Target{}
	device.TargetId = ip
	device.LinkD = &l8services.L8ServiceLink{ZsideServiceName: common.INVENTORY_SERVICE_BOX, ZsideServiceArea: int32(serviceArea)}
	device.LinkP = &l8services.L8ServiceLink{ZsideServiceName: common2.ParserServicePrefix + common.INVENTORY_SERVICE_BOX,
		ZsideServiceArea: int32(serviceArea)}
	device.Hosts = make(map[string]*l8poll.L8C_Host)
	host := &l8poll.L8C_Host{}
	host.TargetId = device.TargetId

	host.Configs = make(map[int32]*l8poll.L8T_Connection)
	device.Hosts[device.TargetId] = host

	sshConfig := &l8poll.L8T_Connection{}
	sshConfig.Protocol = l8poll.L8C_Protocol_L8P_SSH
	sshConfig.Port = 22
	sshConfig.Addr = ip
	sshConfig.Username = "simadmin"
	sshConfig.Password = "simadmin"
	sshConfig.Terminal = "vt100"
	sshConfig.Timeout = 60

	host.Configs[int32(sshConfig.Protocol)] = sshConfig

	snmpConfig := &l8poll.L8T_Connection{}
	snmpConfig.Protocol = l8poll.L8C_Protocol_L8P_PSNMPV2
	snmpConfig.Addr = ip
	snmpConfig.Port = 161
	snmpConfig.Timeout = 60
	snmpConfig.ReadCommunity = "public"

	host.Configs[int32(snmpConfig.Protocol)] = snmpConfig

	return device
}
