package service

import (
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/saichler/probler/go/types"
)

func generateTopology(list *types.NetworkDeviceList) *types.NetworkTopology {
	if list == nil || len(list.List) == 0 {
		return nil
	}

	// Load world cities data for coordinate lookup
	worldCities, err := LoadWorldCities("./")
	if err != nil {
		fmt.Printf("Warning: Could not load world cities data: %v\n", err)
	}

	// Update device coordinates based on location
	updateDeviceCoordinates(list, worldCities)

	// Generate network topology
	topology := &types.NetworkTopology{
		TopologyId:   fmt.Sprintf("topology-%d", time.Now().Unix()),
		Name:         "Generated Network Topology",
		TopologyType: types.TopologyType_TOPOLOGY_TYPE_PHYSICAL,
		Nodes:        generateNetworkNodes(list),
		Edges:        generateNetworkEdges(list),
		Statistics:   generateTopologyStatistics(list),
		HealthStatus: generateTopologyHealthStatus(list),
		LastUpdated:  time.Now().Format(time.RFC3339),
	}

	// Set geographic bounds based on device coordinates
	topology.GeographicBounds = calculateGeographicBounds(list)

	// Generate network links for each device ensuring at least one link per device
	generateNetworkLinksForDevices(list)

	return topology
}

// updateDeviceCoordinates updates latitude and longitude for each device based on location
func updateDeviceCoordinates(list *types.NetworkDeviceList, worldCities *WorldCitiesData) {
	for _, device := range list.List {
		if device.Equipmentinfo == nil {
			continue
		}

		location := device.Equipmentinfo.Location
		if location == "" {
			continue
		}

		// Extract city name from location (handle various formats)
		cityName := extractCityFromLocation(location)
		if cityName == "" {
			continue
		}

		// Look up coordinates using enhanced TopologyUtils methods
		if worldCities != nil {
			// Use SmartCityLookup which handles country context
			if lat, lng, found := worldCities.SmartCityLookup(location); found {
				device.Equipmentinfo.Latitude = lat
				device.Equipmentinfo.Longitude = lng
				fmt.Printf("Updated %s coordinates: %f, %f (from location: %s)\n", device.Id, lat, lng, location)
			} else {
				fmt.Printf("Warning: Could not find coordinates for location: %s\n", location)
			}
		}
	}
}

// extractCityFromLocation extracts city name from various location formats
func extractCityFromLocation(location string) string {
	// Handle common location formats:
	// "New York, USA"
	// "London, UK"
	// "Data Center A - New York"
	// "NYC-DC-01"

	location = strings.TrimSpace(location)

	// Try comma-separated format first
	if strings.Contains(location, ",") {
		parts := strings.Split(location, ",")
		if len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}

	// Try dash-separated format
	if strings.Contains(location, "-") {
		parts := strings.Split(location, "-")
		for _, part := range parts {
			part = strings.TrimSpace(part)
			// Skip common prefixes/suffixes
			if !strings.Contains(strings.ToLower(part), "dc") &&
				!strings.Contains(strings.ToLower(part), "data") &&
				!strings.Contains(strings.ToLower(part), "center") &&
				!strings.Contains(strings.ToLower(part), "rack") &&
				len(part) > 2 {
				return part
			}
		}
	}

	return location
}

// generateNetworkNodes creates NetworkNode objects from NetworkDevices
func generateNetworkNodes(list *types.NetworkDeviceList) []*types.NetworkNode {
	var nodes []*types.NetworkNode

	for _, device := range list.List {
		if device.Equipmentinfo == nil {
			continue
		}

		node := &types.NetworkNode{
			NodeId:    device.Id,
			Name:      device.Equipmentinfo.SysName,
			NodeType:  convertDeviceTypeToNodeType(device.Equipmentinfo.DeviceType),
			Status:    convertDeviceStatusToNodeStatus(device.Equipmentinfo.DeviceStatus),
			Location:  device.Equipmentinfo.Location,
			Latitude:  device.Equipmentinfo.Latitude,
			Longitude: device.Equipmentinfo.Longitude,
			Coordinates: &types.GeographicCoordinates{
				Latitude:  device.Equipmentinfo.Latitude,
				Longitude: device.Equipmentinfo.Longitude,
			},
			Capabilities: &types.NodeCapabilities{
				RoutingCapable:       device.Equipmentinfo.DeviceType == types.DeviceType_DEVICE_TYPE_ROUTER,
				SwitchingCapable:     device.Equipmentinfo.DeviceType == types.DeviceType_DEVICE_TYPE_SWITCH,
				FirewallCapable:      device.Equipmentinfo.DeviceType == types.DeviceType_DEVICE_TYPE_FIREWALL,
				LoadBalancingCapable: device.Equipmentinfo.DeviceType == types.DeviceType_DEVICE_TYPE_LOAD_BALANCER,
			},
		}

		nodes = append(nodes, node)
	}

	return nodes
}

// generateNetworkEdges creates connections between devices ensuring each device has at least one link
func generateNetworkEdges(list *types.NetworkDeviceList) []*types.NetworkEdge {
	var edges []*types.NetworkEdge
	devices := list.List

	if len(devices) < 2 {
		return edges
	}

	rand.Seed(time.Now().UnixNano())
	connected := make(map[string]bool)

	// First pass: ensure every device has at least one connection
	for i, device := range devices {
		if !connected[device.Id] {
			// Find another device to connect to
			for j, targetDevice := range devices {
				if i != j && device.Id != targetDevice.Id {
					edge := &types.NetworkEdge{
						EdgeId:     fmt.Sprintf("edge-%s-%s", device.Id, targetDevice.Id),
						SourceNode: device.Id,
						TargetNode: targetDevice.Id,
						EdgeType:   types.EdgeType_EDGE_TYPE_PHYSICAL,
						Status:     types.EdgeStatus_EDGE_STATUS_UP,
						Properties: &types.EdgeProperties{
							Weight: rand.Float64()*100 + 1,
							Cost:   uint32(rand.Intn(100) + 1),
							Label:  fmt.Sprintf("Link %s to %s", device.Id, targetDevice.Id),
						},
					}
					edges = append(edges, edge)
					connected[device.Id] = true
					connected[targetDevice.Id] = true
					break
				}
			}
		}
	}

	// Second pass: add additional random connections (20-40% more connectivity)
	additionalConnections := len(devices) / 3
	for i := 0; i < additionalConnections; i++ {
		src := devices[rand.Intn(len(devices))]
		dst := devices[rand.Intn(len(devices))]

		if src.Id != dst.Id {
			// Check if edge already exists
			exists := false
			for _, edge := range edges {
				if (edge.SourceNode == src.Id && edge.TargetNode == dst.Id) ||
					(edge.SourceNode == dst.Id && edge.TargetNode == src.Id) {
					exists = true
					break
				}
			}

			if !exists {
				edge := &types.NetworkEdge{
					EdgeId:     fmt.Sprintf("edge-%s-%s", src.Id, dst.Id),
					SourceNode: src.Id,
					TargetNode: dst.Id,
					EdgeType:   types.EdgeType_EDGE_TYPE_PHYSICAL,
					Status:     types.EdgeStatus_EDGE_STATUS_UP,
					Properties: &types.EdgeProperties{
						Weight: rand.Float64()*100 + 1,
						Cost:   uint32(rand.Intn(100) + 1),
						Label:  fmt.Sprintf("Link %s to %s", src.Id, dst.Id),
					},
				}
				edges = append(edges, edge)
			}
		}
	}

	return edges
}

// generateNetworkLinksForDevices creates NetworkLink objects for each device
func generateNetworkLinksForDevices(list *types.NetworkDeviceList) {
	rand.Seed(time.Now().UnixNano())

	for _, device := range list.List {
		if device.NetworkLinks == nil {
			device.NetworkLinks = []*types.NetworkLink{}
		}

		// Generate 1-3 network links per device
		linkCount := rand.Intn(3) + 1
		for i := 0; i < linkCount; i++ {
			// Find a random target device
			var targetDevice *types.NetworkDevice
			for _, target := range list.List {
				if target.Id != device.Id {
					targetDevice = target
					break
				}
			}

			if targetDevice == nil {
				continue
			}

			link := &types.NetworkLink{
				LinkId:              fmt.Sprintf("link-%s-%s-%d", device.Id, targetDevice.Id, i),
				Name:                fmt.Sprintf("Link to %s", targetDevice.Equipmentinfo.SysName),
				FromNode:            device.Id,
				ToNode:              targetDevice.Id,
				LinkStatus:          types.LinkStatus_LINK_STATUS_ACTIVE,
				Bandwidth:           generateRandomBandwidth(),
				LinkType:            types.LinkType_LINK_TYPE_ETHERNET,
				UtilizationPercent:  rand.Float64() * 80,
				LatencyMs:           rand.Float64()*50 + 1,
				DistanceKm:          calculateDistance(device, targetDevice),
				Uptime:              fmt.Sprintf("%dd %dh", rand.Intn(365), rand.Intn(24)),
				ErrorRate:           rand.Float64() * 0.1,
				AvailabilityPercent: 95.0 + rand.Float64()*5.0,
			}

			device.NetworkLinks = append(device.NetworkLinks, link)
		}
	}
}

// Helper functions
func convertDeviceTypeToNodeType(deviceType types.DeviceType) types.NetworkNodeType {
	switch deviceType {
	case types.DeviceType_DEVICE_TYPE_ROUTER:
		return types.NetworkNodeType_NETWORK_NODE_TYPE_ROUTER
	case types.DeviceType_DEVICE_TYPE_SWITCH:
		return types.NetworkNodeType_NETWORK_NODE_TYPE_SWITCH
	case types.DeviceType_DEVICE_TYPE_FIREWALL:
		return types.NetworkNodeType_NETWORK_NODE_TYPE_FIREWALL
	case types.DeviceType_DEVICE_TYPE_SERVER:
		return types.NetworkNodeType_NETWORK_NODE_TYPE_SERVER
	case types.DeviceType_DEVICE_TYPE_LOAD_BALANCER:
		return types.NetworkNodeType_NETWORK_NODE_TYPE_LOAD_BALANCER
	case types.DeviceType_DEVICE_TYPE_GATEWAY:
		return types.NetworkNodeType_NETWORK_NODE_TYPE_GATEWAY
	default:
		return types.NetworkNodeType_NETWORK_NODE_TYPE_UNKNOWN
	}
}

func convertDeviceStatusToNodeStatus(deviceStatus types.DeviceStatus) types.NetworkNodeStatus {
	switch deviceStatus {
	case types.DeviceStatus_DEVICE_STATUS_ONLINE:
		return types.NetworkNodeStatus_NODE_STATUS_ONLINE
	case types.DeviceStatus_DEVICE_STATUS_OFFLINE:
		return types.NetworkNodeStatus_NODE_STATUS_OFFLINE
	case types.DeviceStatus_DEVICE_STATUS_WARNING:
		return types.NetworkNodeStatus_NODE_STATUS_WARNING
	case types.DeviceStatus_DEVICE_STATUS_CRITICAL:
		return types.NetworkNodeStatus_NODE_STATUS_CRITICAL
	case types.DeviceStatus_DEVICE_STATUS_MAINTENANCE:
		return types.NetworkNodeStatus_NODE_STATUS_MAINTENANCE
	default:
		return types.NetworkNodeStatus_NODE_STATUS_UNKNOWN
	}
}

func generateRandomBandwidth() string {
	bandwidths := []string{"1Gbps", "10Gbps", "25Gbps", "40Gbps", "100Gbps"}
	return bandwidths[rand.Intn(len(bandwidths))]
}

func calculateDistance(device1, device2 *types.NetworkDevice) float64 {
	if device1.Equipmentinfo == nil || device2.Equipmentinfo == nil {
		return 0
	}

	// Simple Haversine distance calculation (approximation)
	lat1 := device1.Equipmentinfo.Latitude
	lng1 := device1.Equipmentinfo.Longitude
	lat2 := device2.Equipmentinfo.Latitude
	lng2 := device2.Equipmentinfo.Longitude

	if lat1 == 0 && lng1 == 0 || lat2 == 0 && lng2 == 0 {
		return float64(rand.Intn(1000) + 100) // Random distance if coordinates not available
	}

	// Simplified distance calculation
	deltaLat := lat2 - lat1
	deltaLng := lng2 - lng1
	distance := (deltaLat*deltaLat + deltaLng*deltaLng) * 111.32 // Rough km conversion

	if distance < 1 {
		return float64(rand.Intn(50) + 1) // Minimum 1km distance
	}

	return distance
}

func generateTopologyStatistics(list *types.NetworkDeviceList) *types.TopologyStatistics {
	totalNodes := uint32(len(list.List))
	activeNodes := uint32(0)

	for _, device := range list.List {
		if device.Equipmentinfo != nil && device.Equipmentinfo.DeviceStatus == types.DeviceStatus_DEVICE_STATUS_ONLINE {
			activeNodes++
		}
	}

	return &types.TopologyStatistics{
		TotalNodes:     totalNodes,
		ActiveNodes:    activeNodes,
		TotalEdges:     totalNodes - 1 + totalNodes/3, // Minimum spanning tree + additional edges
		ActiveEdges:    totalNodes - 1 + totalNodes/3,
		NetworkDensity: float64(totalNodes-1+totalNodes/3) / float64(totalNodes*(totalNodes-1)/2),
	}
}

func generateTopologyHealthStatus(list *types.NetworkDeviceList) *types.TopologyHealth {
	healthyCount := 0
	totalCount := len(list.List)

	for _, device := range list.List {
		if device.Equipmentinfo != nil && device.Equipmentinfo.DeviceStatus == types.DeviceStatus_DEVICE_STATUS_ONLINE {
			healthyCount++
		}
	}

	healthScore := float64(healthyCount) / float64(totalCount) * 100

	var status types.HealthStatus
	if healthScore >= 90 {
		status = types.HealthStatus_HEALTH_STATUS_HEALTHY
	} else if healthScore >= 70 {
		status = types.HealthStatus_HEALTH_STATUS_WARNING
	} else {
		status = types.HealthStatus_HEALTH_STATUS_CRITICAL
	}

	return &types.TopologyHealth{
		Status:         status,
		HealthScore:    healthScore,
		AssessmentTime: time.Now().Format(time.RFC3339),
	}
}

func calculateGeographicBounds(list *types.NetworkDeviceList) *types.GeographicBounds {
	var minLat, maxLat, minLng, maxLng float64
	firstDevice := true

	for _, device := range list.List {
		if device.Equipmentinfo == nil {
			continue
		}

		lat := device.Equipmentinfo.Latitude
		lng := device.Equipmentinfo.Longitude

		if lat == 0 && lng == 0 {
			continue
		}

		if firstDevice {
			minLat, maxLat = lat, lat
			minLng, maxLng = lng, lng
			firstDevice = false
		} else {
			if lat < minLat {
				minLat = lat
			}
			if lat > maxLat {
				maxLat = lat
			}
			if lng < minLng {
				minLng = lng
			}
			if lng > maxLng {
				maxLng = lng
			}
		}
	}

	centerLat := (minLat + maxLat) / 2
	centerLng := (minLng + maxLng) / 2

	return &types.GeographicBounds{
		NorthEast: &types.GeographicCoordinates{
			Latitude:  maxLat,
			Longitude: maxLng,
		},
		SouthWest: &types.GeographicCoordinates{
			Latitude:  minLat,
			Longitude: minLng,
		},
		Center: &types.GeographicCoordinates{
			Latitude:  centerLat,
			Longitude: centerLng,
		},
		ZoomLevel: 8,
	}
}
