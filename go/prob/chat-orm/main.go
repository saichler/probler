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

// probler-chat-orm: the chat persistence services (l8ai, area 81) on this
// pod's own postgres database, the system config's ChatStoreConfig.
package main

import (
	"fmt"
	"os/exec"
	"time"

	"github.com/saichler/l8ai/go/ai/orm"
	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/probler/go/prob/common"
)

func main() {
	res := common.CreateResources("chat-orm")
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()

	chatStore := nic.Resources().SysConfig().ChatStoreConfig
	if chatStore == nil || chatStore.Name == "" {
		panic("the system config has no ChatStoreConfig")
	}
	startDb(chatStore.Type, chatStore.Name, nic)
	orm.ActivateOrm(chatStore.Type, chatStore.Name, nic)

	res.Logger().Info("chat orm activated")
	common.WaitForSignal(res)
}

func startDb(creds, dbname string, nic ifs.IVNic) {
	_, user, pass, port, err := nic.Resources().Security().Credential(creds, dbname, nic.Resources())
	if err != nil {
		panic(creds + " " + dbname + " " + err.Error())
	}
	out, err := exec.Command("nohup", "/start-postgres.sh", dbname, user, pass, port).Output()
	if err != nil {
		panic(err)
	}
	fmt.Println(string(out))
	time.Sleep(time.Second * 5)
}
