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

/*
import (
	"fmt"
	"os"
	"time"

	common2 "github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8types/go/types/l8web"
	"github.com/saichler/l8web/go/web/client"
	"github.com/saichler/probler/go/prob/topology/service"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

func GetTopo(cmd string, rc *client.RestClient, resources common2.IResources) {
	defer time.Sleep(time.Second)

	if cmd != "" {
		rc.PUT("0/"+service.ServiceName, "Empty", "", "", &l8web.L8Empty{})
		return
	}

	resp, err := rc.GET("0/"+service.ServiceName, "NetworkTopology", "", "", &l8web.L8Empty{})
	if err != nil {
		resources.Logger().Error("Get Error:", err.Error())
		return
	}
	jsn, err := protojson.Marshal(resp.(proto.Message))
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println(string(jsn))
	os.WriteFile("/tmp/topo.json", jsn, 0777)
}*/
