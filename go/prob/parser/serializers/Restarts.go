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

package serializers

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/saichler/l8types/go/ifs"
	types "github.com/saichler/probler/go/types"
)

// Restarts is a STRING-mode serializer for K8SRestartsState. It bridges the
// textual "count (ago)" form emitted by the kubectl/K8s collector (e.g.
// "5 (2h ago)") and the structured proto representation used by the rest of
// the system.
type Restarts struct{}

func (this *Restarts) Mode() ifs.SerializerMode {
	return ifs.STRING
}

// Marshal renders a *K8SRestartsState back to its "count (ago)" string form.
func (this *Restarts) Marshal(any interface{}, r ifs.IResources) ([]byte, error) {
	if any == nil {
		return []byte(""), nil
	}
	rs, ok := any.(*types.K8SRestartsState)
	if !ok || rs == nil {
		return []byte(""), nil
	}
	if rs.Ago != "" {
		return []byte(fmt.Sprintf("%d %s", rs.Count, rs.Ago)), nil
	}
	return []byte(fmt.Sprintf("%d", rs.Count)), nil
}

// Unmarshal parses "count (ago)" into a *K8SRestartsState. The count is
// everything before the first "("; the ago is the rest (including parens).
func (this *Restarts) Unmarshal(data []byte, r ifs.IResources) (interface{}, error) {
	str := string(data)
	idx := strings.Index(str, "(")
	if idx != -1 {
		c, _ := strconv.Atoi(strings.TrimSpace(str[:idx]))
		a := strings.TrimSpace(str[idx:])
		return &types.K8SRestartsState{Count: int32(c), Ago: a}, nil
	}
	c, _ := strconv.Atoi(strings.TrimSpace(str))
	return &types.K8SRestartsState{Count: int32(c), Ago: ""}, nil
}
