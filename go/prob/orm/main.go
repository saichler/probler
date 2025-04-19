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
)

func main() {
	resources := common2.CreateResources("vnic-" + os.Getenv("HOSTNAME"))
	common.SetNetworkMode(common.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Start()
	nic.WaitForConnection()

	nic.Resources().ServicePoints().AddServicePointType(&persist.OrmServicePoint{})
	nic.Resources().ServicePoints().AddServicePointType(&convert.ConvertServicePoint{})

	//Add the inventory model and mark the Id field as key
	inventoryNode, _ := nic.Resources().Introspector().Inspect(&types.NetworkBox{})
	introspecting.AddPrimaryKeyDecorator(inventoryNode, "Id")

	//Add the k8s cluster model and mark the Name as key
	k8sClusterNode, _ := nic.Resources().Introspector().Inspect(&types2.Cluster{})
	introspecting.AddPrimaryKeyDecorator(k8sClusterNode, "Name")

	//init the db and register the inventory service as "myPostgres" service name
	db := openDBConection()
	p := persist.NewPostgres(db, nic.Resources())
	nic.Resources().ServicePoints().Activate(persist.ServicePointType, common2.ORM_SERVICE, 0, nic.Resources(), nic, p)

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
