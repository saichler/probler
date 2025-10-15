package serializers

import (
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/probler/go/types"
)

type Status struct{}

func (this *Status) Mode() ifs.SerializerMode {
	return ifs.STRING
}
func (this *Status) Marshal(any interface{}, r ifs.IResources) ([]byte, error) {
	return nil, nil
}
func (this *Status) Unmarshal(data []byte, r ifs.IResources) (interface{}, error) {
	str := string(data)
	switch str {
	case types.K8SPodStatus_Running.String():
		return types.K8SPodStatus_Running, nil
	case types.K8SPodStatus_Pending.String():
		return types.K8SPodStatus_Pending, nil
	case types.K8SPodStatus_Succeeded.String():
		return types.K8SPodStatus_Succeeded, nil
	case types.K8SPodStatus_Failed.String():
		return types.K8SPodStatus_Failed, nil
	case types.K8SPodStatus_Unknown.String():
		return types.K8SPodStatus_Unknown, nil
	case types.K8SPodStatus_CrashLoopBackOff.String():
		return types.K8SPodStatus_CrashLoopBackOff, nil
	case types.K8SPodStatus_Terminating.String():
		return types.K8SPodStatus_Terminating, nil
	case types.K8SPodStatus_ContainerCreating.String():
		return types.K8SPodStatus_ContainerCreating, nil
	case types.K8SPodStatus_ImagePullBackOff.String():
		return types.K8SPodStatus_ImagePullBackOff, nil
	case types.K8SPodStatus_Error.String():
		return types.K8SPodStatus_Error, nil
	case types.K8SPodStatus_Completed.String():
		return types.K8SPodStatus_Completed, nil
	}
	return nil, nil
}
