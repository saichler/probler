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

// probler-chat: a chat instance (l8ai, area 81) -- the single writer of the
// conversations the router assigns to it. SIGTERM flushes to chat-orm and
// releases its conversations to the router.
package main

import (
	"github.com/saichler/l8ai/go/ai/chat"
	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/probler/go/prob/common"
)

func main() {
	res := common.CreateResources("chat")
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()

	instance := chat.ActivateChat(nil, nic)

	res.Logger().Info("chat instance activated")
	common.WaitForSignal(res)
	instance.Shutdown()
}
