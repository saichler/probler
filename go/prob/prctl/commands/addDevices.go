package commands

import (
	"fmt"
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

	if cmd == "all" || cmd == "cluster" {
		cluster := creates.CreateCluster("./lab.conf", "lab", 0)
		rc.POST("0/"+devices.ServiceName, "Device", "", "", cluster)
		time.Sleep(time.Second * 2)
	}

	if cmd == "all" || cmd == "base" {
		for i := 1; i <= 19; i++ {
			device := creates.CreateDevice("10.20.30."+strconv.Itoa(i), 0)
			resp, err := rc.POST("0/"+devices.ServiceName, "Device",
				"", "", device)
			if err != nil {
				fmt.Println(err.Error())
				//return
			}
			_, ok := resp.(*types.Device)
			if ok {
				fmt.Println("Added ", device.DeviceId, " Successfully")
			}
			//time.Sleep(time.Millisecond * 100)
		}
	}

	if cmd == "all" || cmd == "D1" {
		ip := 1
		sub := 10
		for i := 1; i <= 1000; i++ {
			device := creates.CreateDevice("30.20."+strconv.Itoa(sub)+"."+strconv.Itoa(ip), 0)
			err := addSingleDevice(i, device, rc, resources)
			for err != nil {
				err = addSingleDevice(i, device, rc, resources)
			}
			fmt.Println(i, " Added ", device.DeviceId, " Successfully")
			//time.Sleep(time.Millisecond * 500)
			ip++
			if ip >= 255 {
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
			err := addSingleDevice(i, device, rc, resources)
			for err != nil {
				err = addSingleDevice(i, device, rc, resources)
			}
			fmt.Println(i, " Added ", device.DeviceId, " Successfully")
			//time.Sleep(time.Millisecond * 500)
			ip++
			if ip >= 255 {
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
			err := addSingleDevice(i, device, rc, resources)
			for err != nil {
				err = addSingleDevice(i, device, rc, resources)
			}
			fmt.Println(i, " Added ", device.DeviceId, " Successfully")
			//time.Sleep(time.Millisecond * 500)
			ip++
			if ip >= 255 {
				sub++
				ip = 0
			}
		}
	}
}

func addSingleDevice(i int, device *types.Device, rc *client.RestClient, resources common2.IResources) error {
	resp, err := rc.POST("0/"+devices.ServiceName, "Device", "", "", device)
	if err != nil {
		fmt.Println(err.Error())
		//return
	}
	_, ok := resp.(*types.Device)
	if ok {
		fmt.Println(i, " Added ", device.DeviceId, " Successfully")
		return nil
	}
	fmt.Println(i, " Addeding ", device.DeviceId, " failed")
	time.Sleep(time.Second)
	return err
}
