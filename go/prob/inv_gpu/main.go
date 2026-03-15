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
	"github.com/saichler/l8inventory/go/inv/service"
	"github.com/saichler/l8types/go/ifs"
	common2 "github.com/saichler/probler/go/prob/common"
	types2 "github.com/saichler/probler/go/types"
)

func main() {
	res := common2.CreateResources("gpu")
	res.Logger().Info("Starting gpu")
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(res, nil)
	nic.Start()
	nic.WaitForConnection()
	res.Logger().Info("Registering gpu service")

	//Add the inventory model and mark the Id field as key
	nic.Resources().Introspector().Decorators().AddPrimaryKeyDecorator(&types2.GpuDevice{}, "Id")

	//Activate the box inventory service with the primary key & sample model instance
	inventory.Activate(common2.GPU_Links_ID, &types2.GpuDevice{}, &types2.GpuDeviceList{}, nic, "Id")

	common2.WaitForSignal(nic.Resources())
}
