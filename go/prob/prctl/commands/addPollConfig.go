package commands

import (
	"strconv"
	"time"

	boot "github.com/saichler/l8parser/go/parser/boot"
	"github.com/saichler/l8pollaris/go/pollaris"
	"github.com/saichler/l8pollaris/go/types/l8tpollaris"
	common2 "github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8web/go/web/client"
)

func AddPollConfigs(rc *client.RestClient, resources common2.IResources) {
	snmpPollarises := boot.GetAllPolarisModels()
	for _, snmpPollaris := range snmpPollarises {
		resp, err := rc.POST(strconv.Itoa(int(pollaris.ServiceArea))+"/"+pollaris.ServiceName,
			"Pollaris", "", "", snmpPollaris)

		if err != nil {
			resources.Logger().Error(err.Error())
			return
		}
		_, ok := resp.(*l8poll.L8Pollaris)
		if ok {
			resources.Logger().Info("Added ", snmpPollaris.Name, " Successfully")
		}
		time.Sleep(time.Second)
	}

	k8sPollaris := boot.CreateK8sBootPolls()
	resp, err := rc.POST(strconv.Itoa(int(pollaris.ServiceArea))+"/"+pollaris.ServiceName,
		"Pollaris", "", "", k8sPollaris)

	if err != nil {
		resources.Logger().Error(err.Error())
		return
	}
	_, ok := resp.(*l8poll.L8Pollaris)
	if ok {
		resources.Logger().Info("Added ", k8sPollaris.Name, " Successfully")
	}
	time.Sleep(time.Second)

}
