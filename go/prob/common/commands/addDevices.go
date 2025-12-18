package commands

import (
	"fmt"
	"github.com/saichler/l8pollaris/go/pollaris/targets"
	"github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/prob/common/creates"
	"strconv"
	"time"

	"github.com/saichler/l8pollaris/go/types/l8tpollaris"
	common2 "github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8web/go/web/client"
)

func AddDevices(cmd string, rc *client.RestClient, resources common2.IResources) {
	defer time.Sleep(time.Second)

	deviceList := &l8tpollaris.L8PTargetList{List: make([]*l8tpollaris.L8PTarget, 0)}

	if cmd == "all" || cmd == "cluster" {
		cluster := creates.CreateCluster("lab")
		deviceList.List = append(deviceList.List, cluster)
	}

	if cmd == "all" || cmd == "base" {
		for i := 1; i <= 19; i++ {
			device := creates.CreateDevice("10.20.30."+strconv.Itoa(i), common.NetworkDevice_Links_ID, "sim")
			deviceList.List = append(deviceList.List, device)
		}
	}

	if cmd == "all" || cmd == "D1" {
		ip := 1
		sub := 10
		for i := 1; i <= 1000; i++ {
			device := creates.CreateDevice("30.20."+strconv.Itoa(sub)+"."+strconv.Itoa(ip), common.NetworkDevice_Links_ID, "sim")
			deviceList.List = append(deviceList.List, device)
			ip++
			if ip > 254 {
				sub++
				ip = 0
			}
		}
	}

	if cmd == "all" || cmd == "D2" {
		ip := 1
		sub := 10
		for i := 1; i <= 1000; i++ {
			device := creates.CreateDevice("40.20."+strconv.Itoa(sub)+"."+strconv.Itoa(ip), common.NetworkDevice_Links_ID, "sim")
			deviceList.List = append(deviceList.List, device)
			ip++
			if ip > 254 {
				sub++
				ip = 0
			}
		}
	}

	if cmd == "all" || cmd == "D3" {
		ip := 1
		sub := 10
		for i := 1; i <= 1000; i++ {
			device := creates.CreateDevice("50.20."+strconv.Itoa(sub)+"."+strconv.Itoa(ip), common.NetworkDevice_Links_ID, "sim")
			deviceList.List = append(deviceList.List, device)
			ip++
			if ip > 254 {
				sub++
				ip = 0
			}
		}
	}

	if cmd == "25K" {
		ip := 1
		sub := 40
		for i := 1; i <= 25000; i++ {
			device := creates.CreateDevice("60.50."+strconv.Itoa(sub)+"."+strconv.Itoa(ip), common.NetworkDevice_Links_ID, "sim")
			deviceList.List = append(deviceList.List, device)
			ip++
			if ip > 254 {
				sub++
				ip = 1
			}
		}
	}

	if cmd == "20K" {
		ip := 1
		sub := 40
		for i := 1; i <= 20000; i++ {
			device := creates.CreateDevice("60.50."+strconv.Itoa(sub)+"."+strconv.Itoa(ip), common.NetworkDevice_Links_ID, "sim")
			deviceList.List = append(deviceList.List, device)
			ip++
			if ip > 254 {
				sub++
				ip = 1
			}
		}
	}

	if cmd == "10K" {
		ip := 1
		sub := 40
		for i := 1; i <= 10000; i++ {
			device := creates.CreateDevice("60.50."+strconv.Itoa(sub)+"."+strconv.Itoa(ip), common.NetworkDevice_Links_ID, "sim")
			deviceList.List = append(deviceList.List, device)
			ip++
			if ip > 254 {
				sub++
				ip = 1
			}
		}
	}

	if cmd == "5K" {
		ip := 1
		sub := 40
		for i := 1; i <= 5000; i++ {
			device := creates.CreateDevice("60.50."+strconv.Itoa(sub)+"."+strconv.Itoa(ip), common.NetworkDevice_Links_ID, "sim")
			deviceList.List = append(deviceList.List, device)
			ip++
			if ip > 254 {
				sub++
				ip = 1
			}
		}
	}

	if cmd == "3K" {
		ip := 1
		sub := 40
		for i := 1; i <= 3000; i++ {
			device := creates.CreateDevice("60.50."+strconv.Itoa(sub)+"."+strconv.Itoa(ip), common.NetworkDevice_Links_ID, "sim")
			deviceList.List = append(deviceList.List, device)
			ip++
			if ip > 254 {
				sub++
				ip = 1
			}
		}
	}

	if cmd == "1K" {
		ip := 1
		sub := 40
		for i := 1; i <= 1000; i++ {
			device := creates.CreateDevice("60.50."+strconv.Itoa(sub)+"."+strconv.Itoa(ip), common.NetworkDevice_Links_ID, "sim")
			deviceList.List = append(deviceList.List, device)
			ip++
			if ip > 254 {
				sub++
				ip = 1
			}
		}
	}

	if cmd == "500" {
		ip := 1
		sub := 40
		for i := 1; i <= 500; i++ {
			device := creates.CreateDevice("60.50."+strconv.Itoa(sub)+"."+strconv.Itoa(ip), common.NetworkDevice_Links_ID, "sim")
			deviceList.List = append(deviceList.List, device)
			ip++
			if ip > 254 {
				sub++
				ip = 1
			}
		}
	}

	if len(deviceList.List) == 0 {
		fmt.Println("No devices in list")
		return
	}

	fmt.Println("Adding ", len(deviceList.List), " devices")

	resp, err := rc.POST("91/"+targets.ServiceName, "L8PTargetList", "", "", deviceList)
	if err != nil {
		fmt.Println("Error", err)
	}
	fmt.Println("Response=", resp)
}
