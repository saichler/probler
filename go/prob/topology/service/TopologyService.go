package service

import (
	"github.com/saichler/l8srlz/go/serialize/object"
	"github.com/saichler/l8types/go/ifs"
	types2 "github.com/saichler/l8types/go/types"
	"github.com/saichler/l8utils/go/utils/web"
	common2 "github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/types"
)

const (
	ServiceType = "TopologyService"
	ServiceName = "Topol"
	ServiceArea = byte(0)
)

type TopologyService struct {
	networkTopology *types.NetworkTopology
}

// Activate implements ifs.IServiceHandler
func (ts *TopologyService) Activate(serviceName string, serviceArea byte,
	r ifs.IResources, l ifs.IServiceCacheListener, args ...interface{}) error {
	r.Logger().Info("Activated Topology on ", serviceName, " area ", serviceArea)
	return nil
}

// DeActivate implements ifs.IServiceHandler
func (ts *TopologyService) DeActivate() error {
	return nil
}

// Post implements ifs.IServiceHandler
func (ts *TopologyService) Post(elements ifs.IElements, vnic ifs.IVNic) ifs.IElements {
	data := vnic.RoundRobinRequest(common2.INVENTORY_SERVICE_BOX, common2.INVENTORY_AREA_BOX, ifs.GET, &types2.Empty{})
	list, ok := data.Element().(*types.NetworkDeviceList)
	if ok {
		ts.networkTopology = generateTopology(list)
	}
	return object.New(nil, &types2.Empty{})
}

// Put implements ifs.IServiceHandler
func (ts *TopologyService) Put(elements ifs.IElements, vnic ifs.IVNic) ifs.IElements {
	return nil
}

// Patch implements ifs.IServiceHandler
func (ts *TopologyService) Patch(elements ifs.IElements, vnic ifs.IVNic) ifs.IElements {
	return nil
}

// Delete implements ifs.IServiceHandler
func (ts *TopologyService) Delete(elements ifs.IElements, vnic ifs.IVNic) ifs.IElements {
	return nil
}

// GetCopy implements ifs.IServiceHandler
func (ts *TopologyService) GetCopy(elements ifs.IElements, vnic ifs.IVNic) ifs.IElements {
	return nil
}

// Get implements ifs.IServiceHandler
func (ts *TopologyService) Get(elements ifs.IElements, vnic ifs.IVNic) ifs.IElements {
	return object.New(nil, ts.networkTopology)
}

// Failed implements ifs.IServiceHandler
func (ts *TopologyService) Failed(elements ifs.IElements, vnic ifs.IVNic, message *ifs.Message) ifs.IElements {
	return nil
}

// TransactionMethod implements ifs.IServiceHandler
func (ts *TopologyService) TransactionMethod() ifs.ITransactionMethod {
	return nil
}

// WebService implements ifs.IServiceHandler
func (ts *TopologyService) WebService() ifs.IWebService {
	ws := web.New(ServiceName, ServiceArea, &types2.Empty{},
		&types2.Empty{}, nil, nil, nil, nil, nil, nil,
		&types2.Empty{}, &types.NetworkTopology{})
	return ws
}
