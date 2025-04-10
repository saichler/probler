package main

import (
	"github.com/saichler/collect/go/collection/config"
	"github.com/saichler/collect/go/collection/inventory"
	"github.com/saichler/collect/go/collection/parsing"
	"github.com/saichler/collect/go/collection/polling"
	"github.com/saichler/l8orm/go/orm/convert"
	"github.com/saichler/l8orm/go/orm/persist"
	"github.com/saichler/layer8/go/overlay/vnic"
	common2 "github.com/saichler/probler/go/prob/common"
	"github.com/saichler/types/go/common"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	//pull all potential services
	var s interface{}
	s = &persist.OrmServicePoint{}
	s = &convert.ConvertServicePoint{}
	s = &config.ConfigServicePoint{}
	s = &inventory.InventoryServicePoint{}
	s = &parsing.ParsingServicePoint{}
	s = &polling.PollServicePoint{}
	if s == nil {
	}

	res := common2.CreateResources("vnic-" + os.Getenv("HOSTNAME"))
	common.SetNetworkMode(common.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()

	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	sig := <-sigs
	res.Logger().Info("Recevied singnal ", sig)
}
