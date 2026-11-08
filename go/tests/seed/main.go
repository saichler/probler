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

// Command seed prints, as protojson, the L8PTargetList that k8s/seed-mocks.sh
// POSTs to /probler/91/Targets. It reuses the same target builders and IP ranges
// as `prctl <host> add devices base|gpus` (go/prob/common/commands/addDevices.go),
// which match the devices k8s/sim-start.sh creates in l8opensim. Targets are
// created Up so collection starts immediately.
//
// Usage: go run ./tests/seed [base] [gpus]
package main

import (
	"fmt"
	"os"
	"strconv"

	"github.com/saichler/l8pollaris/go/types/l8tpollaris"
	"github.com/saichler/probler/go/prob/common"
	"github.com/saichler/probler/go/prob/common/creates"
	"google.golang.org/protobuf/encoding/protojson"
)

func main() {
	kinds := os.Args[1:]
	if len(kinds) == 0 {
		kinds = []string{"base", "gpus"}
	}
	list := &l8tpollaris.L8PTargetList{}
	for _, kind := range kinds {
		switch kind {
		case "base":
			for i := 1; i <= 19; i++ {
				list.List = append(list.List, creates.CreateDevice("10.20.30."+strconv.Itoa(i), common.NetworkDevice_Links_ID, "sim"))
			}
		case "gpus":
			for i := 1; i <= 3; i++ {
				list.List = append(list.List, creates.CreateGPU("20.20.30."+strconv.Itoa(i), common.GPU_Links_ID, "sim"))
			}
		default:
			fmt.Fprintln(os.Stderr, "unknown target set:", kind)
			os.Exit(1)
		}
	}
	for _, t := range list.List {
		t.State = l8tpollaris.L8PTargetState_Up
	}
	out, err := protojson.MarshalOptions{UseEnumNumbers: true}.Marshal(list)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Println(string(out))
}
