package main

import (
	"github.com/saichler/collect/go/collection/device_config"
	"github.com/saichler/collect/go/collection/inventory"
	"github.com/saichler/collect/go/collection/parsing"
	"github.com/saichler/collect/go/collection/poll_config"
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
	res := common2.CreateResources("vnic-" + os.Getenv("HOSTNAME"))
	res.ServicePoints().AddServicePointType(&persist.OrmServicePoint{})
	res.ServicePoints().AddServicePointType(&convert.ConvertServicePoint{})
	res.ServicePoints().AddServicePointType(&device_config.DeviceConfigServicePoint{})
	res.ServicePoints().AddServicePointType(&inventory.InventoryServicePoint{})
	res.ServicePoints().AddServicePointType(&parsing.ParsingServicePoint{})
	res.ServicePoints().AddServicePointType(&poll_config.PollConfigServicePoint{})

	common.SetNetworkMode(common.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()

	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	sig := <-sigs
	res.Logger().Info("Recevied singnal ", sig)
}
