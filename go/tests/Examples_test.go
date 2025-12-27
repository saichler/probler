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

package tests

import (
	"fmt"
	"os"
	"testing"

	"github.com/saichler/l8types/go/types/l8api"
	"google.golang.org/protobuf/encoding/protojson"
)

func TestExamples(t *testing.T) {
	os.Remove("./samples")
	os.Mkdir("./samples", 0777)
	user := &l8api.AuthUser{User: "<user>", Pass: "<password>"}
	jsn, _ := protojson.Marshal(user)
	fmt.Println(string(jsn))

	token := &l8api.AuthToken{Token: "<token>"}
	jsn, _ = protojson.Marshal(token)
	fmt.Println(string(jsn))
}
