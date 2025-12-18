package common

import (
	"github.com/saichler/l8pollaris/go/pollaris/targets"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/saichler/l8reflect/go/reflect/introspecting"
	"github.com/saichler/l8services/go/services/manager"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8types/go/types/l8sysconfig"
	"github.com/saichler/l8utils/go/utils/logger"
	"github.com/saichler/l8utils/go/utils/registry"
	"github.com/saichler/l8utils/go/utils/resources"
)

const (
	PROBLER_VNET = 28000
	LOGS_VNET    = 27000
	PREFIX       = "/probler/"
	DB_CREDS     = "postgres"
	DB_NAME      = "probler"
)

func init() {
	targets.Links = &Links{}
}

func CreateResources(alias string) ifs.IResources {
	//logger.SetLogToFile(alias)
	log := logger.NewLoggerImpl(&logger.FmtLogMethod{})
	log.SetLogLevel(ifs.Error_Level)
	res := resources.NewResources(log)

	res.Set(registry.NewRegistry())

	sec, err := ifs.LoadSecurityProvider(res)
	if err != nil {
		time.Sleep(time.Second * 10)
		panic(err.Error())
	}
	res.Set(sec)

	conf := &l8sysconfig.L8SysConfig{MaxDataSize: resources.DEFAULT_MAX_DATA_SIZE,
		RxQueueSize:              resources.DEFAULT_QUEUE_SIZE,
		TxQueueSize:              resources.DEFAULT_QUEUE_SIZE,
		LocalAlias:               alias,
		VnetPort:                 uint32(PROBLER_VNET),
		KeepAliveIntervalSeconds: 30}
	res.Set(conf)

	res.Set(introspecting.NewIntrospect(res.Registry()))
	res.Set(manager.NewServices(res))

	return res
}

func WaitForSignal(resources ifs.IResources) {
	resources.Logger().Info("Waiting for os signal...")
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	sig := <-sigs
	resources.Logger().Info("End signal received! ", sig)
}
