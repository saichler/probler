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
	"fmt"
	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8events/go/services"
	"github.com/saichler/l8pollaris/go/pollaris/targets"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/probler/go/prob/common"
	"os"
	"os/exec"
	"time"
)

func main() {
	res := common.CreateResources("orm")
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()

	//Start postgres
	if len(os.Args) <= 1 {
		startDb(nic)
	}

	//Activate targets
	targets.Activate(nic.Resources().SysConfig().DataStoreConfig.Type, nic.Resources().SysConfig().DataStoreConfig.Name, nic)

	//Activate Events
	services.ActivateEvents(nic.Resources().SysConfig().DataStoreConfig.Type, nic.Resources().SysConfig().DataStoreConfig.Name, nic)

	//targets.Activate("admin", "admin", nic)
	common.WaitForSignal(res)
}

func startDb(nic ifs.IVNic) {
	_, user, pass, port, err := nic.Resources().Security().Credential(nic.Resources().SysConfig().DataStoreConfig.Type, nic.Resources().SysConfig().DataStoreConfig.Name, nic.Resources())
	if err != nil {
		panic(nic.Resources().SysConfig().DataStoreConfig.Type + " " + nic.Resources().SysConfig().DataStoreConfig.Name + " " + err.Error())
	}
	cmd := exec.Command("nohup", "/start-postgres.sh", nic.Resources().SysConfig().DataStoreConfig.Name, user, pass, port)
	out, err := cmd.Output()
	if err != nil {
		panic(err)
	}
	fmt.Println(string(out))
	time.Sleep(time.Second * 5)
}
