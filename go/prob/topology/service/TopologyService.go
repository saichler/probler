package service

import (
	"github.com/saichler/l8services/go/services/dcache"
	"github.com/saichler/l8srlz/go/serialize/object"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8utils/go/utils/web"
	common2 "github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/types"
	"github.com/saichler/reflect/go/reflect/introspecting"
)

const (
	ServiceType = "TopologyService"
	ServiceName = "Topol"
	ServiceArea = byte(0)
)

type TopologyService struct {
	cache ifs.IDistributedCache
}

// Activate implements ifs.IServiceHandler
func (this *TopologyService) Activate(serviceName string, serviceArea byte,
	r ifs.IResources, l ifs.IServiceCacheListener, args ...interface{}) error {
	node, _ := r.Introspector().Inspect(&types.NetworkTopology{})
	introspecting.AddPrimaryKeyDecorator(node, "TopologyId")
	r.Introspector().Inspect(&types.NetworkDevice{})
	this.cache = dcache.NewDistributedCache(ServiceName, ServiceArea, &types.NetworkTopology{}, nil, l, r)
	r.Logger().Info("Activated Topology on ", serviceName, " area ", serviceArea)
	return nil
}

// DeActivate implements ifs.IServiceHandler
func (this *TopologyService) DeActivate() error {
	return nil
}

// Post implements ifs.IServiceHandler
func (this *TopologyService) Post(elements ifs.IElements, vnic ifs.IVNic) ifs.IElements {
	t, ok := elements.Element().(*types.NetworkTopology)
	if !ok {
		return nil
	}
	_, err := this.cache.Put(t, elements.Notification())
	if err != nil {
		vnic.Resources().Logger().Error("Post failed with ", err.Error())
	} else {
		vnic.Resources().Logger().Error("Post Success!")
	}
	return nil
}

// Put implements ifs.IServiceHandler
func (this *TopologyService) Put(elements ifs.IElements, vnic ifs.IVNic) ifs.IElements {
	filter := &types.NetworkTopology{TopologyId: "topo"}
	gen, _ := this.cache.Get(filter)
	if gen == nil {
		vnic.Resources().Logger().Info("Requesting Device Data")
		q, e := object.NewQuery("select * from NetworkDevice where Id=* limit 3000", vnic.Resources())
		if e != nil {
			return object.New(vnic.Resources().Logger().Error("Query error: ", e.Error()), nil)
		}

		pq := q.PQuery()
		data := vnic.ProximityRequest(common2.INVENTORY_SERVICE_BOX, common2.INVENTORY_AREA_BOX, ifs.GET, pq, 30)

		if data.Error() != nil {
			return object.New(vnic.Resources().Logger().Error("Data error: ", data.Error().Error()), nil)
		}

		list := &types.NetworkDeviceList{List: make([]*types.NetworkDevice, 0)}

		for _, elem := range data.Elements() {
			list.List = append(list.List, elem.(*types.NetworkDevice))
		}

		vnic.Resources().Logger().Info("Generating Network Topology")
		topo := generateTopology(list)
		topo.TopologyId = "topo"
		_, err := this.cache.Put(topo, false)
		if err != nil {
			vnic.Resources().Logger().Error("Cache error: ", err.Error())
		}
	}
	return object.New(nil, &types2.Empty{})
}

// Patch implements ifs.IServiceHandler
func (this *TopologyService) Patch(elements ifs.IElements, vnic ifs.IVNic) ifs.IElements {
	return nil
}

// Delete implements ifs.IServiceHandler
func (this *TopologyService) Delete(elements ifs.IElements, vnic ifs.IVNic) ifs.IElements {
	return nil
}

// GetCopy implements ifs.IServiceHandler
func (this *TopologyService) GetCopy(elements ifs.IElements, vnic ifs.IVNic) ifs.IElements {
	return nil
}

// Get implements ifs.IServiceHandler
func (this *TopologyService) Get(elements ifs.IElements, vnic ifs.IVNic) ifs.IElements {
	filter := &types.NetworkTopology{TopologyId: "topo"}
	topo, _ := this.cache.Get(filter)
	if topo == nil {
		vnic.Resources().Logger().Error("No Topology")
	}
	return object.New(nil, topo)
}

// Failed implements ifs.IServiceHandler
func (this *TopologyService) Failed(elements ifs.IElements, vnic ifs.IVNic, message *ifs.Message) ifs.IElements {
	return nil
}

// TransactionMethod implements ifs.IServiceHandler
func (this *TopologyService) TransactionConfig() ifs.ITransactionConfig {
	return nil
}

// WebService implements ifs.IServiceHandler
func (this *TopologyService) WebService() ifs.IWebService {
	ws := web.New(ServiceName, ServiceArea, nil,
		nil, &types2.Empty{}, &types2.Empty{}, nil, nil, nil, nil,
		&types2.Empty{}, &types.NetworkTopology{})
	return ws
}
