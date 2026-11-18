/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
You may obtain a copy of the License at:

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// probler-chat-agent: Tanto, the AI agent (l8ai ChatAgent, area 81). It answers
// in chat conversations as the requesting user, with the LLM profile chosen in
// the conversation (l8secure LLM providers/profiles).
package main

import (
	_ "embed"

	"github.com/saichler/l8ai/go/ai/agent"
	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/prob/common/models"
)

//go:embed help.md
var helpDocs string

// llmCA is the CA of the LLM services' LAN fallbacks (their certificates
// name the LAN address).
//
//go:embed llm-ca.crt
var llmCA string

// llmFallbacks are the LAN addresses of the LLM services: when the main URL
// does not answer at start (e.g. the public address from inside the LAN), the
// agent uses these, so the same image works inside and outside the LAN.
var llmFallbacks = map[string]string{
	"https://llm.test-llm.dev":   "https://192.168.1.124:8080", // gpt-oss-120b
	"https://muse.test-llm.dev":  "https://192.168.1.124:8082", // muse-glimmer-30b
	"https://tools.test-llm.dev": "https://192.168.1.124:8083", // web tools ('@web')
}

const systemPrompt = `You work in Probler, a datacenter management system. Its data covers network devices (NetworkDevice: vendors, models, status, uptime, interfaces, physical inventory), GPU servers (GpuDevice: one record per server, not per GPU; deviceInfo.gpuCount is how many GPUs the server has, so the number of GPUs is sum(deviceInfo.gpuCount) while count(*) is the number of servers; GPU models, utilization, memory, temperatures, driver and CUDA versions), Kubernetes clusters (K8SCluster, nodes, pods, deployments, services, storage), alarms and events (Alarm, EventRecord) and polling targets (L8PTarget). Prefer aggregate queries for counts and status summaries.`

func main() {
	res := common.CreateResources("chat-agent")
	// The same models the web server registers (newui), through Tanto, so the
	// agent can describe and decode everything the UI serves.
	agent.CallRegisterModels(res, models.Register)
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()

	agent.ActivateAgent(agent.AgentConfig{
		RegisterTypes: models.Register,
		SystemPrompt:  systemPrompt,
		HelpDocs:      helpDocs,
		WebToolsURL:   "https://tools.test-llm.dev",
		Fallbacks:     llmFallbacks,
		TrustedCAs:    llmCA,
	}, nic)

	res.Logger().Info("chat agent activated")
	common.WaitForSignal(res)
}
