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
	"strconv"
	"strings"

	"github.com/saichler/l8types/go/ifs"
	types2 "github.com/saichler/probler/go/types"
)

type Ready struct{}

func (this *Ready) Mode() ifs.SerializerMode {
	return ifs.STRING
}
func (this *Ready) Marshal(any interface{}, r ifs.IResources) ([]byte, error) {
	return nil, nil
}
func (this *Ready) Unmarshal(data []byte, r ifs.IResources) (interface{}, error) {
	str := string(data)
	index := strings.Index(str, "/")
	if index != -1 {
		c, _ := strconv.Atoi(str[:index])
		o, _ := strconv.Atoi(str[index+1:])
		return &types2.K8SReadyState{Count: int32(c), Outof: int32(o)}, nil
	}
	return nil, nil
}
