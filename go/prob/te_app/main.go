package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/saichler/l8pollaris/go/types/l8poll"
	"github.com/saichler/l8types/go/types/l8api"
	"github.com/saichler/l8types/go/types/l8health"
	"github.com/saichler/l8types/go/types/l8web"
	"github.com/saichler/probler/go/types"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8web/go/web/server"
	"github.com/saichler/layer8/go/overlay/health"
	"github.com/saichler/layer8/go/overlay/protocol"
	"github.com/saichler/layer8/go/overlay/vnet"
	"github.com/saichler/layer8/go/overlay/vnic"
	common2 "github.com/saichler/probler/go/prob/common"
	types2 "github.com/saichler/probler/go/types"
	"github.com/saichler/reflect/go/reflect/introspecting"
)

type TeApp struct {
	resources *ifs.Resources
	nic       *vnic.VirtualNetworkInterface
}

type TeTopologyResponse struct {
	Nodes []TeNode `json:"nodes"`
	Links []TeLink `json:"links"`
	SrPolicies []SrPolicyView `json:"sr_policies"`
	BgpSessions []BgpSessionView `json:"bgp_sessions"`
	MplsLabels []MplsLabelView `json:"mpls_labels"`
}

type TeNode struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Type     string  `json:"type"`
	Status   string  `json:"status"`
	Location string  `json:"location"`
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
	AsNumber uint32  `json:"as_number,omitempty"`
	RouterID string  `json:"router_id,omitempty"`
}

type TeLink struct {
	ID           string  `json:"id"`
	Source       string  `json:"source"`
	Target       string  `json:"target"`
	Status       string  `json:"status"`
	Bandwidth    string  `json:"bandwidth"`
	Utilization  uint32  `json:"utilization"`
	TeEnabled    bool    `json:"te_enabled"`
	MplsEnabled  bool    `json:"mpls_enabled"`
	Cost         uint32  `json:"cost"`
	Delay        uint32  `json:"delay"`
}

type SrPolicyView struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	Endpoint   string   `json:"endpoint"`
	Color      uint32   `json:"color"`
	Status     string   `json:"status"`
	Paths      []string `json:"paths"`
	Preference uint32   `json:"preference"`
	Traffic    uint64   `json:"traffic"`
}

type BgpSessionView struct {
	ID          string `json:"id"`
	PeerIP      string `json:"peer_ip"`
	PeerAS      uint32 `json:"peer_as"`
	State       string `json:"state"`
	Uptime      uint32 `json:"uptime"`
	Routes      uint32 `json:"routes"`
	Type        string `json:"type"`
}

type MplsLabelView struct {
	Label     uint32 `json:"label"`
	Type      string `json:"type"`
	Fec       string `json:"fec"`
	NextHop   string `json:"next_hop"`
	Interface string `json:"interface"`
}

func main() {
	app := &TeApp{}
	app.initialize()
	app.startWebServer()
}

func (app *TeApp) initialize() {
	app.resources = common2.CreateResources("te-app-" + os.Getenv("HOSTNAME"))
	app.resources.Logger().SetLogLevel(ifs.Info_Level)
	
	net := vnet.NewVNet(app.resources)
	net.Start()
	app.resources.Logger().Info("TE Application vnet started!")
}

func (app *TeApp) startWebServer() {
	serverConfig := &server.RestServerConfig{
		Host:           protocol.MachineIP,
		Port:           8443,
		Authentication: false,
		CertName:       "te-app",
		Prefix:         common2.PREFIX,
	}
	svr, err := server.NewRestServer(serverConfig)
	if err != nil {
		panic(err)
	}

	// Setup network interface
	app.nic = vnic.NewVirtualNetworkInterface(app.resources, nil)
	app.nic.Resources().SysConfig().KeepAliveIntervalSeconds = 60
	app.nic.Start()
	app.nic.WaitForConnection()

	// Register types
	app.registerTypes()

	// Register health service
	hs, ok := app.nic.Resources().Services().ServiceHandler(health.ServiceName, 0)
	if ok {
		ws := hs.WebService()
		svr.RegisterWebService(ws, app.nic)
	}

	// Register REST endpoints
	app.registerEndpoints(svr)

	app.resources.Logger().Info("TE Application Web Server Started on port 8443!")
	svr.Start()
}

func (app *TeApp) registerTypes() {
	app.nic.Resources().Registry().Register(&l8poll.L8Pollaris{})
	app.nic.Resources().Registry().Register(&l8poll.L8C_Target{})
	app.nic.Resources().Registry().Register(&types.NetworkDevice{})
	app.nic.Resources().Registry().Register(&types.NetworkDeviceList{})
	app.nic.Resources().Registry().Register(&types2.K8SCluster{})
	app.nic.Resources().Registry().Register(&types2.K8SClusterList{})
	app.nic.Resources().Registry().Register(&l8api.L8Query{})
	app.nic.Resources().Registry().Register(&l8health.L8Top{})
	app.nic.Resources().Registry().Register(&l8web.L8Empty{})
	app.nic.Resources().Registry().Register(&l8poll.CJob{})

	node, _ := app.resources.Introspector().Inspect(&types.NetworkDevice{})
	introspecting.AddPrimaryKeyDecorator(node, "Id")
}

func (app *TeApp) registerEndpoints(svr *server.RestServer) {
	// TE Topology endpoint
	http.HandleFunc("/api/te/topology", app.handleTeTopology)
	
	// SR Policies endpoint
	http.HandleFunc("/api/te/sr-policies", app.handleSrPolicies)
	
	// BGP Sessions endpoint
	http.HandleFunc("/api/te/bgp-sessions", app.handleBgpSessions)
	
	// MPLS Labels endpoint
	http.HandleFunc("/api/te/mpls-labels", app.handleMplsLabels)
	
	// TE Tunnels endpoint
	http.HandleFunc("/api/te/tunnels", app.handleTeTunnels)
}

func (app *TeApp) handleTeTopology(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	
	// Generate sample TE topology data
	response := app.generateTeTopology()
	
	json.NewEncoder(w).Encode(response)
}

func (app *TeApp) generateTeTopology() TeTopologyResponse {
	// Comprehensive global TE network with diverse router types and statuses
	nodes := []TeNode{
		// North America - Core Network
		{ID: "pe-nyc-01", Name: "NYC-PE-CORE-01", Type: "pe", Status: "active", Location: "New York, USA", Lat: 40.7128, Lng: -74.0060, AsNumber: 65001, RouterID: "1.1.1.1"},
		{ID: "pe-lax-01", Name: "LAX-PE-EDGE-01", Type: "pe", Status: "active", Location: "Los Angeles, USA", Lat: 34.0522, Lng: -118.2426, AsNumber: 65001, RouterID: "2.2.2.2"},
		{ID: "pe-chi-01", Name: "CHI-PE-AGGR-01", Type: "pe", Status: "warning", Location: "Chicago, USA", Lat: 41.8781, Lng: -87.6298, AsNumber: 65001, RouterID: "3.3.3.3"},
		{ID: "p-dal-01", Name: "DAL-P-BACKBONE-01", Type: "p", Status: "active", Location: "Dallas, USA", Lat: 32.7767, Lng: -96.7970, AsNumber: 65001, RouterID: "4.4.4.4"},
		{ID: "p-den-01", Name: "DEN-P-TRANSIT-01", Type: "p", Status: "active", Location: "Denver, USA", Lat: 39.7392, Lng: -104.9903, AsNumber: 65001, RouterID: "5.5.5.5"},
		{ID: "rr-atl-01", Name: "ATL-RR-PRIMARY-01", Type: "rr", Status: "active", Location: "Atlanta, USA", Lat: 33.7490, Lng: -84.3880, AsNumber: 65001, RouterID: "6.6.6.6"},
		{ID: "asbr-mia-01", Name: "MIA-ASBR-INTL-01", Type: "asbr", Status: "active", Location: "Miami, USA", Lat: 25.7617, Lng: -80.1918, AsNumber: 65001, RouterID: "7.7.7.7"},
		{ID: "pe-tor-01", Name: "TOR-PE-NORTH-01", Type: "pe", Status: "active", Location: "Toronto, Canada", Lat: 43.6532, Lng: -79.3832, AsNumber: 65001, RouterID: "8.8.8.8"},
		
		// Europe - Multi-AS Network
		{ID: "pe-lon-01", Name: "LON-PE-METRO-01", Type: "pe", Status: "active", Location: "London, UK", Lat: 51.5074, Lng: -0.1278, AsNumber: 65002, RouterID: "10.10.10.10"},
		{ID: "pe-par-01", Name: "PAR-PE-ACCESS-01", Type: "pe", Status: "active", Location: "Paris, France", Lat: 48.8566, Lng: 2.3522, AsNumber: 65002, RouterID: "11.11.11.11"},
		{ID: "p-fra-01", Name: "FRA-P-EXCHANGE-01", Type: "p", Status: "active", Location: "Frankfurt, Germany", Lat: 50.1109, Lng: 8.6821, AsNumber: 65002, RouterID: "12.12.12.12"},
		{ID: "p-ams-01", Name: "AMS-P-HUB-01", Type: "p", Status: "inactive", Location: "Amsterdam, Netherlands", Lat: 52.3676, Lng: 4.9041, AsNumber: 65002, RouterID: "13.13.13.13"},
		{ID: "rr-zur-01", Name: "ZUR-RR-BACKUP-01", Type: "rr", Status: "active", Location: "Zurich, Switzerland", Lat: 47.3769, Lng: 8.5417, AsNumber: 65002, RouterID: "14.14.14.14"},
		{ID: "asbr-mil-01", Name: "MIL-ASBR-SOUTH-01", Type: "asbr", Status: "active", Location: "Milan, Italy", Lat: 45.4642, Lng: 9.1900, AsNumber: 65002, RouterID: "15.15.15.15"},
		{ID: "pe-mad-01", Name: "MAD-PE-IBERIA-01", Type: "pe", Status: "warning", Location: "Madrid, Spain", Lat: 40.4168, Lng: -3.7038, AsNumber: 65002, RouterID: "16.16.16.16"},
		
		// Asia-Pacific - Emerging Markets
		{ID: "pe-tok-01", Name: "TOK-PE-JAPAN-01", Type: "pe", Status: "active", Location: "Tokyo, Japan", Lat: 35.6762, Lng: 139.6503, AsNumber: 65003, RouterID: "20.20.20.20"},
		{ID: "pe-sin-01", Name: "SIN-PE-SEASIA-01", Type: "pe", Status: "active", Location: "Singapore", Lat: 1.3521, Lng: 103.8198, AsNumber: 65003, RouterID: "21.21.21.21"},
		{ID: "p-hkg-01", Name: "HKG-P-CHINA-01", Type: "p", Status: "active", Location: "Hong Kong", Lat: 22.3193, Lng: 114.1694, AsNumber: 65003, RouterID: "22.22.22.22"},
		{ID: "pe-seo-01", Name: "SEO-PE-KOREA-01", Type: "pe", Status: "active", Location: "Seoul, South Korea", Lat: 37.5665, Lng: 126.9780, AsNumber: 65003, RouterID: "23.23.23.23"},
		{ID: "asbr-mum-01", Name: "MUM-ASBR-INDIA-01", Type: "asbr", Status: "inactive", Location: "Mumbai, India", Lat: 19.0760, Lng: 72.8777, AsNumber: 65004, RouterID: "24.24.24.24"},
		{ID: "pe-syd-01", Name: "SYD-PE-OCEANIA-01", Type: "pe", Status: "active", Location: "Sydney, Australia", Lat: -33.8688, Lng: 151.2093, AsNumber: 65003, RouterID: "25.25.25.25"},
		{ID: "rr-mel-01", Name: "MEL-RR-PACIFIC-01", Type: "rr", Status: "active", Location: "Melbourne, Australia", Lat: -37.8136, Lng: 144.9631, AsNumber: 65003, RouterID: "26.26.26.26"},
		
		// South America & Africa - Growth Regions  
		{ID: "pe-sao-01", Name: "SAO-PE-BRASIL-01", Type: "pe", Status: "active", Location: "São Paulo, Brazil", Lat: -23.5505, Lng: -46.6333, AsNumber: 65005, RouterID: "30.30.30.30"},
		{ID: "pe-bog-01", Name: "BOG-PE-ANDEAN-01", Type: "pe", Status: "warning", Location: "Bogotá, Colombia", Lat: 4.7110, Lng: -74.0721, AsNumber: 65005, RouterID: "31.31.31.31"},
		{ID: "asbr-bue-01", Name: "BUE-ASBR-LATAM-01", Type: "asbr", Status: "active", Location: "Buenos Aires, Argentina", Lat: -34.6118, Lng: -58.3960, AsNumber: 65005, RouterID: "32.32.32.32"},
		{ID: "pe-cai-01", Name: "CAI-PE-MENA-01", Type: "pe", Status: "active", Location: "Cairo, Egypt", Lat: 30.0444, Lng: 31.2357, AsNumber: 65006, RouterID: "40.40.40.40"},
		{ID: "pe-cpt-01", Name: "CPT-PE-SAFRICA-01", Type: "pe", Status: "active", Location: "Cape Town, South Africa", Lat: -33.9249, Lng: 18.4241, AsNumber: 65006, RouterID: "41.41.41.41"},
		{ID: "asbr-lag-01", Name: "LAG-ASBR-WAFRICA-01", Type: "asbr", Status: "inactive", Location: "Lagos, Nigeria", Lat: 6.5244, Lng: 3.3792, AsNumber: 65006, RouterID: "42.42.42.42"},
		
		// Middle East & Central Asia
		{ID: "pe-dub-01", Name: "DUB-PE-GULF-01", Type: "pe", Status: "active", Location: "Dubai, UAE", Lat: 25.2048, Lng: 55.2708, AsNumber: 65007, RouterID: "50.50.50.50"},
		{ID: "p-ist-01", Name: "IST-P-BRIDGE-01", Type: "p", Status: "active", Location: "Istanbul, Turkey", Lat: 41.0082, Lng: 28.9784, AsNumber: 65007, RouterID: "51.51.51.51"},
		{ID: "rr-mos-01", Name: "MOS-RR-RUSSIA-01", Type: "rr", Status: "warning", Location: "Moscow, Russia", Lat: 55.7558, Lng: 37.6176, AsNumber: 65008, RouterID: "52.52.52.52"},
	}

	// Comprehensive global TE links with diverse technologies and states
	links := []TeLink{
		// North America Backbone - High Capacity Core
		{ID: "na-core-01", Source: "pe-nyc-01", Target: "p-dal-01", Status: "up", Bandwidth: "400Gbps", Utilization: 73, TeEnabled: true, MplsEnabled: true, Cost: 5, Delay: 12},
		{ID: "na-core-02", Source: "pe-lax-01", Target: "p-den-01", Status: "up", Bandwidth: "400Gbps", Utilization: 68, TeEnabled: true, MplsEnabled: true, Cost: 5, Delay: 15},
		{ID: "na-core-03", Source: "p-dal-01", Target: "p-den-01", Status: "up", Bandwidth: "800Gbps", Utilization: 42, TeEnabled: true, MplsEnabled: true, Cost: 3, Delay: 8},
		{ID: "na-pe-01", Source: "pe-chi-01", Target: "rr-atl-01", Status: "warning", Bandwidth: "100Gbps", Utilization: 89, TeEnabled: true, MplsEnabled: true, Cost: 15, Delay: 18},
		{ID: "na-pe-02", Source: "pe-tor-01", Target: "pe-nyc-01", Status: "up", Bandwidth: "200Gbps", Utilization: 34, TeEnabled: true, MplsEnabled: true, Cost: 12, Delay: 6},
		{ID: "na-intl-01", Source: "asbr-mia-01", Target: "pe-sao-01", Status: "up", Bandwidth: "100Gbps", Utilization: 56, TeEnabled: true, MplsEnabled: true, Cost: 25, Delay: 45},
		
		// Europe Regional Network - Mixed Performance
		{ID: "eu-metro-01", Source: "pe-lon-01", Target: "p-fra-01", Status: "up", Bandwidth: "200Gbps", Utilization: 67, TeEnabled: true, MplsEnabled: true, Cost: 8, Delay: 14},
		{ID: "eu-metro-02", Source: "pe-par-01", Target: "p-fra-01", Status: "up", Bandwidth: "200Gbps", Utilization: 45, TeEnabled: true, MplsEnabled: true, Cost: 10, Delay: 12},
		{ID: "eu-prob-01", Source: "p-ams-01", Target: "rr-zur-01", Status: "down", Bandwidth: "40Gbps", Utilization: 0, TeEnabled: false, MplsEnabled: false, Cost: 999, Delay: 999},
		{ID: "eu-south-01", Source: "asbr-mil-01", Target: "pe-mad-01", Status: "warning", Bandwidth: "40Gbps", Utilization: 92, TeEnabled: true, MplsEnabled: true, Cost: 20, Delay: 22},
		{ID: "eu-backup-01", Source: "rr-zur-01", Target: "p-fra-01", Status: "up", Bandwidth: "100Gbps", Utilization: 23, TeEnabled: true, MplsEnabled: true, Cost: 18, Delay: 8},
		
		// Trans-Atlantic Submarine Cables
		{ID: "transatl-01", Source: "pe-nyc-01", Target: "pe-lon-01", Status: "up", Bandwidth: "400Gbps", Utilization: 78, TeEnabled: true, MplsEnabled: true, Cost: 50, Delay: 76},
		{ID: "transatl-02", Source: "asbr-mia-01", Target: "asbr-mil-01", Status: "up", Bandwidth: "200Gbps", Utilization: 63, TeEnabled: true, MplsEnabled: true, Cost: 60, Delay: 85},
		{ID: "transatl-backup", Source: "pe-tor-01", Target: "pe-par-01", Status: "up", Bandwidth: "100Gbps", Utilization: 31, TeEnabled: true, MplsEnabled: true, Cost: 70, Delay: 92},
		
		// Asia-Pacific Ring - Emerging Tech
		{ID: "apac-ring-01", Source: "pe-tok-01", Target: "pe-sin-01", Status: "up", Bandwidth: "200Gbps", Utilization: 71, TeEnabled: true, MplsEnabled: true, Cost: 30, Delay: 45},
		{ID: "apac-ring-02", Source: "pe-sin-01", Target: "p-hkg-01", Status: "up", Bandwidth: "400Gbps", Utilization: 52, TeEnabled: true, MplsEnabled: true, Cost: 15, Delay: 25},
		{ID: "apac-ring-03", Source: "p-hkg-01", Target: "pe-seo-01", Status: "up", Bandwidth: "200Gbps", Utilization: 47, TeEnabled: true, MplsEnabled: true, Cost: 20, Delay: 35},
		{ID: "apac-india-01", Source: "pe-sin-01", Target: "asbr-mum-01", Status: "down", Bandwidth: "40Gbps", Utilization: 0, TeEnabled: false, MplsEnabled: false, Cost: 999, Delay: 999},
		{ID: "apac-oceania-01", Source: "pe-syd-01", Target: "rr-mel-01", Status: "up", Bandwidth: "100Gbps", Utilization: 36, TeEnabled: true, MplsEnabled: true, Cost: 12, Delay: 8},
		{ID: "apac-pacific-01", Source: "pe-tok-01", Target: "pe-syd-01", Status: "up", Bandwidth: "200Gbps", Utilization: 44, TeEnabled: true, MplsEnabled: true, Cost: 35, Delay: 65},
		
		// Trans-Pacific Submarine Links
		{ID: "transpacific-01", Source: "pe-lax-01", Target: "pe-tok-01", Status: "up", Bandwidth: "400Gbps", Utilization: 82, TeEnabled: true, MplsEnabled: true, Cost: 45, Delay: 125},
		{ID: "transpacific-02", Source: "pe-lax-01", Target: "pe-syd-01", Status: "up", Bandwidth: "200Gbps", Utilization: 59, TeEnabled: true, MplsEnabled: true, Cost: 55, Delay: 145},
		
		// South America & Africa - Developing Infrastructure
		{ID: "latam-01", Source: "pe-sao-01", Target: "pe-bog-01", Status: "warning", Bandwidth: "40Gbps", Utilization: 88, TeEnabled: true, MplsEnabled: true, Cost: 30, Delay: 45},
		{ID: "latam-02", Source: "pe-bog-01", Target: "asbr-bue-01", Status: "up", Bandwidth: "100Gbps", Utilization: 41, TeEnabled: true, MplsEnabled: true, Cost: 25, Delay: 38},
		{ID: "africa-01", Source: "pe-cai-01", Target: "pe-cpt-01", Status: "up", Bandwidth: "40Gbps", Utilization: 74, TeEnabled: true, MplsEnabled: true, Cost: 40, Delay: 55},
		{ID: "africa-west-01", Source: "pe-cai-01", Target: "asbr-lag-01", Status: "down", Bandwidth: "10Gbps", Utilization: 0, TeEnabled: false, MplsEnabled: false, Cost: 999, Delay: 999},
		
		// Middle East Hub Links
		{ID: "mideast-01", Source: "pe-dub-01", Target: "p-ist-01", Status: "up", Bandwidth: "200Gbps", Utilization: 65, TeEnabled: true, MplsEnabled: true, Cost: 22, Delay: 28},
		{ID: "mideast-02", Source: "pe-dub-01", Target: "pe-cai-01", Status: "up", Bandwidth: "100Gbps", Utilization: 38, TeEnabled: true, MplsEnabled: true, Cost: 28, Delay: 35},
		{ID: "russia-01", Source: "p-ist-01", Target: "rr-mos-01", Status: "warning", Bandwidth: "40Gbps", Utilization: 91, TeEnabled: true, MplsEnabled: true, Cost: 35, Delay: 42},
		
		// Inter-Continental Connections
		{ID: "eu-asia-01", Source: "p-fra-01", Target: "pe-dub-01", Status: "up", Bandwidth: "200Gbps", Utilization: 54, TeEnabled: true, MplsEnabled: true, Cost: 32, Delay: 48},
		{ID: "asia-africa-01", Source: "pe-sin-01", Target: "pe-cai-01", Status: "up", Bandwidth: "100Gbps", Utilization: 46, TeEnabled: true, MplsEnabled: true, Cost: 45, Delay: 72},
		{ID: "backup-global-01", Source: "pe-nyc-01", Target: "pe-tok-01", Status: "up", Bandwidth: "100Gbps", Utilization: 21, TeEnabled: true, MplsEnabled: true, Cost: 80, Delay: 160},
	}

	// Diverse SR Policies with Multiple Service Classes
	srPolicies := []SrPolicyView{
		// Premium Low-Latency Services
		{ID: "sr-ultra-low", Name: "Ultra-Low-Latency-Gaming", Endpoint: "20.20.20.20", Color: 100, Status: "up", 
			Paths: []string{"pe-nyc-01->p-dal-01->p-den-01->pe-lax-01->pe-tok-01"}, Preference: 255, Traffic: 25000000000},
		{ID: "sr-finance-ny-lon", Name: "Financial-Trading-Express", Endpoint: "10.10.10.10", Color: 150, Status: "up", 
			Paths: []string{"pe-nyc-01->pe-lon-01"}, Preference: 250, Traffic: 45000000000},
		{ID: "sr-hft-backup", Name: "HFT-Backup-Path", Endpoint: "10.10.10.10", Color: 151, Status: "standby", 
			Paths: []string{"pe-nyc-01->pe-tor-01->pe-par-01->pe-lon-01"}, Preference: 200, Traffic: 0},
		
		// High-Bandwidth Content Delivery
		{ID: "sr-cdn-global", Name: "Global-CDN-Distribution", Endpoint: "21.21.21.21", Color: 200, Status: "up", 
			Paths: []string{"pe-lax-01->pe-tok-01->pe-sin-01", "pe-lax-01->pe-syd-01"}, Preference: 180, Traffic: 120000000000},
		{ID: "sr-streaming-eu", Name: "EU-Streaming-Service", Endpoint: "11.11.11.11", Color: 210, Status: "up", 
			Paths: []string{"pe-lon-01->p-fra-01->pe-par-01", "pe-lon-01->asbr-mil-01->pe-mad-01"}, Preference: 170, Traffic: 85000000000},
		{ID: "sr-video-transco", Name: "Video-Transcoding-Farm", Endpoint: "12.12.12.12", Color: 220, Status: "up", 
			Paths: []string{"p-fra-01->rr-zur-01->asbr-mil-01"}, Preference: 150, Traffic: 65000000000},
		
		// Enterprise VPN Services
		{ID: "sr-corp-primary", Name: "Corporate-VPN-Primary", Endpoint: "50.50.50.50", Color: 300, Status: "up", 
			Paths: []string{"pe-nyc-01->asbr-mia-01->pe-dub-01", "pe-nyc-01->pe-lon-01->p-fra-01->pe-dub-01"}, Preference: 160, Traffic: 32000000000},
		{ID: "sr-corp-backup", Name: "Corporate-VPN-Backup", Endpoint: "50.50.50.50", Color: 301, Status: "up", 
			Paths: []string{"pe-nyc-01->pe-tok-01->pe-sin-01->pe-dub-01"}, Preference: 120, Traffic: 8000000000},
		{ID: "sr-branch-office", Name: "Branch-Office-Connect", Endpoint: "30.30.30.30", Color: 310, Status: "warning", 
			Paths: []string{"pe-nyc-01->asbr-mia-01->pe-sao-01"}, Preference: 140, Traffic: 15000000000},
		
		// Cloud & Data Center Interconnect
		{ID: "sr-cloud-hybrid", Name: "Hybrid-Cloud-Connect", Endpoint: "25.25.25.25", Color: 400, Status: "up", 
			Paths: []string{"pe-lax-01->pe-syd-01", "pe-lax-01->pe-tok-01->pe-syd-01"}, Preference: 190, Traffic: 78000000000},
		{ID: "sr-dc-replication", Name: "Datacenter-Replication", Endpoint: "40.40.40.40", Color: 450, Status: "up", 
			Paths: []string{"pe-lon-01->pe-dub-01->pe-cai-01"}, Preference: 130, Traffic: 95000000000},
		{ID: "sr-edge-computing", Name: "Edge-Computing-Mesh", Endpoint: "23.23.23.23", Color: 460, Status: "up", 
			Paths: []string{"pe-tok-01->p-hkg-01->pe-seo-01"}, Preference: 110, Traffic: 42000000000},
		
		// Emerging Market Connectivity
		{ID: "sr-latam-ring", Name: "Latin-America-Ring", Endpoint: "32.32.32.32", Color: 500, Status: "warning", 
			Paths: []string{"pe-sao-01->pe-bog-01->asbr-bue-01"}, Preference: 100, Traffic: 18000000000},
		{ID: "sr-africa-gateway", Name: "Africa-Gateway-Service", Endpoint: "41.41.41.41", Color: 550, Status: "up", 
			Paths: []string{"pe-lon-01->pe-cai-01->pe-cpt-01"}, Preference: 90, Traffic: 28000000000},
		{ID: "sr-middle-east", Name: "Middle-East-Hub", Endpoint: "51.51.51.51", Color: 600, Status: "up", 
			Paths: []string{"p-fra-01->pe-dub-01->p-ist-01"}, Preference: 80, Traffic: 35000000000},
		
		// Experimental & Future Tech
		{ID: "sr-quantum-prep", Name: "Quantum-Ready-Path", Endpoint: "52.52.52.52", Color: 700, Status: "inactive", 
			Paths: []string{"rr-mos-01->p-ist-01->pe-dub-01"}, Preference: 50, Traffic: 1000000},
		{ID: "sr-research-net", Name: "Research-Network-Slice", Endpoint: "14.14.14.14", Color: 750, Status: "up", 
			Paths: []string{"rr-zur-01->p-fra-01->pe-lon-01"}, Preference: 60, Traffic: 5500000000},
		
		// Failed/Maintenance Policies
		{ID: "sr-maintenance", Name: "Under-Maintenance-Policy", Endpoint: "13.13.13.13", Color: 999, Status: "down", 
			Paths: []string{"p-ams-01->rr-zur-01"}, Preference: 10, Traffic: 0},
		{ID: "sr-congested", Name: "Congested-Backup-Path", Endpoint: "42.42.42.42", Color: 888, Status: "down", 
			Paths: []string{"asbr-lag-01->pe-cai-01"}, Preference: 20, Traffic: 0},
	}

	// Comprehensive BGP Sessions - Multi-AS Global Network
	bgpSessions := []BgpSessionView{
		// AS 65001 - North America Internal Sessions
		{ID: "ibgp-nyc-lax", PeerIP: "2.2.2.2", PeerAS: 65001, State: "established", Uptime: 2592000, Routes: 485000, Type: "ibgp"},
		{ID: "ibgp-nyc-chi", PeerIP: "3.3.3.3", PeerAS: 65001, State: "established", Uptime: 5184000, Routes: 485000, Type: "ibgp"},
		{ID: "ibgp-dal-den", PeerIP: "5.5.5.5", PeerAS: 65001, State: "established", Uptime: 7776000, Routes: 25000, Type: "ibgp"},
		{ID: "ibgp-atl-rr", PeerIP: "6.6.6.6", PeerAS: 65001, State: "established", Uptime: 1296000, Routes: 485000, Type: "ibgp"},
		{ID: "ibgp-tor-nyc", PeerIP: "8.8.8.8", PeerAS: 65001, State: "established", Uptime: 3888000, Routes: 485000, Type: "ibgp"},
		{ID: "ibgp-mia-troubled", PeerIP: "7.7.7.7", PeerAS: 65001, State: "connect", Uptime: 0, Routes: 0, Type: "ibgp"},
		
		// AS 65002 - Europe Internal Sessions
		{ID: "ibgp-lon-par", PeerIP: "11.11.11.11", PeerAS: 65002, State: "established", Uptime: 6480000, Routes: 320000, Type: "ibgp"},
		{ID: "ibgp-fra-zur", PeerIP: "14.14.14.14", PeerAS: 65002, State: "established", Uptime: 9072000, Routes: 320000, Type: "ibgp"},
		{ID: "ibgp-mil-mad", PeerIP: "16.16.16.16", PeerAS: 65002, State: "established", Uptime: 1555200, Routes: 280000, Type: "ibgp"},
		{ID: "ibgp-ams-down", PeerIP: "13.13.13.13", PeerAS: 65002, State: "idle", Uptime: 0, Routes: 0, Type: "ibgp"},
		
		// AS 65003 - Asia-Pacific Internal Sessions
		{ID: "ibgp-tok-sin", PeerIP: "21.21.21.21", PeerAS: 65003, State: "established", Uptime: 4320000, Routes: 275000, Type: "ibgp"},
		{ID: "ibgp-hkg-seo", PeerIP: "23.23.23.23", PeerAS: 65003, State: "established", Uptime: 8640000, Routes: 275000, Type: "ibgp"},
		{ID: "ibgp-syd-mel", PeerIP: "26.26.26.26", PeerAS: 65003, State: "established", Uptime: 2160000, Routes: 85000, Type: "ibgp"},
		
		// Cross-AS External BGP Sessions - Tier 1 Peers
		{ID: "ebgp-na-eu-primary", PeerIP: "10.10.10.10", PeerAS: 65002, State: "established", Uptime: 15552000, Routes: 847000, Type: "ebgp"},
		{ID: "ebgp-na-eu-backup", PeerIP: "11.11.11.11", PeerAS: 65002, State: "established", Uptime: 12960000, Routes: 825000, Type: "ebgp"},
		{ID: "ebgp-na-apac", PeerIP: "20.20.20.20", PeerAS: 65003, State: "established", Uptime: 10368000, Routes: 695000, Type: "ebgp"},
		{ID: "ebgp-eu-apac", PeerIP: "21.21.21.21", PeerAS: 65003, State: "established", Uptime: 7776000, Routes: 742000, Type: "ebgp"},
		
		// Regional AS External Sessions
		{ID: "ebgp-india-transit", PeerIP: "24.24.24.24", PeerAS: 65004, State: "idle", Uptime: 0, Routes: 0, Type: "ebgp"},
		{ID: "ebgp-latam-na", PeerIP: "30.30.30.30", PeerAS: 65005, State: "established", Uptime: 3456000, Routes: 125000, Type: "ebgp"},
		{ID: "ebgp-latam-bue", PeerIP: "32.32.32.32", PeerAS: 65005, State: "established", Uptime: 2073600, Routes: 95000, Type: "ebgp"},
		{ID: "ebgp-africa-eu", PeerIP: "40.40.40.40", PeerAS: 65006, State: "established", Uptime: 5184000, Routes: 78000, Type: "ebgp"},
		{ID: "ebgp-africa-cpt", PeerIP: "41.41.41.41", PeerAS: 65006, State: "established", Uptime: 6048000, Routes: 65000, Type: "ebgp"},
		{ID: "ebgp-africa-lag-down", PeerIP: "42.42.42.42", PeerAS: 65006, State: "idle", Uptime: 0, Routes: 0, Type: "ebgp"},
		{ID: "ebgp-mideast-eu", PeerIP: "50.50.50.50", PeerAS: 65007, State: "established", Uptime: 8294400, Routes: 185000, Type: "ebgp"},
		{ID: "ebgp-mideast-apac", PeerIP: "22.22.22.22", PeerAS: 65003, State: "established", Uptime: 4665600, Routes: 155000, Type: "ebgp"},
		{ID: "ebgp-russia-unstable", PeerIP: "52.52.52.52", PeerAS: 65008, State: "active", Uptime: 3600, Routes: 45000, Type: "ebgp"},
		
		// Internet Exchange Points (IXP) Sessions
		{ID: "ixp-london-ix", PeerIP: "195.66.224.175", PeerAS: 8714, State: "established", Uptime: 31536000, Routes: 925000, Type: "ebgp"},
		{ID: "ixp-frankfurt-de", PeerIP: "80.81.192.30", PeerAS: 6695, State: "established", Uptime: 28944000, Routes: 887000, Type: "ebgp"},
		{ID: "ixp-amsterdam-nl", PeerIP: "195.69.144.171", PeerAS: 1200, State: "opensent", Uptime: 0, Routes: 0, Type: "ebgp"},
		{ID: "ixp-tokyo-jpix", PeerIP: "210.171.224.5", PeerAS: 9605, State: "established", Uptime: 20736000, Routes: 425000, Type: "ebgp"},
		{ID: "ixp-singapore-sgix", PeerIP: "103.16.102.2", PeerAS: 3758, State: "established", Uptime: 18144000, Routes: 385000, Type: "ebgp"},
		{ID: "ixp-sydney-ix", PeerIP: "218.100.52.1", PeerAS: 4608, State: "established", Uptime: 15552000, Routes: 245000, Type: "ebgp"},
		
		// Content Delivery Networks
		{ID: "cdn-google", PeerIP: "8.8.8.8", PeerAS: 15169, State: "established", Uptime: 25920000, Routes: 350, Type: "ebgp"},
		{ID: "cdn-cloudflare", PeerIP: "1.1.1.1", PeerAS: 13335, State: "established", Uptime: 20736000, Routes: 280, Type: "ebgp"},
		{ID: "cdn-amazon", PeerIP: "205.251.242.103", PeerAS: 16509, State: "established", Uptime: 18144000, Routes: 1250, Type: "ebgp"},
		{ID: "cdn-netflix", PeerIP: "198.45.48.1", PeerAS: 2906, State: "established", Uptime: 12960000, Routes: 180, Type: "ebgp"},
		{ID: "cdn-microsoft", PeerIP: "13.107.42.14", PeerAS: 8075, State: "established", Uptime: 15552000, Routes: 650, Type: "ebgp"},
		
		// Enterprise Customers
		{ID: "customer-bank-primary", PeerIP: "172.16.1.1", PeerAS: 64512, State: "established", Uptime: 7776000, Routes: 125, Type: "ebgp"},
		{ID: "customer-bank-backup", PeerIP: "172.16.1.2", PeerAS: 64512, State: "established", Uptime: 6048000, Routes: 125, Type: "ebgp"},
		{ID: "customer-tech-corp", PeerIP: "10.1.0.1", PeerAS: 64513, State: "established", Uptime: 5184000, Routes: 85, Type: "ebgp"},
		{ID: "customer-media-co", PeerIP: "192.168.100.1", PeerAS: 64514, State: "established", Uptime: 2592000, Routes: 45, Type: "ebgp"},
		
		// Problematic/Flapping Sessions
		{ID: "flapping-peer", PeerIP: "203.0.113.1", PeerAS: 64999, State: "connect", Uptime: 300, Routes: 0, Type: "ebgp"},
		{ID: "maintenance-peer", PeerIP: "198.51.100.1", PeerAS: 65000, State: "admin-shutdown", Uptime: 0, Routes: 0, Type: "ebgp"},
	}

	// Comprehensive MPLS Label Database - Multiple Technologies
	mplsLabels := []MplsLabelView{
		// Segment Routing Node Labels (16000-23999 range)
		{Label: 16001, Type: "sr-node", Fec: "1.1.1.1/32", NextHop: "direct", Interface: "lo0"},
		{Label: 16002, Type: "sr-node", Fec: "2.2.2.2/32", NextHop: "4.4.4.4", Interface: "400GE-1/0/1"},
		{Label: 16003, Type: "sr-node", Fec: "3.3.3.3/32", NextHop: "4.4.4.4", Interface: "400GE-1/0/1"},
		{Label: 16004, Type: "sr-node", Fec: "4.4.4.4/32", NextHop: "direct", Interface: "lo0"},
		{Label: 16005, Type: "sr-node", Fec: "5.5.5.5/32", NextHop: "4.4.4.4", Interface: "400GE-1/0/2"},
		{Label: 16006, Type: "sr-node", Fec: "6.6.6.6/32", NextHop: "5.5.5.5", Interface: "100GE-2/0/1"},
		{Label: 16007, Type: "sr-node", Fec: "7.7.7.7/32", NextHop: "6.6.6.6", Interface: "200GE-2/0/0"},
		{Label: 16008, Type: "sr-node", Fec: "8.8.8.8/32", NextHop: "1.1.1.1", Interface: "200GE-0/0/5"},
		
		// Europe SR Node Labels
		{Label: 17010, Type: "sr-node", Fec: "10.10.10.10/32", NextHop: "12.12.12.12", Interface: "200GE-3/0/1"},
		{Label: 17011, Type: "sr-node", Fec: "11.11.11.11/32", NextHop: "12.12.12.12", Interface: "200GE-3/0/2"},
		{Label: 17012, Type: "sr-node", Fec: "12.12.12.12/32", NextHop: "direct", Interface: "lo0"},
		{Label: 17013, Type: "sr-node", Fec: "13.13.13.13/32", NextHop: "invalid", Interface: "disabled"},
		{Label: 17014, Type: "sr-node", Fec: "14.14.14.14/32", NextHop: "12.12.12.12", Interface: "100GE-3/1/0"},
		{Label: 17015, Type: "sr-node", Fec: "15.15.15.15/32", NextHop: "14.14.14.14", Interface: "200GE-3/2/0"},
		{Label: 17016, Type: "sr-node", Fec: "16.16.16.16/32", NextHop: "15.15.15.15", Interface: "40GE-3/3/0"},
		
		// Asia-Pacific SR Node Labels
		{Label: 18020, Type: "sr-node", Fec: "20.20.20.20/32", NextHop: "22.22.22.22", Interface: "200GE-4/0/1"},
		{Label: 18021, Type: "sr-node", Fec: "21.21.21.21/32", NextHop: "22.22.22.22", Interface: "400GE-4/0/2"},
		{Label: 18022, Type: "sr-node", Fec: "22.22.22.22/32", NextHop: "direct", Interface: "lo0"},
		{Label: 18023, Type: "sr-node", Fec: "23.23.23.23/32", NextHop: "22.22.22.22", Interface: "200GE-4/1/0"},
		{Label: 18024, Type: "sr-node", Fec: "24.24.24.24/32", NextHop: "unreachable", Interface: "maintenance"},
		{Label: 18025, Type: "sr-node", Fec: "25.25.25.25/32", NextHop: "20.20.20.20", Interface: "200GE-4/2/0"},
		{Label: 18026, Type: "sr-node", Fec: "26.26.26.26/32", NextHop: "25.25.25.25", Interface: "100GE-4/3/0"},
		
		// Global Regional SR Node Labels
		{Label: 19030, Type: "sr-node", Fec: "30.30.30.30/32", NextHop: "7.7.7.7", Interface: "100GE-5/0/0"},
		{Label: 19031, Type: "sr-node", Fec: "31.31.31.31/32", NextHop: "30.30.30.30", Interface: "40GE-5/0/1"},
		{Label: 19032, Type: "sr-node", Fec: "32.32.32.32/32", NextHop: "31.31.31.31", Interface: "100GE-5/0/2"},
		{Label: 19040, Type: "sr-node", Fec: "40.40.40.40/32", NextHop: "10.10.10.10", Interface: "100GE-6/0/0"},
		{Label: 19041, Type: "sr-node", Fec: "41.41.41.41/32", NextHop: "40.40.40.40", Interface: "40GE-6/0/1"},
		{Label: 19042, Type: "sr-node", Fec: "42.42.42.42/32", NextHop: "unreachable", Interface: "failed"},
		{Label: 19050, Type: "sr-node", Fec: "50.50.50.50/32", NextHop: "12.12.12.12", Interface: "200GE-7/0/0"},
		{Label: 19051, Type: "sr-node", Fec: "51.51.51.51/32", NextHop: "50.50.50.50", Interface: "200GE-7/0/1"},
		{Label: 19052, Type: "sr-node", Fec: "52.52.52.52/32", NextHop: "51.51.51.51", Interface: "40GE-7/0/2"},
		
		// SR Adjacency Labels (24000-31999 range)
		{Label: 24001, Type: "sr-adj", Fec: "adj:400GE-1/0/1->4.4.4.4", NextHop: "4.4.4.4", Interface: "400GE-1/0/1"},
		{Label: 24002, Type: "sr-adj", Fec: "adj:400GE-1/0/2->5.5.5.5", NextHop: "5.5.5.5", Interface: "400GE-1/0/2"},
		{Label: 24003, Type: "sr-adj", Fec: "adj:200GE-0/0/5->8.8.8.8", NextHop: "8.8.8.8", Interface: "200GE-0/0/5"},
		{Label: 24010, Type: "sr-adj", Fec: "adj:200GE-3/0/1->10.10.10.10", NextHop: "10.10.10.10", Interface: "200GE-3/0/1"},
		{Label: 24011, Type: "sr-adj", Fec: "adj:200GE-3/0/2->11.11.11.11", NextHop: "11.11.11.11", Interface: "200GE-3/0/2"},
		{Label: 24020, Type: "sr-adj", Fec: "adj:200GE-4/0/1->20.20.20.20", NextHop: "20.20.20.20", Interface: "200GE-4/0/1"},
		{Label: 24021, Type: "sr-adj", Fec: "adj:400GE-4/0/2->21.21.21.21", NextHop: "21.21.21.21", Interface: "400GE-4/0/2"},
		{Label: 24030, Type: "sr-adj", Fec: "adj:100GE-5/0/0->30.30.30.30", NextHop: "30.30.30.30", Interface: "100GE-5/0/0"},
		{Label: 24050, Type: "sr-adj", Fec: "adj:200GE-7/0/0->50.50.50.50", NextHop: "50.50.50.50", Interface: "200GE-7/0/0"},
		
		// LDP Labels (300000-399999 range)
		{Label: 300001, Type: "ldp", Fec: "10.1.0.0/16", NextHop: "4.4.4.4", Interface: "400GE-1/0/1"},
		{Label: 300002, Type: "ldp", Fec: "10.2.0.0/16", NextHop: "5.5.5.5", Interface: "400GE-1/0/2"},
		{Label: 300010, Type: "ldp", Fec: "172.16.0.0/12", NextHop: "10.10.10.10", Interface: "200GE-3/0/1"},
		{Label: 300020, Type: "ldp", Fec: "192.168.0.0/16", NextHop: "20.20.20.20", Interface: "200GE-4/0/1"},
		{Label: 300030, Type: "ldp", Fec: "10.30.0.0/16", NextHop: "30.30.30.30", Interface: "100GE-5/0/0"},
		{Label: 300100, Type: "ldp", Fec: "203.0.113.0/24", NextHop: "10.10.10.10", Interface: "200GE-3/0/1"},
		{Label: 300200, Type: "ldp", Fec: "198.51.100.0/24", NextHop: "20.20.20.20", Interface: "200GE-4/0/1"},
		{Label: 300300, Type: "ldp", Fec: "198.18.0.0/15", NextHop: "12.12.12.12", Interface: "200GE-3/0/2"},
		
		// RSVP-TE Tunnel Labels (100000-199999 range)
		{Label: 100001, Type: "rsvp", Fec: "tunnel:NYC-to-LAX-Primary", NextHop: "4.4.4.4", Interface: "400GE-1/0/1"},
		{Label: 100002, Type: "rsvp", Fec: "tunnel:NYC-to-LAX-Backup", NextHop: "5.5.5.5", Interface: "400GE-1/0/2"},
		{Label: 100010, Type: "rsvp", Fec: "tunnel:LON-to-FRA-Express", NextHop: "12.12.12.12", Interface: "200GE-3/0/2"},
		{Label: 100020, Type: "rsvp", Fec: "tunnel:TOK-to-SIN-Ring", NextHop: "21.21.21.21", Interface: "400GE-4/0/2"},
		{Label: 100030, Type: "rsvp", Fec: "tunnel:SAO-to-BOG-Regional", NextHop: "31.31.31.31", Interface: "40GE-5/0/1"},
		{Label: 100040, Type: "rsvp", Fec: "tunnel:CAI-to-CPT-Africa", NextHop: "41.41.41.41", Interface: "40GE-6/0/1"},
		{Label: 100050, Type: "rsvp", Fec: "tunnel:DUB-to-IST-Gateway", NextHop: "51.51.51.51", Interface: "200GE-7/0/1"},
		{Label: 100100, Type: "rsvp", Fec: "tunnel:Emergency-Bypass-1", NextHop: "8.8.8.8", Interface: "200GE-0/0/5"},
		{Label: 100200, Type: "rsvp", Fec: "tunnel:Maintenance-Path", NextHop: "maintenance", Interface: "disabled"},
		
		// Service Labels (500000-599999 range)
		{Label: 500001, Type: "service", Fec: "L3VPN:Customer-Bank-VRF", NextHop: "4.4.4.4", Interface: "400GE-1/0/1"},
		{Label: 500002, Type: "service", Fec: "L3VPN:Tech-Corp-VRF", NextHop: "10.10.10.10", Interface: "200GE-3/0/1"},
		{Label: 500003, Type: "service", Fec: "L3VPN:Media-Company-VRF", NextHop: "20.20.20.20", Interface: "200GE-4/0/1"},
		{Label: 500010, Type: "service", Fec: "L2VPN:Banking-VPLS", NextHop: "4.4.4.4", Interface: "400GE-1/0/1"},
		{Label: 500020, Type: "service", Fec: "L2VPN:Retail-EVPN", NextHop: "12.12.12.12", Interface: "200GE-3/0/2"},
		{Label: 500100, Type: "service", Fec: "6PE:IPv6-over-MPLS", NextHop: "21.21.21.21", Interface: "400GE-4/0/2"},
		{Label: 500200, Type: "service", Fec: "Multicast:TV-Distribution", NextHop: "10.10.10.10", Interface: "200GE-3/0/1"},
		
		// Transport Labels (800000-899999 range)
		{Label: 800001, Type: "transport", Fec: "FlexE:400G-Slice-1", NextHop: "4.4.4.4", Interface: "400GE-1/0/1"},
		{Label: 800002, Type: "transport", Fec: "FlexE:400G-Slice-2", NextHop: "5.5.5.5", Interface: "400GE-1/0/2"},
		{Label: 800010, Type: "transport", Fec: "OTN:100G-ODU4", NextHop: "12.12.12.12", Interface: "200GE-3/0/2"},
		{Label: 800020, Type: "transport", Fec: "SDH:STM-64", NextHop: "old-equipment", Interface: "legacy"},
		
		// Special/Reserved Labels (0-15 range)
		{Label: 0, Type: "reserved", Fec: "IPv4-Explicit-Null", NextHop: "pop", Interface: "all"},
		{Label: 1, Type: "reserved", Fec: "Router-Alert", NextHop: "local", Interface: "control"},
		{Label: 2, Type: "reserved", Fec: "IPv6-Explicit-Null", NextHop: "pop", Interface: "all"},
		{Label: 3, Type: "reserved", Fec: "Implicit-Null", NextHop: "pop", Interface: "all"},
		{Label: 13, Type: "reserved", Fec: "Entropy-Label-Indicator", NextHop: "entropy", Interface: "all"},
		{Label: 14, Type: "reserved", Fec: "Entropy-Label", NextHop: "hash", Interface: "all"},
	}

	return TeTopologyResponse{
		Nodes:       nodes,
		Links:       links,
		SrPolicies:  srPolicies,
		BgpSessions: bgpSessions,
		MplsLabels:  mplsLabels,
	}
}

func (app *TeApp) handleSrPolicies(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	
	// Get detailed SR policy information
	policies := app.getSrPolicyDetails()
	json.NewEncoder(w).Encode(policies)
}

func (app *TeApp) getSrPolicyDetails() []map[string]interface{} {
	return []map[string]interface{}{
		// Ultra-Low Latency Gaming Policy
		{
			"id": "sr-ultra-low",
			"name": "Ultra-Low-Latency-Gaming",
			"endpoint": "20.20.20.20",
			"color": 100,
			"status": "up",
			"binding_sid": "1000100",
			"preference": 255,
			"paths": []map[string]interface{}{
				{"id": "primary", "weight": 100, "status": "active", "segments": []map[string]interface{}{
					{"type": "node", "sid": 16001, "node": "pe-nyc-01"},
					{"type": "node", "sid": 16004, "node": "p-dal-01"},
					{"type": "node", "sid": 16005, "node": "p-den-01"},
					{"type": "node", "sid": 16002, "node": "pe-lax-01"},
					{"type": "node", "sid": 18020, "node": "pe-tok-01"},
				}},
			},
			"metrics": map[string]interface{}{
				"packets_steered": 250000000,
				"bytes_steered": 25000000000,
				"packets_dropped": 125,
				"path_switches": 0,
				"avg_latency": 142,
				"jitter": 0.5,
			},
		},
		// Financial Trading Express Policy
		{
			"id": "sr-finance-ny-lon",
			"name": "Financial-Trading-Express",
			"endpoint": "10.10.10.10",
			"color": 150,
			"status": "up",
			"binding_sid": "1000150",
			"preference": 250,
			"paths": []map[string]interface{}{
				{"id": "submarine-direct", "weight": 90, "status": "active", "segments": []map[string]interface{}{
					{"type": "node", "sid": 16001, "node": "pe-nyc-01"},
					{"type": "node", "sid": 17010, "node": "pe-lon-01"},
				}},
				{"id": "backup-path", "weight": 10, "status": "standby", "segments": []map[string]interface{}{
					{"type": "node", "sid": 16001, "node": "pe-nyc-01"},
					{"type": "node", "sid": 16008, "node": "pe-tor-01"},
					{"type": "node", "sid": 17011, "node": "pe-par-01"},
					{"type": "node", "sid": 17010, "node": "pe-lon-01"},
				}},
			},
			"metrics": map[string]interface{}{
				"packets_steered": 450000000,
				"bytes_steered": 45000000000,
				"packets_dropped": 22,
				"path_switches": 3,
				"avg_latency": 76,
				"jitter": 0.1,
			},
		},
		// Global CDN Distribution Policy
		{
			"id": "sr-cdn-global",
			"name": "Global-CDN-Distribution",
			"endpoint": "21.21.21.21",
			"color": 200,
			"status": "up",
			"binding_sid": "1000200",
			"preference": 180,
			"paths": []map[string]interface{}{
				{"id": "asia-primary", "weight": 60, "status": "active", "segments": []map[string]interface{}{
					{"type": "node", "sid": 16002, "node": "pe-lax-01"},
					{"type": "node", "sid": 18020, "node": "pe-tok-01"},
					{"type": "node", "sid": 18021, "node": "pe-sin-01"},
				}},
				{"id": "oceania-path", "weight": 40, "status": "active", "segments": []map[string]interface{}{
					{"type": "node", "sid": 16002, "node": "pe-lax-01"},
					{"type": "node", "sid": 18025, "node": "pe-syd-01"},
				}},
			},
			"metrics": map[string]interface{}{
				"packets_steered": 1200000000,
				"bytes_steered": 120000000000,
				"packets_dropped": 58000,
				"path_switches": 12,
				"avg_latency": 185,
				"jitter": 2.3,
			},
		},
		// Corporate VPN Primary Policy
		{
			"id": "sr-corp-primary",
			"name": "Corporate-VPN-Primary",
			"endpoint": "50.50.50.50",
			"color": 300,
			"status": "up",
			"binding_sid": "1000300",
			"preference": 160,
			"paths": []map[string]interface{}{
				{"id": "direct-gulf", "weight": 70, "status": "active", "segments": []map[string]interface{}{
					{"type": "node", "sid": 16001, "node": "pe-nyc-01"},
					{"type": "node", "sid": 16007, "node": "asbr-mia-01"},
					{"type": "node", "sid": 19050, "node": "pe-dub-01"},
				}},
				{"id": "europe-route", "weight": 30, "status": "standby", "segments": []map[string]interface{}{
					{"type": "node", "sid": 16001, "node": "pe-nyc-01"},
					{"type": "node", "sid": 17010, "node": "pe-lon-01"},
					{"type": "node", "sid": 17012, "node": "p-fra-01"},
					{"type": "node", "sid": 19050, "node": "pe-dub-01"},
				}},
			},
			"metrics": map[string]interface{}{
				"packets_steered": 320000000,
				"bytes_steered": 32000000000,
				"packets_dropped": 1600,
				"path_switches": 8,
				"avg_latency": 95,
				"jitter": 1.2,
			},
		},
		// Africa Gateway Service Policy
		{
			"id": "sr-africa-gateway",
			"name": "Africa-Gateway-Service",
			"endpoint": "41.41.41.41",
			"color": 550,
			"status": "up",
			"binding_sid": "1000550",
			"preference": 90,
			"paths": []map[string]interface{}{
				{"id": "lon-cai-cpt", "weight": 100, "status": "active", "segments": []map[string]interface{}{
					{"type": "node", "sid": 17010, "node": "pe-lon-01"},
					{"type": "node", "sid": 19040, "node": "pe-cai-01"},
					{"type": "node", "sid": 19041, "node": "pe-cpt-01"},
				}},
			},
			"metrics": map[string]interface{}{
				"packets_steered": 280000000,
				"bytes_steered": 28000000000,
				"packets_dropped": 14000,
				"path_switches": 15,
				"avg_latency": 168,
				"jitter": 8.5,
			},
		},
		// Research Network Slice Policy
		{
			"id": "sr-research-net",
			"name": "Research-Network-Slice",
			"endpoint": "14.14.14.14",
			"color": 750,
			"status": "up",
			"binding_sid": "1000750",
			"preference": 60,
			"paths": []map[string]interface{}{
				{"id": "research-path", "weight": 100, "status": "active", "segments": []map[string]interface{}{
					{"type": "node", "sid": 17014, "node": "rr-zur-01"},
					{"type": "node", "sid": 17012, "node": "p-fra-01"},
					{"type": "node", "sid": 17010, "node": "pe-lon-01"},
				}},
			},
			"metrics": map[string]interface{}{
				"packets_steered": 55000000,
				"bytes_steered": 5500000000,
				"packets_dropped": 275,
				"path_switches": 2,
				"avg_latency": 28,
				"jitter": 0.8,
			},
		},
		// Failed Maintenance Policy
		{
			"id": "sr-maintenance",
			"name": "Under-Maintenance-Policy",
			"endpoint": "13.13.13.13",
			"color": 999,
			"status": "down",
			"binding_sid": "1000999",
			"preference": 10,
			"paths": []map[string]interface{}{
				{"id": "maintenance-path", "weight": 0, "status": "failed", "segments": []map[string]interface{}{
					{"type": "node", "sid": 17013, "node": "p-ams-01"},
					{"type": "node", "sid": 17014, "node": "rr-zur-01"},
				}},
			},
			"metrics": map[string]interface{}{
				"packets_steered": 0,
				"bytes_steered": 0,
				"packets_dropped": 0,
				"path_switches": 0,
				"avg_latency": 999,
				"jitter": 999,
			},
		},
	}
}

func (app *TeApp) handleBgpSessions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	
	sessions := app.getBgpSessionDetails()
	json.NewEncoder(w).Encode(sessions)
}

func (app *TeApp) getBgpSessionDetails() []map[string]interface{} {
	return []map[string]interface{}{
		{
			"peer_ip": "2.2.2.2",
			"peer_as": 65001,
			"state": "established",
			"uptime": 86400,
			"routes_received": 150000,
			"routes_sent": 148000,
			"type": "ibgp",
			"local_preference": 100,
			"multi_exit_discriminator": 0,
			"next_hop_self": true,
			"route_reflector_client": false,
		},
		{
			"peer_ip": "192.168.1.1",
			"peer_as": 65002,
			"state": "established",
			"uptime": 432000,
			"routes_received": 75000,
			"routes_sent": 50000,
			"type": "ebgp",
			"local_preference": 0,
			"multi_exit_discriminator": 10,
			"next_hop_self": false,
			"route_reflector_client": false,
		},
	}
}

func (app *TeApp) handleMplsLabels(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	
	labels := app.getMplsLabelDetails()
	json.NewEncoder(w).Encode(labels)
}

func (app *TeApp) getMplsLabelDetails() []map[string]interface{} {
	return []map[string]interface{}{
		{
			"incoming_label": 16002,
			"outgoing_label": 16002,
			"fec": "2.2.2.2/32",
			"next_hop": "3.3.3.3",
			"outgoing_interface": "ge-0/0/1",
			"type": "sr-node",
			"operation": "swap",
			"bytes_switched": 15000000000,
			"packets_switched": 150000000,
		},
		{
			"incoming_label": 24000,
			"outgoing_label": 0,
			"fec": "adj:ge-0/0/1->3.3.3.3",
			"next_hop": "3.3.3.3",
			"outgoing_interface": "ge-0/0/1",
			"type": "sr-adj",
			"operation": "pop",
			"bytes_switched": 8500000000,
			"packets_switched": 85000000,
		},
	}
}

func (app *TeApp) handleTeTunnels(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	
	tunnels := app.getTeTunnelDetails()
	json.NewEncoder(w).Encode(tunnels)
}

func (app *TeApp) getTeTunnelDetails() []map[string]interface{} {
	return []map[string]interface{}{
		// Trans-Continental Primary Tunnels
		{
			"tunnel_id": "tunnel-te-001",
			"name": "NYC-to-LAX-Primary-400G",
			"source": "1.1.1.1",
			"destination": "2.2.2.2",
			"status": "up",
			"bandwidth": 400000000000,
			"setup_priority": 0,
			"hold_priority": 0,
			"explicit_path": []string{"4.4.4.4", "5.5.5.5", "2.2.2.2"},
			"type": "p2p",
			"admin_groups": ["core-links", "high-capacity"],
			"affinity_bits": "0x01",
			"lsps": []map[string]interface{}{
				{
					"lsp_id": "lsp-001-primary",
					"status": "active",
					"bandwidth": 400000000000,
					"path_hops": []string{"1.1.1.1", "4.4.4.4", "5.5.5.5", "2.2.2.2"},
					"rsvp_labels": []uint32{100001, 100002, 100003},
					"setup_time": 245,
					"metrics": map[string]interface{}{
						"packets_sent": 2500000000,
						"bytes_sent": 275000000000000,
						"packets_received": 2485000000,
						"bytes_received": 273350000000000,
						"setup_time": 245,
						"flap_count": 0,
					},
				},
			},
			"metrics": map[string]interface{}{
				"packets_sent": 2500000000,
				"bytes_sent": 275000000000000,
				"packets_received": 2485000000,
				"bytes_received": 273350000000000,
				"setup_time": 245,
				"last_flap_time": 0,
				"flap_count": 0,
				"utilization": 73,
				"fast_reroute_enabled": true,
			},
		},
		// Trans-Atlantic Submarine Cable Tunnel
		{
			"tunnel_id": "tunnel-te-002",
			"name": "NYC-to-LON-Express-Submarine",
			"source": "1.1.1.1",
			"destination": "10.10.10.10",
			"status": "up",
			"bandwidth": 400000000000,
			"setup_priority": 1,
			"hold_priority": 1,
			"explicit_path": []string{"10.10.10.10"},
			"type": "p2p",
			"admin_groups": ["submarine-cables", "tier1-links"],
			"affinity_bits": "0x02",
			"lsps": []map[string]interface{}{
				{
					"lsp_id": "lsp-002-submarine",
					"status": "active",
					"bandwidth": 400000000000,
					"path_hops": []string{"1.1.1.1", "10.10.10.10"},
					"rsvp_labels": []uint32{100010, 100011},
					"setup_time": 892,
					"metrics": map[string]interface{}{
						"packets_sent": 1850000000,
						"bytes_sent": 312000000000000,
						"packets_received": 1820000000,
						"bytes_received": 307400000000000,
						"setup_time": 892,
						"flap_count": 2,
					},
				},
			},
			"metrics": map[string]interface{}{
				"packets_sent": 1850000000,
				"bytes_sent": 312000000000000,
				"packets_received": 1820000000,
				"bytes_received": 307400000000000,
				"setup_time": 892,
				"last_flap_time": 1640995200,
				"flap_count": 2,
				"utilization": 78,
				"fast_reroute_enabled": true,
			},
		},
		// Trans-Pacific High-Latency Tunnel
		{
			"tunnel_id": "tunnel-te-003",
			"name": "LAX-to-TOK-Pacific-Crossing",
			"source": "2.2.2.2",
			"destination": "20.20.20.20",
			"status": "up",
			"bandwidth": 400000000000,
			"setup_priority": 2,
			"hold_priority": 2,
			"explicit_path": []string{"20.20.20.20"},
			"type": "p2p",
			"admin_groups": ["transpacific", "long-haul"],
			"affinity_bits": "0x04",
			"lsps": []map[string]interface{}{
				{
					"lsp_id": "lsp-003-pacific",
					"status": "active",
					"bandwidth": 400000000000,
					"path_hops": []string{"2.2.2.2", "20.20.20.20"},
					"rsvp_labels": []uint32{100020, 100021},
					"setup_time": 1542,
					"metrics": map[string]interface{}{
						"packets_sent": 2200000000,
						"bytes_sent": 328000000000000,
						"packets_received": 2156000000,
						"bytes_received": 321440000000000,
						"setup_time": 1542,
						"flap_count": 5,
					},
				},
			},
			"metrics": map[string]interface{}{
				"packets_sent": 2200000000,
				"bytes_sent": 328000000000000,
				"packets_received": 2156000000,
				"bytes_received": 321440000000000,
				"setup_time": 1542,
				"last_flap_time": 1640908800,
				"flap_count": 5,
				"utilization": 82,
				"fast_reroute_enabled": true,
			},
		},
		// Regional European Tunnel
		{
			"tunnel_id": "tunnel-te-010",
			"name": "LON-to-FRA-Regional-Express",
			"source": "10.10.10.10",
			"destination": "12.12.12.12",
			"status": "up",
			"bandwidth": 200000000000,
			"setup_priority": 3,
			"hold_priority": 3,
			"explicit_path": []string{"12.12.12.12"},
			"type": "p2p",
			"admin_groups": ["european-backbone"],
			"affinity_bits": "0x08",
			"lsps": []map[string]interface{}{
				{
					"lsp_id": "lsp-010-regional",
					"status": "active",
					"bandwidth": 200000000000,
					"path_hops": []string{"10.10.10.10", "12.12.12.12"},
					"rsvp_labels": []uint32{100030, 100031},
					"setup_time": 156,
					"metrics": map[string]interface{}{
						"packets_sent": 890000000,
						"bytes_sent": 134000000000000,
						"packets_received": 875000000,
						"bytes_received": 131750000000000,
						"setup_time": 156,
						"flap_count": 1,
					},
				},
			},
			"metrics": map[string]interface{}{
				"packets_sent": 890000000,
				"bytes_sent": 134000000000000,
				"packets_received": 875000000,
				"bytes_received": 131750000000000,
				"setup_time": 156,
				"last_flap_time": 1640822400,
				"flap_count": 1,
				"utilization": 67,
				"fast_reroute_enabled": true,
			},
		},
		// Asia-Pacific Ring Tunnel
		{
			"tunnel_id": "tunnel-te-020",
			"name": "TOK-to-SIN-APAC-Ring",
			"source": "20.20.20.20",
			"destination": "21.21.21.21",
			"status": "up",
			"bandwidth": 200000000000,
			"setup_priority": 4,
			"hold_priority": 4,
			"explicit_path": []string{"22.22.22.22", "21.21.21.21"},
			"type": "p2p",
			"admin_groups": ["apac-ring", "high-bandwidth"],
			"affinity_bits": "0x10",
			"lsps": []map[string]interface{}{
				{
					"lsp_id": "lsp-020-ring",
					"status": "active",
					"bandwidth": 200000000000,
					"path_hops": []string{"20.20.20.20", "22.22.22.22", "21.21.21.21"},
					"rsvp_labels": []uint32{100040, 100041, 100042},
					"setup_time": 425,
					"metrics": map[string]interface{}{
						"packets_sent": 650000000,
						"bytes_sent": 142000000000000,
						"packets_received": 640000000,
						"bytes_received": 139800000000000,
						"setup_time": 425,
						"flap_count": 3,
					},
				},
			},
			"metrics": map[string]interface{}{
				"packets_sent": 650000000,
				"bytes_sent": 142000000000000,
				"packets_received": 640000000,
				"bytes_received": 139800000000000,
				"setup_time": 425,
				"last_flap_time": 1640736000,
				"flap_count": 3,
				"utilization": 71,
				"fast_reroute_enabled": true,
			},
		},
		// Problematic Tunnel - High Flapping
		{
			"tunnel_id": "tunnel-te-030",
			"name": "SAO-to-BOG-Unstable-Link",
			"source": "30.30.30.30",
			"destination": "31.31.31.31",
			"status": "warning",
			"bandwidth": 40000000000,
			"setup_priority": 6,
			"hold_priority": 6,
			"explicit_path": []string{"31.31.31.31"},
			"type": "p2p",
			"admin_groups": ["latam-regional"],
			"affinity_bits": "0x20",
			"lsps": []map[string]interface{}{
				{
					"lsp_id": "lsp-030-unstable",
					"status": "flapping",
					"bandwidth": 40000000000,
					"path_hops": []string{"30.30.30.30", "31.31.31.31"},
					"rsvp_labels": []uint32{100050, 100051},
					"setup_time": 245,
					"metrics": map[string]interface{}{
						"packets_sent": 125000000,
						"bytes_sent": 15200000000000,
						"packets_received": 98000000,
						"bytes_received": 11936000000000,
						"setup_time": 245,
						"flap_count": 45,
					},
				},
			},
			"metrics": map[string]interface{}{
				"packets_sent": 125000000,
				"bytes_sent": 15200000000000,
				"packets_received": 98000000,
				"bytes_received": 11936000000000,
				"setup_time": 245,
				"last_flap_time": 1641001200,
				"flap_count": 45,
				"utilization": 88,
				"fast_reroute_enabled": false,
			},
		},
		// Failed Tunnel - Maintenance
		{
			"tunnel_id": "tunnel-te-999",
			"name": "AMS-to-ZUR-Maintenance-Path",
			"source": "13.13.13.13",
			"destination": "14.14.14.14",
			"status": "down",
			"bandwidth": 0,
			"setup_priority": 7,
			"hold_priority": 7,
			"explicit_path": []string{"14.14.14.14"},
			"type": "p2p",
			"admin_groups": ["maintenance"],
			"affinity_bits": "0x80",
			"lsps": []map[string]interface{}{
				{
					"lsp_id": "lsp-999-failed",
					"status": "down",
					"bandwidth": 0,
					"path_hops": []string{},
					"rsvp_labels": []uint32{},
					"setup_time": 0,
					"metrics": map[string]interface{}{
						"packets_sent": 0,
						"bytes_sent": 0,
						"packets_received": 0,
						"bytes_received": 0,
						"setup_time": 0,
						"flap_count": 0,
					},
				},
			},
			"metrics": map[string]interface{}{
				"packets_sent": 0,
				"bytes_sent": 0,
				"packets_received": 0,
				"bytes_received": 0,
				"setup_time": 0,
				"last_flap_time": 1640822400,
				"flap_count": 0,
				"utilization": 0,
				"fast_reroute_enabled": false,
			},
		},
		// Emergency Bypass Tunnel
		{
			"tunnel_id": "tunnel-te-emr-01",
			"name": "Emergency-Bypass-Global",
			"source": "1.1.1.1",
			"destination": "20.20.20.20",
			"status": "standby",
			"bandwidth": 100000000000,
			"setup_priority": 0,
			"hold_priority": 7,
			"explicit_path": []string{"10.10.10.10", "12.12.12.12", "50.50.50.50", "20.20.20.20"},
			"type": "p2p",
			"admin_groups": ["emergency", "backup-path"],
			"affinity_bits": "0x40",
			"lsps": []map[string]interface{}{
				{
					"lsp_id": "lsp-emr-01-backup",
					"status": "standby",
					"bandwidth": 100000000000,
					"path_hops": []string{"1.1.1.1", "10.10.10.10", "12.12.12.12", "50.50.50.50", "20.20.20.20"},
					"rsvp_labels": []uint32{100100, 100101, 100102, 100103, 100104},
					"setup_time": 2245,
					"metrics": map[string]interface{}{
						"packets_sent": 1500000,
						"bytes_sent": 180000000000,
						"packets_received": 1485000,
						"bytes_received": 178200000000,
						"setup_time": 2245,
						"flap_count": 0,
					},
				},
			},
			"metrics": map[string]interface{}{
				"packets_sent": 1500000,
				"bytes_sent": 180000000000,
				"packets_received": 1485000,
				"bytes_received": 178200000000,
				"setup_time": 2245,
				"last_flap_time": 0,
				"flap_count": 0,
				"utilization": 21,
				"fast_reroute_enabled": false,
			},
		},
	}
}