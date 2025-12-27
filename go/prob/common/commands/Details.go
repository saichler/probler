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

func Details(rc *client.RestClient, resources ifs.IResources) {
	resources.Registry().Register(&l8tpollaris.CJob{})

	job := boot.NodeDetailsJob("lab", "lab", "node4")
	doCJob("Node Detail", rc, job)

	job = boot.PodDetailsJob("lab", "lab", "probler-k8s", "probler-k8s-0")
	doCJob("Pods Detail", rc, job)

	job = boot.DeploymentDetailsJob("lab", "lab", "probler-parser", "probler-parser")
	doCJob("Deployment Detail", rc, job)

	job = boot.StatefulsetDetailsJob("lab", "lab", "probler-k8s", "probler-k8s")
	doCJob("Statefulset Detail", rc, job)

	job = boot.DaemonsetDetailsJob("lab", "lab", "probler-vnet", "probler-vnet")
	doCJob("Daemonset Detail", rc, job)

	job = boot.ServiceDetailsJob("lab", "lab", "kube-system", "kube-dns")
	doCJob("Service Detail", rc, job)

	job = boot.NamespaceDetailsJob("lab", "lab", "kube-system")
	doCJob("Namespace Detail", rc, job)

	job = boot.NetworkPolicyDetailsJob("lab", "lab", "default", "access-nginx")
	doCJob("Network Policy Detail", rc, job)
}

func doCJob(name string, rc *client.RestClient, job *l8tpollaris.CJob) {
	jsn, err := protojson.Marshal(job)
	fmt.Println("body for ", name, ":", string(jsn))
	resp, err := rc.POST("0/exec", "CJob", "", "", job)
	if err != nil {
		fmt.Println("POST Error:", err.Error())
		return
	}
	jsn, err = protojson.Marshal(resp)
	if err != nil {
		fmt.Println("Error:", err.Error())
	}
}
