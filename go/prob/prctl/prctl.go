package main

import (
	"fmt"
	"github.com/saichler/collect/go/types"
	"github.com/saichler/l8web/go/web/client"
	"github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/prob/prctl/commands"
	types3 "github.com/saichler/probler/go/types"
	types2 "github.com/saichler/l8types/go/types"
	"os"
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
		Host:   host,
		Port:   443,
		Https:  true,
		Prefix: ifs.PREFIX,
	}
	resources := ifs.CreateResources2("client", "./")
	resources.Introspector().Inspect(&types.PollConfig{})
	resources.Introspector().Inspect(&types.DeviceConfig{})
	resources.Introspector().Inspect(&types2.Health{})
	resources.Introspector().Inspect(&types2.Top{})
	resources.Introspector().Inspect(&types3.Cluster{})
	resources.Introspector().Inspect(&types.NetworkBox{})

	rc, err := client.NewRestClient(clientConfig, resources)
	if err != nil {
		panic(err)
	}
	if cmd1 == "get" {
		if cmd2 == "cluster" {
			commands.GetCluster(rc, resources, cmd3)
			return
		} else if cmd2 == "device" {
			commands.GetDevice(rc, resources, cmd3)
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
