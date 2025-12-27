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
	"time"

	"github.com/saichler/l8srlz/go/serialize/object"
	common2 "github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8web/go/web/client"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

func GetHealth(rc *client.RestClient, resources common2.IResources) {
	defer time.Sleep(time.Second)
	elems, e := object.NewQuery("select * from L8Health ", resources)
	q := elems.(*object.Elements)
	pq := q.PQuery()

	if e != nil {
		fmt.Println("Error: ", e.Error())
		return
	}
	jsn, err := protojson.Marshal(pq)
	fmt.Println(string(jsn))

	resp, err := rc.GET("0/Health", "L8HealthList", "", "", pq)
	if err != nil {
		resources.Logger().Error("Get Error:", err.Error())
		return
	}
	jsn, err = protojson.Marshal(resp.(proto.Message))
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println(string(jsn))
}
