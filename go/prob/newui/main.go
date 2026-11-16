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
	common2 "github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/probler/go/prob/common/models"
)

func main() {
	svr := common2.CreateWebServer("web", RegisterTypes)
	svr.Start()
}

func RegisterTypes(res ifs.IResources) {
	// SYS > Logs reads the log server (/87/logs) on the logs vnet. l8common only
	// opens the web server's logs vnic when LogConfig.LogDirectory is set, and
	// probler's security config leaves it empty -- so default it here (the same
	// path the log agent tails, k8s LOGPATH). RegisterTypes runs on the first
	// vnic's resources, before that check.
	if lc := res.SysConfig().LogConfig; lc != nil && lc.LogDirectory == "" {
		lc.LogDirectory = "/data/logs/probler"
	}

	models.Register(res)
}
