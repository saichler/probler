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
	"fmt"

	"github.com/saichler/l8parser/go/parser/boot"
	"github.com/saichler/l8pollaris/go/types/l8tpollaris"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8web/go/web/client"
	"google.golang.org/protobuf/encoding/protojson"
)

func Logs(rc *client.RestClient, namespace, podname string, resources ifs.IResources) {
	resources.Registry().Register(&l8tpollaris.CJob{})
	job := boot.LogsJob("lab", "lab", "probler-collector", "probler-collector-0")
	jsn, err := protojson.Marshal(job)
	fmt.Println("body:", string(jsn))
	resp, err := rc.POST("0/exec", "CJob", "", "", job)
	if err != nil {
		resources.Logger().Error("POST Error:", err.Error())
		return
	}

	job = resp.(*l8tpollaris.CJob)
	fmt.Println(string(job.Result))
}
