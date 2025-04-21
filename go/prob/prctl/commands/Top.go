package commands

import (
	"fmt"
	"github.com/saichler/l8web/go/web/client"
	"github.com/saichler/layer8/go/overlay/health"
	common2 "github.com/saichler/types/go/common"
	types2 "github.com/saichler/types/go/types"
	"time"
)

func Top(rc *client.RestClient, resources common2.IResources) {
	defer time.Sleep(time.Second)
	healthPoint := &types2.HealthPoint{}
	resp, err := rc.GET("0/"+health.ServiceName, "Top",
		"", "", healthPoint)
	if err != nil {
		resources.Logger().Error(err.Error())
		return
	}
	top, ok := resp.(*types2.Top)
	if ok {
		printTop(top)
	}
}

func printTop(top *types2.Top) {
	for _, v := range top.HealthPoints {
		printHealthPoint(v)
	}
}

func printHealthPoint(hp *types2.HealthPoint) {
	fmt.Print(hp.Alias, " ")
	if hp.Stats != nil {
		fmt.Print(hp.Stats.RxMsgCount, " ", hp.Stats.TxMsgCount)
	}
	fmt.Println()
}
