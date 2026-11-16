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

// probler-chat-router: the chat router (l8ai, area 81) -- the conversation
// index and the public ChatMsg / ChatConv / ChatPeer / ChatSync services.
package main

import (
	"github.com/saichler/l8ai/go/ai/router"
	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/probler/go/prob/common"
)

func main() {
	res := common.CreateResources("chat-router")
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()

	router.ActivateRouter(nil, nic)

	res.Logger().Info("chat router activated")
	common.WaitForSignal(res)
}
