package main

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8orm/go/orm/persist"
	"github.com/saichler/l8types/go/ifs"
	common2 "github.com/saichler/probler/go/prob/common"
	types2 "github.com/saichler/probler/go/types"
	types3 "github.com/saichler/probler/go/types"
)

func main() {
	res := common2.CreateResources("orm")
	res.Logger().SetLogLevel(ifs.Info_Level)
	res.Logger().Info("Starting ORM")
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()
	res.Logger().Info("Registering ORM Services")

	//Add the inventory model and mark the Id field as key
	//inventoryNode, _ := nic.Resources().Introspector().Inspect(&types3.NetworkDevice{})
	//introspecting.AddPrimaryKeyDecorator(inventoryNode, "Id")

	//Add the k8s cluster model and mark the Name as key
	//k8sClusterNode, _ := nic.Resources().Introspector().Inspect(&types2.K8SCluster{})
	//introspecting.AddPrimaryKeyDecorator(k8sClusterNode, "Name")

	//init the db and register the inventory service as "myPostgres" service name
	db := openDBConection()
	p := persist.NewPostgres(db, nic.Resources())

	//Activate ORM service for network device
	sla := ifs.NewServiceLevelAgreement(&persist.OrmService{}, common2.ORM_SERVICE, 0, true, nil)
	sla.SetServiceItem(&types3.NetworkDevice{})
	sla.SetPrimaryKeys("Id")
	sla.SetArgs(p)
	nic.Resources().Services().Activate(sla, nic)

	//Activate ORM service for k8s cluster
	sla = ifs.NewServiceLevelAgreement(&persist.OrmService{}, common2.ORM_SERVICE, 1, true, nil)
	sla.SetServiceItem(&types2.K8SCluster{})
	sla.SetPrimaryKeys("Name")
	sla.SetArgs(p)
	nic.Resources().Services().Activate(sla, nic)

	res.Logger().SetLogLevel(ifs.Error_Level)

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
