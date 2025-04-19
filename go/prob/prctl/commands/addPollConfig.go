package commands

import (
	"github.com/saichler/collect/go/collection/poll_config"
	"github.com/saichler/collect/go/collection/poll_config/boot"
	"github.com/saichler/collect/go/types"
	"github.com/saichler/l8web/go/web/client"
	common2 "github.com/saichler/types/go/common"
	"strconv"
	"time"
)

func AddPollConfigs(rc *client.RestClient, resources common2.IResources) {
	defer time.Sleep(time.Second)
	polls := boot.CreateSNMPBootPolls()
	for _, poll := range polls {
		resp, err := rc.POST(strconv.Itoa(int(poll_config.ServiceArea))+"/"+poll_config.ServiceName,
			"PollConfig", "", "", poll)
		if err != nil {
			resources.Logger().Error(err.Error())
			return
		}
		_, ok := resp.(*types.PollConfig)
		if ok {
			resources.Logger().Info("Added ", poll.Name, " Successfully")
		}
	}
	polls = boot.CreateK8sBootPolls()
	for _, poll := range polls {
		resp, err := rc.POST(strconv.Itoa(int(poll_config.ServiceArea))+"/"+poll_config.ServiceName,
			"PollConfig", "", "", poll)
		if err != nil {
			resources.Logger().Error(err.Error())
			return
		}
		_, ok := resp.(*types.PollConfig)
		if ok {
			resources.Logger().Info("Added ", poll.Name, " Successfully")
		}
	}
}
