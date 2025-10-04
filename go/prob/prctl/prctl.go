package main

import (
	"fmt"
	"os"

	"github.com/saichler/l8pollaris/go/types/l8tpollaris"
	"github.com/saichler/l8types/go/types/l8api"
	"github.com/saichler/l8types/go/types/l8health"
	"github.com/saichler/l8types/go/types/l8web"
	"github.com/saichler/l8web/go/web/client"
	"github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/prob/prctl/commands"
	types3 "github.com/saichler/probler/go/types"
	types5 "github.com/saichler/probler/go/types"
)

func main() {
	var host string
	var cmd1 string
	var cmd2 string
	var cmd3 string
	var cmd4 string

	if len(os.Args) > 1 {
		host = os.Args[1]
	}
	if len(os.Args) > 2 {
		cmd1 = os.Args[2]
	}
	if len(os.Args) > 3 {
		cmd2 = os.Args[3]
	}
	if len(os.Args) > 4 {
		cmd3 = os.Args[4]
	}
	if len(os.Args) > 5 {
		cmd4 = os.Args[5]
	}
	clientConfig := &client.RestClientConfig{
		Host:          host,
		Port:          2443,
		Https:         true,
		Prefix:        common.PREFIX,
		AuthPaths:     []string{"auth"},
		TokenRequired: true,
	}

	resources := common.CreateResources2("client", "./")
	resources.Introspector().Inspect(&l8poll.L8Pollaris{})
	resources.Introspector().Inspect(&l8poll.L8C_Target{})
	resources.Introspector().Inspect(&l8poll.L8C_TargetList{})
	resources.Introspector().Inspect(&l8health.L8Health{})
	resources.Introspector().Inspect(&l8health.L8Top{})
	resources.Introspector().Inspect(&types3.K8SCluster{})
	resources.Introspector().Inspect(&types3.K8SClusterList{})
	resources.Introspector().Inspect(&types5.NetworkDevice{})
	resources.Introspector().Inspect(&types5.NetworkDeviceList{})
	resources.Introspector().Inspect(&l8web.L8Empty{})
	resources.Introspector().Inspect(&l8api.L8Query{})
	resources.Introspector().Inspect(&types5.NetworkTopology{})
	resources.Introspector().Inspect(&l8api.AuthToken{})

	rc, err := client.NewRestClient(clientConfig, resources)
	if err != nil {
		panic(err)
	}

	err = rc.Auth("admin", "Admin123!")
	if err != nil {
		panic(err)
	}

	if cmd1 == "get" {
		if cmd2 == "topo" {
			commands.GetTopo(cmd3, rc, resources)
			return
		} else if cmd2 == "cluster" {
			commands.GetCluster(rc, resources, cmd3)
			return
		} else if cmd2 == "device" {
			commands.GetDevice(rc, resources, cmd3)
			return
		} else if cmd2 == "ocluster" {
			commands.GetClusterOrm(rc, resources, cmd3)
			return
		} else if cmd2 == "logs" {
			commands.Logs(rc, "", "", resources)
			return
		} else if cmd2 == "details" {
			commands.Details(rc, "", "", resources)
			return
		}
	}
	if cmd1 == "add" {
		if cmd2 == "polls" {
			commands.AddPollConfigs(rc, resources)
			return
		} else if cmd2 == "device" {
			commands.AddDevice(cmd3, rc, resources)
			return
		} else if cmd2 == "devices" {
			commands.AddDevices(cmd3, rc, resources)
			return
		} else if cmd2 == "cluster" {
			commands.AddCluster(cmd3, cmd4, rc, resources)
			return
		}
	} else if cmd1 == "top" {
		commands.Top(rc, resources)
		return
	}
	fmt.Println("Nothing to do!")
}
