package main

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
	"github.com/saichler/l8orm/go/orm/convert"
	"github.com/saichler/l8orm/go/orm/persist"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/layer8/go/overlay/vnic"
	common2 "github.com/saichler/probler/go/prob/common"
	types2 "github.com/saichler/probler/go/types"
	types3 "github.com/saichler/probler/go/types"
	"github.com/saichler/reflect/go/reflect/introspecting"
)

func main() {
	res := common2.CreateResources("orm-" + os.Getenv("HOSTNAME"))
	res.Logger().Info("Starting ORM")
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()
	res.Logger().Info("Registering ORM Services")

	nic.Resources().Services().RegisterServiceHandlerType(&persist.OrmService{})
	nic.Resources().Services().RegisterServiceHandlerType(&convert.ConvertService{})

	//Add the inventory model and mark the Id field as key
	inventoryNode, _ := nic.Resources().Introspector().Inspect(&types3.NetworkDevice{})
	introspecting.AddPrimaryKeyDecorator(inventoryNode, "Id")

	//Add the k8s cluster model and mark the Name as key
	k8sClusterNode, _ := nic.Resources().Introspector().Inspect(&types2.K8SCluster{})
	introspecting.AddPrimaryKeyDecorator(k8sClusterNode, "Name")

	//init the db and register the inventory service as "myPostgres" service name
	db := openDBConection()
	p := persist.NewPostgres(db, nic.Resources())
	_, err := nic.Resources().Services().Activate(persist.ServiceType, common2.ORM_SERVICE, 0,
		nic.Resources(), nic, p, &types3.NetworkDevice{})
	if err != nil {
		res.Logger().Error(err.Error())
	}

	_, err = nic.Resources().Services().Activate(persist.ServiceType, common2.ORM_SERVICE, 1,
		nic.Resources(), nic, p, &types2.K8SCluster{})
	if err != nil {
		res.Logger().Error(err.Error())
	}
	common2.WaitForSignal(nic.Resources())
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
