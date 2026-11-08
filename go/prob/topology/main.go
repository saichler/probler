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
	"time"

	"github.com/saichler/l8bus/go/overlay/vnic"
	"github.com/saichler/l8topology/go/topo/discover"
	"github.com/saichler/l8topology/go/topo/topo_list"
	"github.com/saichler/l8topology/go/topo/topo_service"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/probler/go/prob/common"
)

// rediscoverInterval: l8topology discovers Layer 1 exactly once, a few
// seconds after activation. When the network inventory (NCache) is not up yet
// -- the normal case on a fresh cluster -- that single attempt times out and
// the topology stays empty for the life of the pod. Re-running discovery
// periodically heals the startup race and follows inventory changes.
const rediscoverInterval = 60 * time.Second

func main() {
	resources := common.CreateResources("topo")
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Start()
	nic.WaitForConnection()

	topo_list.Activate(nic)
	discover.ActivateLayer1(nic)
	go rediscoverLayer1(nic)

	common.WaitForSignal(resources)
}

func rediscoverLayer1(nic ifs.IVNic) {
	h, ok := nic.Resources().Services().ServiceHandler(discover.Layer1ServiceName, discover.Layer1ServiceArea)
	if !ok {
		panic("topology: Layer 1 service is not active")
	}
	ts, ok := h.(*topo_service.TopoService)
	if !ok {
		panic("topology: Layer 1 handler is not a TopoService")
	}
	for {
		time.Sleep(rediscoverInterval)
		ts.DiscoverNodes(nic)
	}
}
