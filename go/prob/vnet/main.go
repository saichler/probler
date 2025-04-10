package main

import (
	"github.com/saichler/layer8/go/overlay/vnet"
	common2 "github.com/saichler/probler/go/prob/common"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	res := common2.CreateResources("vnet-" + os.Getenv("HOSTNAME"))
	net := vnet.NewVNet(res)
	net.Start()

	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	sig := <-sigs
	res.Logger().Info("Recevied singnal ", sig)
}
