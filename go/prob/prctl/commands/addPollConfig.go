package commands

import (
	boot "github.com/saichler/l8parser/go/parser/boot"
	"github.com/saichler/l8pollaris/go/pollaris"
	"github.com/saichler/l8pollaris/go/types"
	common2 "github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8web/go/web/client"
	"strconv"
	"time"
)

func AddPollConfigs(rc *client.RestClient, resources common2.IResources) {
	snmpPollaris := boot.CreateSNMPBootPolls()
	resp, err := rc.POST(strconv.Itoa(int(pollaris.ServiceArea))+"/"+pollaris.ServiceName,
		"Pollaris", "", "", snmpPollaris)

	if err != nil {
		resources.Logger().Error(err.Error())
		return
	}
	_, ok := resp.(*types.Pollaris)
	if ok {
		resources.Logger().Info("Added ", snmpPollaris.Name, " Successfully")
	}
	time.Sleep(time.Second)
}
