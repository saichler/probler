/*
 * © 2025 Sharon Aicler (saichler@gmail.com)
 *
 * Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package main

import (
	"github.com/saichler/l8alarms/go/alm/ui"
	common2 "github.com/saichler/l8common/go/common"
	"github.com/saichler/l8events/go/types/l8events"
	"github.com/saichler/l8logfusion/go/types/l8logf"
	"github.com/saichler/l8pollaris/go/types/l8tpollaris"
	"github.com/saichler/l8topology/go/types/l8topo"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8types/go/types/l8api"
	"github.com/saichler/l8types/go/types/l8health"
	"github.com/saichler/l8types/go/types/l8web"
	"github.com/saichler/probler/go/types"
	types2 "github.com/saichler/probler/go/types"
)

func main() {
	svr := common2.CreateWebServer("web", RegisterTypes)
	svr.Start()
}

func RegisterTypes(res ifs.IResources) {
	ui.RegisterAlmTypes(res)

	res.Introspector().Decorators().AddPrimaryKeyDecorator(&types.NetworkDevice{}, "Id")
	res.Introspector().Decorators().AddPrimaryKeyDecorator(&types2.GpuDevice{}, "Id")
	res.Introspector().Decorators().AddPrimaryKeyDecorator(&l8topo.L8TopologyMetadata{}, "ServiceName", "ServiceArea")
	res.Introspector().Decorators().AddPrimaryKeyDecorator(&l8tpollaris.L8PTarget{}, "TargetId")
	res.Introspector().Decorators().AddPrimaryKeyDecorator(&l8events.EventRecord{}, "EventId")
	res.Introspector().Decorators().AddPrimaryKeyDecorator(&l8logf.L8File{}, "Path", "Name")

	registerK8sTypes(res)

	res.Registry().Register(&l8tpollaris.L8Pollaris{})
	res.Registry().Register(&l8tpollaris.L8PTarget{})
	res.Registry().Register(&l8tpollaris.L8PTargetList{})
	res.Registry().Register(&types.NetworkDevice{})
	res.Registry().Register(&types.NetworkDeviceList{})
	res.Registry().Register(&l8api.L8Query{})
	res.Registry().Register(&l8health.L8Top{})
	res.Registry().Register(&l8web.L8Empty{})
	res.Registry().Register(&l8tpollaris.CJob{})
	res.Registry().Register(&l8health.L8Health{})
	res.Registry().Register(&l8health.L8HealthList{})
	res.Registry().Register(&l8logf.L8File{})
	res.Registry().Register(&l8tpollaris.TargetAction{})
	res.Registry().Register(&l8topo.L8Topology{})
	res.Registry().Register(&l8topo.L8TopologyQuery{})
	res.Registry().Register(&types2.GpuDevice{})
	res.Registry().Register(&types2.GpuDeviceList{})
	res.Registry().Register(&l8topo.L8TopologyMetadataList{})
	res.Registry().Register(&l8topo.L8TopologyMetadata{})
	res.Registry().Register(&l8events.EventRecordList{})
}

func registerK8sTypes(res ifs.IResources) {
	d := res.Introspector().Decorators()
	r := res.Registry()

	d.AddPrimaryKeyDecorator(&types2.K8SCluster{}, "Name")
	d.AddPrimaryKeyDecorator(&types2.K8SNamespace{}, "Name")
	d.AddPrimaryKeyDecorator(&types2.K8SCRD{}, "Name")
	d.AddPrimaryKeyDecorator(&types2.K8SPod{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SDeployment{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SStatefulSet{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SDaemonSet{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SReplicaSet{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SJob{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SCronJob{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SHPA{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SService{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SIngress{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SNetworkPolicy{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SEndpoints{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SEndpointSlice{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SIngressClass{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SNode{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SPersistentVolume{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SPersistentVolumeClaim{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SStorageClass{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SConfigMap{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SSecret{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SResourceQuota{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SLimitRange{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SPodDisruptionBudget{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SServiceAccount{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SRole{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SClusterRole{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SRoleBinding{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SClusterRoleBinding{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SVCluster{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.IstioVirtualService{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.IstioDestinationRule{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.IstioGateway{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.IstioServiceEntry{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.IstioPeerAuthentication{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.IstioAuthorizationPolicy{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.IstioSidecar{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.IstioEnvoyFilter{}, "Key")
	d.AddPrimaryKeyDecorator(&types2.K8SEvent{}, "Key")

	r.Register(&types2.K8SCluster{})
	r.Register(&types2.K8SClusterList{})
	r.Register(&types2.K8SPod{})
	r.Register(&types2.K8SPodList{})
	r.Register(&types2.K8SDeployment{})
	r.Register(&types2.K8SDeploymentList{})
	r.Register(&types2.K8SStatefulSet{})
	r.Register(&types2.K8SStatefulSetList{})
	r.Register(&types2.K8SDaemonSet{})
	r.Register(&types2.K8SDaemonSetList{})
	r.Register(&types2.K8SReplicaSet{})
	r.Register(&types2.K8SReplicaSetList{})
	r.Register(&types2.K8SJob{})
	r.Register(&types2.K8SJobList{})
	r.Register(&types2.K8SCronJob{})
	r.Register(&types2.K8SCronJobList{})
	r.Register(&types2.K8SHPA{})
	r.Register(&types2.K8SHPAList{})
	r.Register(&types2.K8SService{})
	r.Register(&types2.K8SServiceList{})
	r.Register(&types2.K8SIngress{})
	r.Register(&types2.K8SIngressList{})
	r.Register(&types2.K8SNetworkPolicy{})
	r.Register(&types2.K8SNetworkPolicyList{})
	r.Register(&types2.K8SEndpoints{})
	r.Register(&types2.K8SEndpointsList{})
	r.Register(&types2.K8SEndpointSlice{})
	r.Register(&types2.K8SEndpointSliceList{})
	r.Register(&types2.K8SIngressClass{})
	r.Register(&types2.K8SIngressClassList{})
	r.Register(&types2.K8SNode{})
	r.Register(&types2.K8SNodeList{})
	r.Register(&types2.K8SNamespace{})
	r.Register(&types2.K8SNamespaceList{})
	r.Register(&types2.K8SPersistentVolume{})
	r.Register(&types2.K8SPersistentVolumeList{})
	r.Register(&types2.K8SPersistentVolumeClaim{})
	r.Register(&types2.K8SPersistentVolumeClaimList{})
	r.Register(&types2.K8SStorageClass{})
	r.Register(&types2.K8SStorageClassList{})
	r.Register(&types2.K8SConfigMap{})
	r.Register(&types2.K8SConfigMapList{})
	r.Register(&types2.K8SSecret{})
	r.Register(&types2.K8SSecretList{})
	r.Register(&types2.K8SResourceQuota{})
	r.Register(&types2.K8SResourceQuotaList{})
	r.Register(&types2.K8SLimitRange{})
	r.Register(&types2.K8SLimitRangeList{})
	r.Register(&types2.K8SPodDisruptionBudget{})
	r.Register(&types2.K8SPodDisruptionBudgetList{})
	r.Register(&types2.K8SServiceAccount{})
	r.Register(&types2.K8SServiceAccountList{})
	r.Register(&types2.K8SRole{})
	r.Register(&types2.K8SRoleList{})
	r.Register(&types2.K8SClusterRole{})
	r.Register(&types2.K8SClusterRoleList{})
	r.Register(&types2.K8SRoleBinding{})
	r.Register(&types2.K8SRoleBindingList{})
	r.Register(&types2.K8SClusterRoleBinding{})
	r.Register(&types2.K8SClusterRoleBindingList{})
	r.Register(&types2.K8SVCluster{})
	r.Register(&types2.K8SVClusterList{})
	r.Register(&types2.IstioVirtualService{})
	r.Register(&types2.IstioVirtualServiceList{})
	r.Register(&types2.IstioDestinationRule{})
	r.Register(&types2.IstioDestinationRuleList{})
	r.Register(&types2.IstioGateway{})
	r.Register(&types2.IstioGatewayList{})
	r.Register(&types2.IstioServiceEntry{})
	r.Register(&types2.IstioServiceEntryList{})
	r.Register(&types2.IstioPeerAuthentication{})
	r.Register(&types2.IstioPeerAuthenticationList{})
	r.Register(&types2.IstioAuthorizationPolicy{})
	r.Register(&types2.IstioAuthorizationPolicyList{})
	r.Register(&types2.IstioSidecar{})
	r.Register(&types2.IstioSidecarList{})
	r.Register(&types2.IstioEnvoyFilter{})
	r.Register(&types2.IstioEnvoyFilterList{})
	r.Register(&types2.K8SCRD{})
	r.Register(&types2.K8SCRDList{})
	r.Register(&types2.K8SEvent{})
	r.Register(&types2.K8SEventList{})
}
