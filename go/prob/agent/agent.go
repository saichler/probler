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
	_ "embed"
	"time"

	agent "github.com/saichler/l8agent/go"
	"github.com/saichler/l8agent/go/executor"
	"github.com/saichler/l8agent/go/llm"
	"github.com/saichler/l8agent/go/masking"
	"github.com/saichler/l8agent/go/schema"
	"github.com/saichler/l8agent/go/services/chat"
	"github.com/saichler/l8agent/go/types/l8agent"
	"github.com/saichler/l8agent/go/webtools"
	"github.com/saichler/l8bus/go/overlay/health"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8types/go/types/l8services"
	"github.com/saichler/l8types/go/types/l8sysconfig"
	"google.golang.org/protobuf/proto"
)

// AgentServiceArea is the l8agent service area (AgntChat, AgntConvo, AgntMsg,
// AgntPrmpt) -- the same area the UI's L8AgentBubble / L8AgentChat target.
const AgentServiceArea = byte(120)

//go:embed help.md
var helpDocs string

// agentConfig mirrors l8erp's aia.AgentConfig: local OpenAI-compatible LLM
// (TestLLM credentials, "chat" key), @help from help.md, @web via WebToolsURL.
func agentConfig(creds, dbname string, vnic ifs.IVNic) agent.AgentConfig {
	return agent.AgentConfig{
		Resources:   vnic.Resources(),
		ServiceArea: AgentServiceArea,
		DBCreds:     creds,
		DBName:      dbname,
		LLMCreds:    "TestLLM",
		LLMProvider: "openai",
		LLMCredKey:  "chat",
		HelpDocs:    helpDocs,
		WebToolsURL: "https://tools.test-llm.dev",
		DefaultPrompts: []*l8agent.L8AgentPrompt{
			{
				Name:         "Network Operations",
				Description:  "Network device inventory, status, interfaces and health",
				SystemPrompt: "You are a network operations assistant for a datacenter. Focus on network devices (NetworkDevice): vendors, models, status, uptime, interfaces and physical inventory. Prefer aggregate queries for counts and status summaries.",
				Category:     int32(l8agent.L8AgentPromptCategory_L8_AGENT_PROMPT_CATEGORY_ANALYSIS),
			},
			{
				Name:         "GPU & AI Infrastructure",
				Description:  "GPU servers, utilization, memory, temperatures and software",
				SystemPrompt: "You are an AI infrastructure assistant. Focus on GPU servers (GpuDevice): GPU models, counts, utilization, memory, temperatures, driver/CUDA versions and status.",
				Category:     int32(l8agent.L8AgentPromptCategory_L8_AGENT_PROMPT_CATEGORY_ANALYSIS),
			},
			{
				Name:         "Kubernetes",
				Description:  "Cluster, workload, networking and storage analysis",
				SystemPrompt: "You are a Kubernetes operations assistant. Focus on clusters (K8SCluster), nodes, pods, deployments, services and storage. Highlight pods that are not running or restarting.",
				Category:     int32(l8agent.L8AgentPromptCategory_L8_AGENT_PROMPT_CATEGORY_ANALYSIS),
			},
			{
				Name:         "Alarm Triage",
				Description:  "Active alarms, events, correlation and root cause",
				SystemPrompt: "You are a NOC alarm triage assistant. Focus on active alarms (Alarm), events (EventRecord), alarm definitions and correlation rules. Group alarms by severity and source, and point at likely root causes.",
				Category:     int32(l8agent.L8AgentPromptCategory_L8_AGENT_PROMPT_CATEGORY_WORKFLOW),
			},
			{
				Name:         "Executive Summary",
				Description:  "Datacenter-wide KPI summary",
				SystemPrompt: "You are an executive assistant for a datacenter. Summarize network devices, GPU servers, Kubernetes clusters and alarms with aggregate counts and totals rather than individual records.",
				Category:     int32(l8agent.L8AgentPromptCategory_L8_AGENT_PROMPT_CATEGORY_REPORTING),
			},
		},
	}
}

// activateAgent activates the agent's ORM services (conversations, messages,
// prompts) and then the chat service. Chat must come after every other
// service of this node.
func activateAgent(creds, dbname string, nic ifs.IVNic) {
	config := agentConfig(creds, dbname, nic)
	if err := agent.Initialize(config, nic); err != nil {
		panic("l8agent: " + err.Error())
	}
	activateChatClusterWide(config, nic)
}

// ---------------------------------------------------------------------------
// Cluster-wide service catalog for the agent.
//
// KNOWN UPSTREAM BUG (l8agent): the schema provider (buildTier1) and the tool
// executor (serviceCatalog) read SysConfig().Services, which l8bus keeps as the
// LOCAL node's services only (vnic/VirtualNetworkInterface.go restores it after
// every handshake). In l8erp every service runs in one pod, so that is the whole
// catalog; in probler the agent (its own pod) would only see its own
// services -- "I don't know a NetworkDevice model", GPU questions answered with
// the target count. The fix belongs in l8agent (use health.ServiceCatalog);
// until it is pushed, the chat is built here with the same parts as
// agent.InitializeChat, but its schema provider and tool executor see a
// SysConfig whose Services is the cluster-wide catalog. The chat service itself
// still registers on the real vnic.
// ---------------------------------------------------------------------------

// catalogResources is the node's resources with SysConfig().Services replaced
// (on a copy) by every node's services, merged from the health records.
type catalogResources struct {
	ifs.IResources
}

func (r *catalogResources) SysConfig() *l8sysconfig.L8SysConfig {
	real := r.IResources.SysConfig()
	view := proto.Clone(real).(*l8sysconfig.L8SysConfig)
	merged := health.ServiceCatalog(r.IResources)
	if real.Services != nil {
		for name, areas := range real.Services.ServiceToAreas {
			if _, ok := merged[name]; !ok {
				merged[name] = areas
			}
		}
	}
	view.Services = &l8services.L8Services{ServiceToAreas: merged}
	return view
}

// catalogVnic is the real vnic, reporting catalogResources.
type catalogVnic struct {
	ifs.IVNic
	res ifs.IResources
}

func (v *catalogVnic) Resources() ifs.IResources { return v.res }

// catalogRefreshInterval: the model list is cached by the schema provider, and
// the other pods' services come up after this one.
const catalogRefreshInterval = 30 * time.Second

// activateChatClusterWide mirrors agent.InitializeChat (l8agent go/init.go).
func activateChatClusterWide(config agent.AgentConfig, nic ifs.IVNic) {
	var llmClient *llm.Client
	// Credential layout: aside=base URL, yside=model, zside=API key.
	_, baseURL, apiKey, model, err := nic.Resources().Security().Credential(config.LLMCreds, config.LLMCredKey, nic.Resources())
	if err != nil {
		panic("l8agent chat: LLM credentials " + config.LLMCreds + "/" + config.LLMCredKey + ": " + err.Error())
	}
	if apiKey == "" {
		panic("l8agent chat: LLM API key is empty (" + config.LLMCreds + "/" + config.LLMCredKey + ")")
	}
	llmClient = llm.NewOpenAIClient(baseURL, apiKey, model)

	cres := &catalogResources{IResources: nic.Resources()}
	schemaProvider := schema.NewProvider(cres)
	toolExec := executor.NewToolExecutor(&catalogVnic{IVNic: nic, res: cres}, schemaProvider)
	maskingProxy := masking.NewProxy(masking.NewConfig(config.MaskingOverrides))

	chat.Activate(config.ServiceArea, nic, llmClient, schemaProvider, toolExec, maskingProxy,
		config.HelpDocs, webtools.New(config.WebToolsURL, apiKey))

	go func() {
		for {
			time.Sleep(catalogRefreshInterval)
			schemaProvider.RefreshCache()
		}
	}()
}
