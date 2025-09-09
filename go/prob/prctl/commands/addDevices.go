package commands

import (
	"strconv"
	"time"

	"github.com/saichler/l8collector/go/collector/devices"
	"github.com/saichler/l8pollaris/go/types"
	common2 "github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8web/go/web/client"
	"github.com/saichler/probler/go/prob/prctl/creates"
)

func AddDevices(cmd string, rc *client.RestClient, resources common2.IResources) {
	defer time.Sleep(time.Second)

	deviceList := &types.DeviceList{List: make([]*types.Device, 0)}

	if cmd == "all" || cmd == "cluster" {
		cluster := creates.CreateCluster("./lab.conf", "lab", 0)
		deviceList.List = append(deviceList.List, cluster)
	}

	if cmd == "all" || cmd == "base" {
		for i := 1; i <= 19; i++ {
			device := creates.CreateDevice("10.20.30."+strconv.Itoa(i), 0)
			deviceList.List = append(deviceList.List, device)
		}
	}

	if cmd == "all" || cmd == "D1" {
		ip := 1
		sub := 10
		for i := 1; i <= 1000; i++ {
			device := creates.CreateDevice("30.20."+strconv.Itoa(sub)+"."+strconv.Itoa(ip), 0)
			deviceList.List = append(deviceList.List, device)
			ip++
			if ip >= 254 {
				sub++
				ip = 0
			}
		}
	}

	if cmd == "all" || cmd == "D2" {
		ip := 1
		sub := 10
		for i := 1; i <= 1000; i++ {
			device := creates.CreateDevice("40.20."+strconv.Itoa(sub)+"."+strconv.Itoa(ip), 0)
			deviceList.List = append(deviceList.List, device)
			ip++
			if ip >= 254 {
				sub++
				ip = 0
			}
		}
	}

	if cmd == "all" || cmd == "D3" {
		ip := 1
		sub := 10
		for i := 1; i <= 1000; i++ {
			device := creates.CreateDevice("50.20."+strconv.Itoa(sub)+"."+strconv.Itoa(ip), 0)
			deviceList.List = append(deviceList.List, device)
			ip++
			if ip >= 254 {
				sub++
				ip = 0
			}
		}
	}

	rc.POST("0/"+devices.ServiceName, "Device", "", "", deviceList)
	time.Sleep(time.Second * 2)
}
