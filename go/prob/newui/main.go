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

package main

import (
	"github.com/saichler/l8alarms/go/alm/ui"
	common2 "github.com/saichler/l8common/go/common"
	"github.com/saichler/l8events/go/types/l8events"
	"github.com/saichler/l8logfusion/go/types/l8logf"
	"github.com/saichler/l8pollaris/go/types/l8tpollaris"
	"github.com/saichler/l8topology/go/types/l8topo"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8types/go/types/l8api"
	"github.com/saichler/l8types/go/types/l8health"
	"github.com/saichler/l8types/go/types/l8web"
	"github.com/saichler/probler/go/types"
	types2 "github.com/saichler/probler/go/types"
)

func main() {
	svr := common2.CreateWebServer("web", RegisterTypes)
	svr.Start()
}

func RegisterTypes(res ifs.IResources) {
	ui.RegisterAlmTypes(res)

	res.Introspector().Decorators().AddPrimaryKeyDecorator(&types.NetworkDevice{}, "Id")
	res.Introspector().Decorators().AddPrimaryKeyDecorator(&types2.K8SCluster{}, "Name")
	res.Introspector().Decorators().AddPrimaryKeyDecorator(&types2.GpuDevice{}, "Id")

	res.Registry().Register(&l8tpollaris.L8Pollaris{})
	res.Registry().Register(&l8tpollaris.L8PTarget{})
	res.Registry().Register(&l8tpollaris.L8PTargetList{})
	res.Registry().Register(&types.NetworkDevice{})
	res.Registry().Register(&types.NetworkDeviceList{})
	res.Registry().Register(&types2.K8SCluster{})
	res.Registry().Register(&types2.K8SClusterList{})
	res.Registry().Register(&l8api.L8Query{})
	res.Registry().Register(&l8health.L8Top{})
	res.Registry().Register(&l8web.L8Empty{})
	res.Registry().Register(&l8tpollaris.CJob{})
	res.Registry().Register(&l8health.L8Health{})
	res.Registry().Register(&l8health.L8HealthList{})
	res.Registry().Register(&l8logf.L8File{})
	res.Registry().Register(&l8tpollaris.TargetAction{})

	res.Registry().Register(&l8topo.L8Topology{})
	res.Registry().Register(&l8topo.L8TopologyQuery{})

	res.Registry().Register(&types2.GpuDevice{})
	res.Registry().Register(&types2.GpuDeviceList{})

	res.Introspector().Decorators().AddPrimaryKeyDecorator(&l8topo.L8TopologyMetadata{}, "ServiceName", "ServiceArea")
	res.Introspector().Decorators().AddPrimaryKeyDecorator(&l8tpollaris.L8PTarget{}, "TargetId")

	res.Registry().Register(&l8topo.L8TopologyMetadataList{})
	res.Registry().Register(&l8topo.L8TopologyMetadata{})

	res.Introspector().Decorators().AddPrimaryKeyDecorator(&l8events.EventRecord{}, "EventId")
	res.Registry().Register(&l8events.EventRecordList{})

	res.Introspector().Decorators().AddPrimaryKeyDecorator(&l8logf.L8File{}, "Path", "Name")
}
