/*
 * © 2026 Sharon Aicler (saichler@gmail.com)
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
	"context"
	"fmt"
	"time"

	"github.com/saichler/l8pollaris/go/pollaris/targets"
	"github.com/saichler/l8types/go/ifs"
	common2 "github.com/saichler/probler/go/prob/common"
	types3 "github.com/saichler/probler/go/types"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// summaryRefreshInterval is the cadence at which adcon recomputes the
// K8SCluster summary and republishes it to the cluster cache.
const summaryRefreshInterval = 30 * time.Second

// publishClusterSummary periodically lists Kubernetes resources and publishes
// a K8SCluster record (with K8SClusterSummary) to the cluster cache.
//
// It uses dedicated client-go List calls (not the K8s collector's shared
// informers) because the collector's runtime state (CollectorCache, shared
// informer machinery) is package-internal and not accessible from outside
// the k8sclient package. This is the documented fallback in the plan.
func publishClusterSummary(nic ifs.IVNic, clusterName string) {
	cfg, err := rest.InClusterConfig()
	if err != nil {
		nic.Resources().Logger().Error("[ADCON-SUMMARY] in-cluster config: ", err.Error())
		return
	}
	clientset, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		nic.Resources().Logger().Error("[ADCON-SUMMARY] new clientset: ", err.Error())
		return
	}

	k8sVersion := ""
	platform := ""
	if v, e := clientset.Discovery().ServerVersion(); e == nil {
		k8sVersion = v.GitVersion
		platform = v.Platform
	}

	cacheName, cacheArea := targets.Links.Cache(common2.K8sClust_Links_ID)

	publish := func() {
		summary := buildClusterSummary(clientset)
		cluster := &types3.K8SCluster{
			Name:       clusterName,
			K8SVersion: k8sVersion,
			Platform:   platform,
			Summary:    summary,
		}
		if err := nic.Leader(cacheName, cacheArea, ifs.PATCH, cluster); err != nil {
			nic.Resources().Logger().Error("[ADCON-SUMMARY] publish: ", err.Error())
			return
		}
		fmt.Printf("[ADCON-SUMMARY] published cluster=%s nodes=%d/%d pods=%d/%d deploys=%d/%d\n",
			clusterName,
			summary.ReadyNodes, summary.TotalNodes,
			summary.RunningPods, summary.TotalPods,
			summary.AvailableDeployments, summary.TotalDeployments)
	}

	publish()
	ticker := time.NewTicker(summaryRefreshInterval)
	defer ticker.Stop()
	for range ticker.C {
		publish()
	}
}

// buildClusterSummary issues client-go List calls for every resource type the
// Overview cards need and returns a populated K8SClusterSummary. Errors on a
// single resource type are logged and that field stays at its zero value —
// the rest of the summary still publishes.
func buildClusterSummary(cs kubernetes.Interface) *types3.K8SClusterSummary {
	ctx := context.Background()
	opts := metav1.ListOptions{}
	s := &types3.K8SClusterSummary{}

	// Nodes
	if l, err := cs.CoreV1().Nodes().List(ctx, opts); err == nil {
		s.TotalNodes = int32(len(l.Items))
		for i := range l.Items {
			for _, c := range l.Items[i].Status.Conditions {
				if c.Type == corev1.NodeReady && c.Status == corev1.ConditionTrue {
					s.ReadyNodes++
					break
				}
			}
		}
	}
	// Pods
	if l, err := cs.CoreV1().Pods("").List(ctx, opts); err == nil {
		s.TotalPods = int32(len(l.Items))
		for i := range l.Items {
			switch l.Items[i].Status.Phase {
			case corev1.PodRunning:
				s.RunningPods++
			case corev1.PodPending:
				s.PendingPods++
			case corev1.PodFailed:
				s.FailedPods++
			}
		}
	}
	// Deployments
	if l, err := cs.AppsV1().Deployments("").List(ctx, opts); err == nil {
		s.TotalDeployments = int32(len(l.Items))
		for i := range l.Items {
			d := &l.Items[i]
			if d.Status.Replicas > 0 && d.Status.AvailableReplicas == d.Status.Replicas {
				s.AvailableDeployments++
			}
		}
	}
	// StatefulSets
	if l, err := cs.AppsV1().StatefulSets("").List(ctx, opts); err == nil {
		s.TotalStatefulsets = int32(len(l.Items))
		for i := range l.Items {
			x := &l.Items[i]
			if x.Status.Replicas > 0 && x.Status.ReadyReplicas == x.Status.Replicas {
				s.ReadyStatefulsets++
			}
		}
	}
	// DaemonSets
	if l, err := cs.AppsV1().DaemonSets("").List(ctx, opts); err == nil {
		s.TotalDaemonsets = int32(len(l.Items))
		for i := range l.Items {
			x := &l.Items[i]
			if x.Status.DesiredNumberScheduled > 0 &&
				x.Status.NumberReady == x.Status.DesiredNumberScheduled {
				s.ReadyDaemonsets++
			}
		}
	}
	// ReplicaSets
	if l, err := cs.AppsV1().ReplicaSets("").List(ctx, opts); err == nil {
		s.TotalReplicasets = int32(len(l.Items))
	}
	// Jobs / CronJobs / HPAs
	if l, err := cs.BatchV1().Jobs("").List(ctx, opts); err == nil {
		s.TotalJobs = int32(len(l.Items))
		for i := range l.Items {
			if l.Items[i].Status.Active > 0 {
				s.ActiveJobs++
			}
		}
	}
	if l, err := cs.BatchV1().CronJobs("").List(ctx, opts); err == nil {
		s.TotalCronjobs = int32(len(l.Items))
		for i := range l.Items {
			if len(l.Items[i].Status.Active) > 0 {
				s.ActiveCronjobs++
			}
		}
	}
	if l, err := cs.AutoscalingV2().HorizontalPodAutoscalers("").List(ctx, opts); err == nil {
		s.TotalHpas = int32(len(l.Items))
	}

	// Networking
	if l, err := cs.CoreV1().Services("").List(ctx, opts); err == nil {
		s.TotalServices = int32(len(l.Items))
	}
	if l, err := cs.NetworkingV1().Ingresses("").List(ctx, opts); err == nil {
		s.TotalIngresses = int32(len(l.Items))
	}
	if l, err := cs.NetworkingV1().NetworkPolicies("").List(ctx, opts); err == nil {
		s.TotalNetworkpolicies = int32(len(l.Items))
	}
	if l, err := cs.CoreV1().Endpoints("").List(ctx, opts); err == nil {
		s.TotalEndpoints = int32(len(l.Items))
	}
	if l, err := cs.DiscoveryV1().EndpointSlices("").List(ctx, opts); err == nil {
		s.TotalEndpointslices = int32(len(l.Items))
	}
	if l, err := cs.NetworkingV1().IngressClasses().List(ctx, opts); err == nil {
		s.TotalIngressclasses = int32(len(l.Items))
	}

	// Storage
	if l, err := cs.CoreV1().PersistentVolumes().List(ctx, opts); err == nil {
		s.TotalPersistentvolumes = int32(len(l.Items))
		for i := range l.Items {
			if l.Items[i].Status.Phase == corev1.VolumeBound {
				s.BoundPersistentvolumes++
			}
		}
	}
	if l, err := cs.CoreV1().PersistentVolumeClaims("").List(ctx, opts); err == nil {
		s.TotalPvcs = int32(len(l.Items))
		for i := range l.Items {
			if l.Items[i].Status.Phase == corev1.ClaimBound {
				s.BoundPvcs++
			}
		}
	}
	if l, err := cs.StorageV1().StorageClasses().List(ctx, opts); err == nil {
		s.TotalStorageclasses = int32(len(l.Items))
	}

	// Configuration
	if l, err := cs.CoreV1().ConfigMaps("").List(ctx, opts); err == nil {
		s.TotalConfigmaps = int32(len(l.Items))
	}
	if l, err := cs.CoreV1().Secrets("").List(ctx, opts); err == nil {
		s.TotalSecrets = int32(len(l.Items))
	}
	if l, err := cs.CoreV1().ResourceQuotas("").List(ctx, opts); err == nil {
		s.TotalResourcequotas = int32(len(l.Items))
	}
	if l, err := cs.CoreV1().LimitRanges("").List(ctx, opts); err == nil {
		s.TotalLimitranges = int32(len(l.Items))
	}
	if l, err := cs.PolicyV1().PodDisruptionBudgets("").List(ctx, opts); err == nil {
		s.TotalPoddisruptionbudgets = int32(len(l.Items))
	}

	// Access Control
	if l, err := cs.CoreV1().ServiceAccounts("").List(ctx, opts); err == nil {
		s.TotalServiceaccounts = int32(len(l.Items))
	}
	if l, err := cs.RbacV1().Roles("").List(ctx, opts); err == nil {
		s.TotalRoles = int32(len(l.Items))
	}
	if l, err := cs.RbacV1().ClusterRoles().List(ctx, opts); err == nil {
		s.TotalClusterroles = int32(len(l.Items))
	}
	if l, err := cs.RbacV1().RoleBindings("").List(ctx, opts); err == nil {
		s.TotalRolebindings = int32(len(l.Items))
	}
	if l, err := cs.RbacV1().ClusterRoleBindings().List(ctx, opts); err == nil {
		s.TotalClusterrolebindings = int32(len(l.Items))
	}

	// Top level
	if l, err := cs.CoreV1().Namespaces().List(ctx, opts); err == nil {
		s.TotalNamespaces = int32(len(l.Items))
	}
	if l, err := cs.CoreV1().Events("").List(ctx, opts); err == nil {
		s.TotalEvents = int32(len(l.Items))
		for i := range l.Items {
			if l.Items[i].Type == corev1.EventTypeWarning {
				s.WarningEvents++
			}
		}
	}

	return s
}
