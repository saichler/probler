# Probler - Network Automation & Monitoring Platform

[![Go Version](https://img.shields.io/badge/Go-1.23.8-blue.svg)](https://golang.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-green.svg)](https://kubernetes.io/)

A comprehensive microservices-based network automation and monitoring platform that implements a "data as a service" approach with the core philosophy: **Poll → Parse → Model → Cache → Persist**.

## 🎯 Vision

Probler addresses the fundamental pain points of building scalable, maintainable microservices architectures by providing:

- **Model-agnostic services** that adapt to any data structure
- **Seamless service-to-service communication** through virtual networking
- **Built-in security, health monitoring, and service discovery**
- **Horizontal and vertical scaling capabilities**
- **Platform-agnostic deployment** (bare metal, Docker, Kubernetes)

## 🏗️ Architecture Overview

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Collector    │───▶│     Parser      │───▶│   Inventory     │
│  (Data Polling) │    │ (Model-Agnostic)│    │ (Device State)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      VNet       │◀───│      ORM        │───▶│   PostgreSQL    │
│ (Web Interface) │    │ (Persistence)   │    │   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Microservices

| Service | Purpose | Scaling |
|---------|---------|---------|
| **Collector** | Network device polling & data collection | Horizontal |
| **Parser** | Model-agnostic data parsing & transformation | Horizontal |
| **Inventory Box** | Network device inventory management | Vertical |
| **Inventory K8s** | Kubernetes cluster inventory | Vertical |
| **ORM** | Object-relational mapping & persistence | Vertical |
| **VNet** | Virtual network overlay & web interface | Vertical |
| **TE App** | Traffic Engineering & SR policies management | Vertical |
| **Security** | Authentication & authorization | Vertical |

## 🚀 Quick Start

### Prerequisites

- Go 1.23.8+
- Docker & Docker Compose
- Kubernetes cluster (for production deployment)
- PostgreSQL database

### Local Development

```bash
# Clone the repository
git clone https://github.com/saichler/probler.git
cd probler

# Build all services
cd go && ./build-images.sh

# Start with Docker Compose (development)
docker-compose up -d

# Access the web interface
open https://localhost:443/probler/
```

### Kubernetes Deployment

```bash
# Deploy all services to Kubernetes
cd k8s && ./apply-all.sh

# Verify deployment
kubectl get pods -n probler

# Access via ingress or port-forward
kubectl port-forward svc/vnet 8080:443 -n probler
```

## 🌐 Web Interface

### Network Operations Center (NOC) Dashboard

The web interface provides comprehensive network monitoring and management:

#### 📊 **Dashboard**
- Real-time device statistics and health metrics
- Critical alarm monitoring
- Network performance overview
- Interactive stat cards with filtering

#### 🗺️ **Network Topology** 
- Interactive world map with device visualization
- Click-able network links with detailed properties
- Geographic device positioning with precise coordinates
- Real-time link status and bandwidth utilization
- Zoom, pan, and link toggle controls

#### 🖥️ **Device Management**
- Comprehensive device inventory
- Detailed hardware and performance metrics
- Multi-tab device details (Basic Info, Hardware, Performance, Physical)
- SNMP-based monitoring and status tracking

#### 🚨 **Alarm & Fault Management**
- Real-time alarm aggregation and correlation
- Severity-based filtering and prioritization
- Historical alarm tracking and trends

#### 🔧 **Additional Applications**
- **Bandwidth Monitor**: Real-time traffic analysis
- **Config Manager**: Device configuration management
- **Traffic Engineering**: Advanced MPLS & SR policy management
  - Interactive global network topology visualization
  - Segment Routing (SR) policy configuration and monitoring
  - BGP session management and analytics
  - MPLS label distribution and switching statistics
  - Real-time traffic engineering metrics and performance
- **Security Center**: Network security monitoring
- **Reports**: Comprehensive analytics and reporting
- **Automation Hub**: Workflow automation platform

### Authentication

- **Default Credentials**: `admin / admin`
- **Role-based access control**
- **Session management with timeout**

### 🔄 Traffic Engineering & MPLS

The **TE App** provides advanced traffic engineering capabilities for MPLS and Segment Routing (SR) networks:

#### **Network Topology Visualization**
- **Global Map Integration**: Interactive world map with precise device positioning
- **Multi-AS Support**: Visualization of complex multi-AS networks
- **Real-time Status**: Live device and link status monitoring
- **Zoom & Pan**: Full interactive controls for detailed network exploration

#### **Segment Routing (SR) Policies**
- **SR Policy Management**: Create, monitor, and modify SR policies
- **Path Visualization**: Interactive path highlighting on network topology
- **Traffic Metrics**: Real-time traffic steering and performance statistics
- **Preference & Color**: Full SR policy preference and color management
- **Multi-path Support**: Support for primary, backup, and load-balanced paths

#### **BGP Session Analytics**
- **Session Monitoring**: Comprehensive iBGP and eBGP session tracking
- **Route Analytics**: Detailed route advertisement and reception metrics
- **Peer Relationship Mapping**: Visual representation of BGP peer relationships
- **Internet Exchange Integration**: IXP session monitoring and route analysis

#### **MPLS Label Management**
- **Label Database**: Complete MPLS forwarding information base (FIB)
- **SR Node Labels**: Segment routing node SID management (16000-23999 range)
- **SR Adjacency Labels**: Adjacency SID tracking (24000-31999 range)
- **Service Labels**: L3VPN, L2VPN, and 6PE service label management
- **RSVP-TE Support**: Traditional RSVP-TE tunnel label management

## 🏷️ Technology Stack

### Backend
- **Go 1.23.8** - Primary backend language
- **Layer8 Framework** - Custom networking and service communication
- **gRPC/Protocol Buffers** - Service communication
- **PostgreSQL** - Data persistence
- **SNMP (gosnmp)** - Network device polling
- **REST APIs** - Traffic engineering data endpoints

### Frontend
- **Vanilla JavaScript** - No framework dependencies
- **CSS3 with CSS Grid & Flexbox** - Modern responsive design
- **SVG Graphics** - Interactive network topology
- **WebSocket** - Real-time data updates
- **Traffic Engineering Visualization** - Advanced MPLS/SR policy rendering

### Infrastructure
- **Docker** - Containerization
- **Kubernetes** - Container orchestration
- **StatefulSets** - For stateful services
- **DaemonSets** - For network overlay

## 📁 Project Structure

```
probler/
├── go/                          # Go microservices
│   ├── prob/
│   │   ├── collector/          # Data collection service
│   │   ├── parser/             # Data parsing service
│   │   ├── inv_box/            # Network inventory
│   │   ├── inv_k8s/            # K8s inventory
│   │   ├── orm/                # ORM service
│   │   ├── vnet/               # Virtual network & web UI
│   │   ├── te_app/             # Traffic Engineering application
│   │   ├── security/           # Security service
│   │   └── prctl/              # CLI control tool
│   ├── go.mod                  # Go module definition
│   └── build-images.sh         # Docker build script
├── k8s/                        # Kubernetes manifests
│   ├── apply-all.sh           # Deployment script
│   ├── delete-all.sh          # Cleanup script
│   ├── te_app.yaml            # Traffic Engineering service
│   └── *.yaml                 # Service configurations
├── proto/                      # Protocol buffer definitions
├── builder/                    # Docker build configurations
├── coordinate_calculator.py    # Device geographic positioning utility
├── coordinate_validator.py     # Position validation & verification
├── deploy-script.sh            # Automated deployment script
└── README.md                  # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_HOST` | Database host | `localhost` |
| `POSTGRES_PORT` | Database port | `5432` |
| `POSTGRES_DB` | Database name | `probler` |
| `VNET_PORT` | Web interface port | `443` |
| `LOG_LEVEL` | Logging level | `INFO` |

### Service Configuration

Services are configured through:
- **Environment variables** in Kubernetes ConfigMaps
- **Command-line flags** for local development
- **Default configurations** in `/go/prob/common/defaults.go`

## 🔍 Monitoring & Observability

### Health Checks
- **Service health endpoints** on all services
- **Kubernetes readiness and liveness probes**
- **Automatic leader election** for stateful services

### Logging
- **Structured logging** with configurable levels
- **Centralized log aggregation** via Kubernetes
- **Request tracing** across service boundaries

### Metrics
- **Performance metrics** exposed via web interface
- **Device health monitoring** with SNMP polling
- **Network topology health** and link status

## 🚀 Scaling & Performance

### Horizontal Scaling
- **Collectors**: Scale based on device count and polling frequency
- **Parsers**: Scale based on data processing volume
- **Stateless services** can be replicated as needed

### Vertical Scaling
- **Inventory services**: Scale by service areas and sharding
- **Database connections**: Configurable connection pooling
- **Memory optimization** through delta updates and caching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- **Go code** follows standard Go conventions
- **Tests** should accompany all new features
- **Documentation** should be updated for API changes
- **Commit messages** should be descriptive and clear

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Documentation

### Getting Help
- **Issues**: Report bugs and request features via GitHub Issues
- **Documentation**: Check the `/docs` directory for detailed guides
- **Code Examples**: See `/examples` for integration samples

### API Documentation
- **REST API**: Available at `https://<host>/api/docs`
- **gRPC Services**: Protocol buffer definitions in `/proto`
- **Web Interface**: Built-in help and tooltips

## 🎯 Use Cases

### Network Operations Centers (NOCs)
- **Real-time monitoring** of network infrastructure
- **Fault management** and alarm correlation
- **Performance tracking** and capacity planning
- **Traffic engineering** and path optimization

### Service Provider Networks
- **MPLS VPN Service Management**: Complete L3VPN and L2VPN lifecycle management
- **Segment Routing Deployment**: Modern SR policy configuration and monitoring
- **BGP Route Engineering**: Advanced route policy management and optimization
- **Network Planning**: Capacity planning and traffic forecasting tools

### Cloud Infrastructure Management
- **Kubernetes cluster monitoring**
- **Service discovery** and health tracking
- **Automated scaling** based on metrics

### DevOps & Site Reliability Engineering
- **Infrastructure as Code** with model-agnostic services
- **Automated remediation** through workflow engine
- **Compliance monitoring** and reporting

---

**Probler** - Making microservices painless, one service at a time.