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

package commands

import (
	"strconv"
	"time"

	boot "github.com/saichler/l8parser/go/parser/boot"
	"github.com/saichler/l8pollaris/go/pollaris"
	"github.com/saichler/l8pollaris/go/types/l8tpollaris"
	common2 "github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8web/go/web/client"
)

func AddPollConfigs(rc *client.RestClient, resources common2.IResources) {
	snmpPollarises := boot.GetAllPolarisModels()
	for _, snmpPollaris := range snmpPollarises {
		resp, err := rc.POST(strconv.Itoa(int(pollaris.ServiceArea))+"/"+pollaris.ServiceName,
			"Pollaris", "", "", snmpPollaris)

		if err != nil {
			resources.Logger().Error(err.Error())
			return
		}
		_, ok := resp.(*l8tpollaris.L8Pollaris)
		if ok {
			resources.Logger().Info("Added ", snmpPollaris.Name, " Successfully")
		}
		time.Sleep(time.Second)
	}

	k8sPollaris := boot.CreateK8sBootPolls()
	resp, err := rc.POST(strconv.Itoa(int(pollaris.ServiceArea))+"/"+pollaris.ServiceName,
		"Pollaris", "", "", k8sPollaris)

	if err != nil {
		resources.Logger().Error(err.Error())
		return
	}
	_, ok := resp.(*l8tpollaris.L8Pollaris)
	if ok {
		resources.Logger().Info("Added ", k8sPollaris.Name, " Successfully")
	}
	time.Sleep(time.Second)

}
