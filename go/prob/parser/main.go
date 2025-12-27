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
	"github.com/saichler/l8parser/go/parser/service"
	"github.com/saichler/l8pollaris/go/pollaris"
	"github.com/saichler/l8types/go/ifs"
	common2 "github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/serializers"
	types3 "github.com/saichler/probler/go/types"
)

func main() {
	resources := common2.CreateResources("parser")
	resources.Logger().SetLogLevel(ifs.Info_Level)
	ifs.SetNetworkMode(ifs.NETWORK_K8s)
	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Start()
	nic.WaitForConnection()

	nic.Resources().Registry().Register(&types3.K8SReadyState{})
	nic.Resources().Registry().Register(&types3.K8SRestartsState{})

	info, err := nic.Resources().Registry().Info("K8SReadyState")
	if err != nil {
		nic.Resources().Logger().Error(err)
	} else {
		info.AddSerializer(&serializers.Ready{})
	}

	info, err = nic.Resources().Registry().Info("K8SRestartsState")
	if err != nil {
		nic.Resources().Logger().Error(err)
	} else {
		info.AddSerializer(&serializers.Restarts{})
	}

	nic.Resources().Registry().RegisterEnums(types3.K8SPodStatus_value)

	//Activate Polaris
	pollaris.Activate(nic)

	//Activate Inventory parser
	service.Activate(common2.NetworkDevice_Links_ID, &types3.NetworkDevice{}, false, nic, "Id")

	//Activate Kubernetes parser
	service.Activate(common2.K8s_Links_ID, &types3.K8SCluster{}, false, nic, "Name")

	resources.Logger().SetLogLevel(ifs.Error_Level)
	common2.WaitForSignal(resources)
}
