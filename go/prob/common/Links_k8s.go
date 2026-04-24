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

package common

const (
	// Cluster summary (SA 1)
	K8sClust_Links_ID = "K8sClust"

	// Workloads (SA 10)
	K8sPod_Links_ID    = "K8sPod"
	K8sDeploy_Links_ID = "K8sDeploy"
	K8sSts_Links_ID    = "K8sSts"
	K8sDs_Links_ID     = "K8sDs"
	K8sRs_Links_ID     = "K8sRs"
	K8sJob_Links_ID    = "K8sJob"
	K8sCj_Links_ID     = "K8sCj"
	K8sHpa_Links_ID    = "K8sHpa"

	// Networking (SA 11)
	K8sSvc_Links_ID    = "K8sSvc"
	K8sIng_Links_ID    = "K8sIng"
	K8sNetPol_Links_ID = "K8sNetPol"
	K8sEp_Links_ID     = "K8sEp"
	K8sEpSl_Links_ID   = "K8sEpSl"
	K8sIngCl_Links_ID  = "K8sIngCl"

	// Storage (SA 12)
	K8sPv_Links_ID  = "K8sPv"
	K8sPvc_Links_ID = "K8sPvc"
	K8sScl_Links_ID = "K8sScl"

	// Configuration (SA 13)
	K8sCm_Links_ID  = "K8sCm"
	K8sSec_Links_ID = "K8sSec"
	K8sRq_Links_ID  = "K8sRq"
	K8sLr_Links_ID  = "K8sLr"
	K8sPdb_Links_ID = "K8sPdb"

	// Access Control (SA 14)
	K8sSa_Links_ID   = "K8sSa"
	K8sRole_Links_ID = "K8sRole"
	K8sCr_Links_ID   = "K8sCr"
	K8sRb_Links_ID   = "K8sRb"
	K8sCrb_Links_ID  = "K8sCrb"

	// Nodes (SA 15)
	K8sNode_Links_ID = "K8sNode"

	// Namespaces (SA 16)
	K8sNs_Links_ID = "K8sNs"

	// vCluster (SA 17)
	K8sVCl_Links_ID = "K8sVCl"

	// Istio (SA 18)
	IstioVs_Links_ID = "IstioVs"
	IstioDr_Links_ID = "IstioDr"
	IstioGw_Links_ID = "IstioGw"
	IstioSe_Links_ID = "IstioSe"
	IstioPa_Links_ID = "IstioPa"
	IstioAp_Links_ID = "IstioAp"
	IstioSc_Links_ID = "IstioSc"
	IstioEf_Links_ID = "IstioEf"

	// CRDs (SA 19)
	K8sCrd_Links_ID = "K8sCrd"

	// Events (SA 20)
	K8sEvt_Links_ID = "K8sEvt"
)

type k8sLinkEntry struct {
	CacheName   string
	CacheArea   byte
	ParserName  string
	ParserArea  byte
	PersistName string
	PersistArea byte
	ModelName   string
}

var k8sLinkMap = map[string]k8sLinkEntry{
	K8sClust_Links_ID: {"KCluster", 1, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 1, "k8scluster"},

	// Workloads (SA 10)
	K8sPod_Links_ID:    {"K8sPod", 10, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 10, "k8spod"},
	K8sDeploy_Links_ID: {"K8sDploy", 10, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 10, "k8sdeployment"},
	K8sSts_Links_ID:    {"K8sSts", 10, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 10, "k8sstatefulset"},
	K8sDs_Links_ID:     {"K8sDs", 10, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 10, "k8sdaemonset"},
	K8sRs_Links_ID:     {"K8sRs", 10, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 10, "k8sreplicaset"},
	K8sJob_Links_ID:    {"K8sJob", 10, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 10, "k8sjob"},
	K8sCj_Links_ID:     {"K8sCj", 10, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 10, "k8scronjob"},
	K8sHpa_Links_ID:    {"K8sHpa", 10, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 10, "k8shpa"},

	// Networking (SA 11)
	K8sSvc_Links_ID:    {"K8sSvc", 11, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 11, "k8sservice"},
	K8sIng_Links_ID:    {"K8sIng", 11, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 11, "k8singress"},
	K8sNetPol_Links_ID: {"K8sNtPol", 11, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 11, "k8snetworkpolicy"},
	K8sEp_Links_ID:     {"K8sEp", 11, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 11, "k8sendpoints"},
	K8sEpSl_Links_ID:   {"K8sEpSl", 11, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 11, "k8sendpointslice"},
	K8sIngCl_Links_ID:  {"K8sIngCl", 11, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 11, "k8singressclass"},

	// Storage (SA 12)
	K8sPv_Links_ID:  {"K8sPv", 12, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 12, "k8spersistentvolume"},
	K8sPvc_Links_ID: {"K8sPvc", 12, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 12, "k8spersistentvolumeclaim"},
	K8sScl_Links_ID: {"K8sScl", 12, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 12, "k8sstorageclass"},

	// Configuration (SA 13)
	K8sCm_Links_ID:  {"K8sCm", 13, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 13, "k8sconfigmap"},
	K8sSec_Links_ID: {"K8sSec", 13, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 13, "k8ssecret"},
	K8sRq_Links_ID:  {"K8sRq", 13, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 13, "k8sresourcequota"},
	K8sLr_Links_ID:  {"K8sLr", 13, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 13, "k8slimitrange"},
	K8sPdb_Links_ID: {"K8sPdb", 13, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 13, "k8spoddisruptionbudget"},

	// Access Control (SA 14)
	K8sSa_Links_ID:   {"K8sSa", 14, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 14, "k8sserviceaccount"},
	K8sRole_Links_ID: {"K8sRole", 14, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 14, "k8srole"},
	K8sCr_Links_ID:   {"K8sCr", 14, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 14, "k8sclusterrole"},
	K8sRb_Links_ID:   {"K8sRb", 14, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 14, "k8srolebinding"},
	K8sCrb_Links_ID:  {"K8sCrb", 14, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 14, "k8sclusterrolebinding"},

	// Nodes (SA 15)
	K8sNode_Links_ID: {"K8sNode", 15, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 15, "k8snode"},

	// Namespaces (SA 16)
	K8sNs_Links_ID: {"K8sNs", 16, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 16, "k8snamespace"},

	// vCluster (SA 17)
	K8sVCl_Links_ID: {"K8sVCl", 17, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 17, "k8svcluster"},

	// Istio (SA 18)
	IstioVs_Links_ID: {"IstioVs", 18, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 18, "istiovirtualservice"},
	IstioDr_Links_ID: {"IstioDr", 18, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 18, "istiodestinationrule"},
	IstioGw_Links_ID: {"IstioGw", 18, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 18, "istiogateway"},
	IstioSe_Links_ID: {"IstioSe", 18, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 18, "istioserviceentry"},
	IstioPa_Links_ID: {"IstioPa", 18, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 18, "istiopeerauthentication"},
	IstioAp_Links_ID: {"IstioAp", 18, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 18, "istioauthorizationpolicy"},
	IstioSc_Links_ID: {"IstioSc", 18, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 18, "istiosidecar"},
	IstioEf_Links_ID: {"IstioEf", 18, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 18, "istioenvoyfilter"},

	// CRDs (SA 19)
	K8sCrd_Links_ID: {"K8sCrd", 19, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 19, "k8scrd"},

	// Events (SA 20)
	K8sEvt_Links_ID: {"K8sEvt", 20, K8s_Parser_Service_Name, K8s_Parser_Service_Area, K8s_Persist_Service_Name, 20, "k8sevent"},
}

func k8sCache(linkid string) (string, byte, bool) {
	if entry, ok := k8sLinkMap[linkid]; ok {
		return entry.CacheName, entry.CacheArea, true
	}
	return "", 0, false
}

func k8sParser(linkid string) (string, byte, bool) {
	if entry, ok := k8sLinkMap[linkid]; ok {
		return entry.ParserName, entry.ParserArea, true
	}
	return "", 0, false
}

func k8sPersist(linkid string) (string, byte, bool) {
	if entry, ok := k8sLinkMap[linkid]; ok {
		return entry.PersistName, entry.PersistArea, true
	}
	return "", 0, false
}

func k8sModel(linkid string) (string, bool) {
	if entry, ok := k8sLinkMap[linkid]; ok {
		return entry.ModelName, true
	}
	return "", false
}
