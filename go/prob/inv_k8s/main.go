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
	"github.com/saichler/l8bus/go/overlay/vnic"
	inventory "github.com/saichler/l8inventory/go/inv/service"
	"github.com/saichler/l8types/go/ifs"
	common2 "github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/serializers"
	types2 "github.com/saichler/probler/go/types"
)

func main() {
	res := common2.CreateResources("k8s")
	res.Logger().Info("Starting k8s inventory")
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()

	registerSerializers(nic)

	// Cluster summary (SA 1)
	inventory.Activate(common2.K8sClust_Links_ID, &types2.K8SCluster{}, &types2.K8SClusterList{}, nic, "Name")

	// Workloads (SA 10)
	inventory.Activate(common2.K8sPod_Links_ID, &types2.K8SPod{}, &types2.K8SPodList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sDeploy_Links_ID, &types2.K8SDeployment{}, &types2.K8SDeploymentList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sSts_Links_ID, &types2.K8SStatefulSet{}, &types2.K8SStatefulSetList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sDs_Links_ID, &types2.K8SDaemonSet{}, &types2.K8SDaemonSetList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sRs_Links_ID, &types2.K8SReplicaSet{}, &types2.K8SReplicaSetList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sJob_Links_ID, &types2.K8SJob{}, &types2.K8SJobList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sCj_Links_ID, &types2.K8SCronJob{}, &types2.K8SCronJobList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sHpa_Links_ID, &types2.K8SHPA{}, &types2.K8SHPAList{}, nic, "ClusterName", "Key")

	// Networking (SA 11)
	inventory.Activate(common2.K8sSvc_Links_ID, &types2.K8SService{}, &types2.K8SServiceList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sIng_Links_ID, &types2.K8SIngress{}, &types2.K8SIngressList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sNetPol_Links_ID, &types2.K8SNetworkPolicy{}, &types2.K8SNetworkPolicyList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sEp_Links_ID, &types2.K8SEndpoints{}, &types2.K8SEndpointsList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sEpSl_Links_ID, &types2.K8SEndpointSlice{}, &types2.K8SEndpointSliceList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sIngCl_Links_ID, &types2.K8SIngressClass{}, &types2.K8SIngressClassList{}, nic, "ClusterName", "Key")

	// Storage (SA 12)
	inventory.Activate(common2.K8sPv_Links_ID, &types2.K8SPersistentVolume{}, &types2.K8SPersistentVolumeList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sPvc_Links_ID, &types2.K8SPersistentVolumeClaim{}, &types2.K8SPersistentVolumeClaimList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sScl_Links_ID, &types2.K8SStorageClass{}, &types2.K8SStorageClassList{}, nic, "ClusterName", "Key")

	// Configuration (SA 13)
	inventory.Activate(common2.K8sCm_Links_ID, &types2.K8SConfigMap{}, &types2.K8SConfigMapList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sSec_Links_ID, &types2.K8SSecret{}, &types2.K8SSecretList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sRq_Links_ID, &types2.K8SResourceQuota{}, &types2.K8SResourceQuotaList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sLr_Links_ID, &types2.K8SLimitRange{}, &types2.K8SLimitRangeList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sPdb_Links_ID, &types2.K8SPodDisruptionBudget{}, &types2.K8SPodDisruptionBudgetList{}, nic, "ClusterName", "Key")

	// Access Control (SA 14)
	inventory.Activate(common2.K8sSa_Links_ID, &types2.K8SServiceAccount{}, &types2.K8SServiceAccountList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sRole_Links_ID, &types2.K8SRole{}, &types2.K8SRoleList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sCr_Links_ID, &types2.K8SClusterRole{}, &types2.K8SClusterRoleList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sRb_Links_ID, &types2.K8SRoleBinding{}, &types2.K8SRoleBindingList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.K8sCrb_Links_ID, &types2.K8SClusterRoleBinding{}, &types2.K8SClusterRoleBindingList{}, nic, "ClusterName", "Key")

	// Nodes (SA 15) — cluster-scoped, PK is ClusterName + Name
	inventory.Activate(common2.K8sNode_Links_ID, &types2.K8SNode{}, &types2.K8SNodeList{}, nic, "ClusterName", "Name")

	// Namespaces (SA 16) — cluster-scoped, PK is ClusterName + Name
	inventory.Activate(common2.K8sNs_Links_ID, &types2.K8SNamespace{}, &types2.K8SNamespaceList{}, nic, "ClusterName", "Name")

	// vCluster (SA 17)
	inventory.Activate(common2.K8sVCl_Links_ID, &types2.K8SVCluster{}, &types2.K8SVClusterList{}, nic, "ClusterName", "Key")

	// Istio (SA 18)
	inventory.Activate(common2.IstioVs_Links_ID, &types2.IstioVirtualService{}, &types2.IstioVirtualServiceList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.IstioDr_Links_ID, &types2.IstioDestinationRule{}, &types2.IstioDestinationRuleList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.IstioGw_Links_ID, &types2.IstioGateway{}, &types2.IstioGatewayList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.IstioSe_Links_ID, &types2.IstioServiceEntry{}, &types2.IstioServiceEntryList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.IstioPa_Links_ID, &types2.IstioPeerAuthentication{}, &types2.IstioPeerAuthenticationList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.IstioAp_Links_ID, &types2.IstioAuthorizationPolicy{}, &types2.IstioAuthorizationPolicyList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.IstioSc_Links_ID, &types2.IstioSidecar{}, &types2.IstioSidecarList{}, nic, "ClusterName", "Key")
	inventory.Activate(common2.IstioEf_Links_ID, &types2.IstioEnvoyFilter{}, &types2.IstioEnvoyFilterList{}, nic, "ClusterName", "Key")

	// CRDs (SA 19) — cluster-scoped, PK is ClusterName + Name
	inventory.Activate(common2.K8sCrd_Links_ID, &types2.K8SCRD{}, &types2.K8SCRDList{}, nic, "ClusterName", "Name")

	// Events (SA 20)
	inventory.Activate(common2.K8sEvt_Links_ID, &types2.K8SEvent{}, &types2.K8SEventList{}, nic, "ClusterName", "Key")

	common2.WaitForSignal(nic.Resources())
}

func registerSerializers(nic ifs.IVNic) {
	nic.Resources().Registry().Register(&types2.K8SReadyState{})
	nic.Resources().Registry().Register(&types2.K8SRestartsState{})

	info, err := nic.Resources().Registry().Info("K8SReadyState")
	if err != nil {
		nic.Resources().Logger().Error(err)
	} else {
		info.AddSerializer(&serializers.Ready{})
	}

	info, err = nic.Resources().Registry().Info("K8SRestartsState")
	if err != nil {
		nic.Resources().Logger().Error(err)
	} else {
		info.AddSerializer(&serializers.Restarts{})
	}

	nic.Resources().Registry().RegisterEnums(types2.K8SPodStatus_value)
	nic.Resources().Registry().RegisterEnums(types2.K8SNodeStatus_value)
}
