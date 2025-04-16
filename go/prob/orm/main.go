package main

import (
	"database/sql"
	"fmt"
	_ "github.com/lib/pq"
	"github.com/saichler/collect/go/types"
	"github.com/saichler/l8orm/go/orm/convert"
	"github.com/saichler/l8orm/go/orm/persist"
	"github.com/saichler/layer8/go/overlay/vnic"
	common2 "github.com/saichler/probler/go/prob/common"
	types2 "github.com/saichler/probler/go/types"
	"github.com/saichler/reflect/go/reflect/introspecting"
	"github.com/saichler/types/go/common"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	res := common2.CreateResources("vnic-" + os.Getenv("HOSTNAME"))
	res.ServicePoints().AddServicePointType(&persist.OrmServicePoint{})
	res.ServicePoints().AddServicePointType(&convert.ConvertServicePoint{})

	common.SetNetworkMode(common.NETWORK_K8s)

	inventoryNode, _ := res.Introspector().Inspect(&types.NetworkBox{})
	introspecting.AddPrimaryKeyDecorator(inventoryNode, "Id")

	k8sClusterNode, _ := res.Introspector().Inspect(&types2.Cluster{})
	introspecting.AddPrimaryKeyDecorator(k8sClusterNode, "Name")

	db := openDBConection()

	p := persist.NewPostgres(db, res)
	res.ServicePoints().Activate(persist.ServicePointType, "myPostgres", 0, res, nil, p)
	
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()

	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	sig := <-sigs
	res.Logger().Info("Recevied singnal ", sig)
}

func openDBConection() *sql.DB {
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s "+
		"password=%s dbname=%s sslmode=disable",
		"127.0.0.1", 5432, "postgres", "admin", "postgres")
	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		panic(err)
	}
	return db
}
