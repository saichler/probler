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

// Ready is a STRING-mode serializer for K8SReadyState. It bridges the textual
// "count/outof" form emitted by the kubectl/K8s collector (e.g. "1/2") and the
// structured proto representation used by the rest of the system.
type Ready struct{}

func (this *Ready) Mode() ifs.SerializerMode {
	return ifs.STRING
}

// Marshal renders a *K8SReadyState back to its "count/outof" string form.
func (this *Ready) Marshal(any interface{}, r ifs.IResources) ([]byte, error) {
	if any == nil {
		return []byte(""), nil
	}
	rs, ok := any.(*types.K8SReadyState)
	if !ok || rs == nil {
		return []byte(""), nil
	}
	return []byte(fmt.Sprintf("%d/%d", rs.Count, rs.Outof)), nil
}

// Unmarshal parses "count/outof" into a *K8SReadyState. Empty / malformed
// inputs return (nil, nil) so the caller treats them as "no value".
func (this *Ready) Unmarshal(data []byte, r ifs.IResources) (interface{}, error) {
	str := string(data)
	idx := strings.Index(str, "/")
	if idx == -1 {
		return nil, nil
	}
	count, _ := strconv.Atoi(str[:idx])
	outof, _ := strconv.Atoi(str[idx+1:])
	return &types.K8SReadyState{Count: int32(count), Outof: int32(outof)}, nil
}
