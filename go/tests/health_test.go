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

	"github.com/saichler/l8types/go/types/l8health"
	"google.golang.org/protobuf/encoding/protojson"
)

func TestHealth(t *testing.T) {
	top := LoadHealth()
	fmt.Println(top)
}

func LoadHealth() *l8health.L8Top {
	data, err := os.ReadFile("./health.json")
	if err != nil {
		panic(err)
	}
	top := &l8health.L8Top{}
	err = protojson.Unmarshal(data, top)
	if err != nil {
		panic(err)
	}
	return top
}
