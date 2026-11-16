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

// probler-agent: the AI agent (l8agent, service area 120) in its own pod --
// the chat service (AgntChat) plus its persistence services (AgntConvo,
// AgntMsg, AgntPrmpt) on this pod's own postgres database.
package main

import (
	"fmt"
	"os/exec"
	"time"

	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/prob/common/models"
)

// agentDB is the agent's database: a key of the "postgres" credentials (the
// key is the database name). l8agent's ORM services connect to 127.0.0.1:5432
// (port hard-coded upstream), so the credential's port must be 5432 and the
// database runs in this pod. Its own name keeps its data directory
// (/data/postgres/agentdb) apart from problerdb on shared hostPath volumes.
const agentDB = "agentdb"

func main() {
	res := common.CreateResources("agent")
	// The same models the web server registers (newui), so the agent can
	// describe and decode everything the UI serves.
	models.Register(res)
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()

	creds := nic.Resources().SysConfig().DataStoreConfig.Type
	startDb(creds, agentDB, nic)

	activateAgent(creds, agentDB, nic)

	res.Logger().Info("agent services activated!")
	common.WaitForSignal(res)
}

func startDb(creds, dbname string, nic ifs.IVNic) {
	_, user, pass, port, err := nic.Resources().Security().Credential(creds, dbname, nic.Resources())
	if err != nil {
		panic(creds + " " + dbname + " " + err.Error())
	}
	cmd := exec.Command("nohup", "/start-postgres.sh", dbname, user, pass, port)
	out, err := cmd.Output()
	if err != nil {
		panic(err)
	}
	fmt.Println(string(out))
	time.Sleep(time.Second * 5)
}
