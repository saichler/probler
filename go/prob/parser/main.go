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
	"github.com/saichler/l8parser/go/parser/rules"
	"github.com/saichler/l8parser/go/parser/service"
	"github.com/saichler/l8pollaris/go/pollaris"
	"github.com/saichler/l8types/go/ifs"
	common2 "github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/prob/parser/serializers"
	types3 "github.com/saichler/probler/go/types"
)

func main() {
	resources := common2.CreateResources("parser")
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Start()
	nic.WaitForConnection()

	nic.Resources().Registry().RegisterEnums(types3.K8SPodStatus_value)
	nic.Resources().Registry().Register(&types3.K8SReadyState{})
	info, _ := nic.Resources().Registry().Info("K8SReadyState")
	info.AddSerializer(&serializers.Ready{})

	nic.Resources().Registry().Register(&types3.K8SRestartsState{})
	infoR, _ := nic.Resources().Registry().Info("K8SRestartsState")
	infoR.AddSerializer(&serializers.Restarts{})

	// Register string→int32 maps for typed-enum fields populated from raw
	// K8s API strings. The keys here mirror what the K8s API returns
	// directly ("Running", "Ready", …) and what the collector's enrichment
	// emits for derived statuses ("Ready" / "NotReady" from
	// status.conditions[type=Ready]). Without this, the parser's
	// setFieldValue would either reject the assignment or convert string→
	// int32 via a rune cast and leave the proto field at 0 (UNSPECIFIED) —
	// which the UI rendered as a permanent "Unknown".
	rules.RegisterEnum("K8SPodStatus", map[string]int32{
		"Running":           int32(types3.K8SPodStatus_K8S_POD_STATUS_RUNNING),
		"Pending":           int32(types3.K8SPodStatus_K8S_POD_STATUS_PENDING),
		"Succeeded":         int32(types3.K8SPodStatus_K8S_POD_STATUS_SUCCEEDED),
		"Failed":            int32(types3.K8SPodStatus_K8S_POD_STATUS_FAILED),
		"Unknown":           int32(types3.K8SPodStatus_K8S_POD_STATUS_UNKNOWN),
		"CrashLoopBackOff":  int32(types3.K8SPodStatus_K8S_POD_STATUS_CRASHLOOPBACKOFF),
		"Terminating":       int32(types3.K8SPodStatus_K8S_POD_STATUS_TERMINATING),
		"ContainerCreating": int32(types3.K8SPodStatus_K8S_POD_STATUS_CONTAINERCREATING),
		"ImagePullBackOff":  int32(types3.K8SPodStatus_K8S_POD_STATUS_IMAGEPULLBACKOFF),
		"Error":             int32(types3.K8SPodStatus_K8S_POD_STATUS_ERROR),
		"Completed":         int32(types3.K8SPodStatus_K8S_POD_STATUS_COMPLETED),
	})
	rules.RegisterEnum("K8SNodeStatus", map[string]int32{
		"Ready":    int32(types3.K8SNodeStatus_K8S_NODE_STATUS_READY),
		"NotReady": int32(types3.K8SNodeStatus_K8S_NODE_STATUS_NOT_READY),
	})

	//Activate Polaris
	pollaris.Activate(nic)

	//Activate Inventory parser
	service.Activate(common2.NetworkDevice_Links_ID, &types3.NetworkDevice{}, false, nic, "Id")

	// Activate Kubernetes parsers — cluster summary
	service.Activate(common2.K8sClust_Links_ID, &types3.K8SCluster{}, false, nic, "Name")

	// Workloads (SA 10)
	service.Activate(common2.K8sPod_Links_ID, &types3.K8SPod{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sDeploy_Links_ID, &types3.K8SDeployment{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sSts_Links_ID, &types3.K8SStatefulSet{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sDs_Links_ID, &types3.K8SDaemonSet{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sRs_Links_ID, &types3.K8SReplicaSet{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sJob_Links_ID, &types3.K8SJob{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sCj_Links_ID, &types3.K8SCronJob{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sHpa_Links_ID, &types3.K8SHPA{}, false, nic, "ClusterName", "Key")

	// Networking (SA 11)
	service.Activate(common2.K8sSvc_Links_ID, &types3.K8SService{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sIng_Links_ID, &types3.K8SIngress{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sNetPol_Links_ID, &types3.K8SNetworkPolicy{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sEp_Links_ID, &types3.K8SEndpoints{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sEpSl_Links_ID, &types3.K8SEndpointSlice{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sIngCl_Links_ID, &types3.K8SIngressClass{}, false, nic, "ClusterName", "Key")

	// Storage (SA 12)
	service.Activate(common2.K8sPv_Links_ID, &types3.K8SPersistentVolume{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sPvc_Links_ID, &types3.K8SPersistentVolumeClaim{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sScl_Links_ID, &types3.K8SStorageClass{}, false, nic, "ClusterName", "Key")

	// Configuration (SA 13)
	service.Activate(common2.K8sCm_Links_ID, &types3.K8SConfigMap{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sSec_Links_ID, &types3.K8SSecret{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sRq_Links_ID, &types3.K8SResourceQuota{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sLr_Links_ID, &types3.K8SLimitRange{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sPdb_Links_ID, &types3.K8SPodDisruptionBudget{}, false, nic, "ClusterName", "Key")

	// Access Control (SA 14)
	service.Activate(common2.K8sSa_Links_ID, &types3.K8SServiceAccount{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sRole_Links_ID, &types3.K8SRole{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sCr_Links_ID, &types3.K8SClusterRole{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sRb_Links_ID, &types3.K8SRoleBinding{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.K8sCrb_Links_ID, &types3.K8SClusterRoleBinding{}, false, nic, "ClusterName", "Key")

	// Nodes (SA 15) — PK is ClusterName + Name (no namespace)
	service.Activate(common2.K8sNode_Links_ID, &types3.K8SNode{}, false, nic, "ClusterName", "Name")

	// Namespaces (SA 16) — PK is ClusterName + Name (no namespace)
	service.Activate(common2.K8sNs_Links_ID, &types3.K8SNamespace{}, false, nic, "ClusterName", "Name")

	// vCluster (SA 17)
	service.Activate(common2.K8sVCl_Links_ID, &types3.K8SVCluster{}, false, nic, "ClusterName", "Key")

	// Istio (SA 18)
	service.Activate(common2.IstioVs_Links_ID, &types3.IstioVirtualService{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.IstioDr_Links_ID, &types3.IstioDestinationRule{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.IstioGw_Links_ID, &types3.IstioGateway{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.IstioSe_Links_ID, &types3.IstioServiceEntry{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.IstioPa_Links_ID, &types3.IstioPeerAuthentication{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.IstioAp_Links_ID, &types3.IstioAuthorizationPolicy{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.IstioSc_Links_ID, &types3.IstioSidecar{}, false, nic, "ClusterName", "Key")
	service.Activate(common2.IstioEf_Links_ID, &types3.IstioEnvoyFilter{}, false, nic, "ClusterName", "Key")

	// CRDs (SA 19) — PK is ClusterName + Name (no namespace)
	service.Activate(common2.K8sCrd_Links_ID, &types3.K8SCRD{}, false, nic, "ClusterName", "Name")

	// Events (SA 20)
	service.Activate(common2.K8sEvt_Links_ID, &types3.K8SEvent{}, false, nic, "ClusterName", "Key")

	//Activate GPU parser
	service.Activate(common2.GPU_Links_ID, &types3.GpuDevice{}, false, nic, "Id")

	common2.WaitForSignal(resources)
}
