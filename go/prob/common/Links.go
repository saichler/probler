package common

const (
	Collector_Service_Name = "Coll"
	Collector_Service_Area = byte(0)

	NetworkDevice_Links_ID      = "NetDev"
	NetDev_Cache_Service_Name   = "NCache"
	NetDev_Cache_Service_Area   = byte(0)
	NetDev_Persist_Service_Name = "NPersist"
	NetDev_Persist_Service_Area = byte(0)
	NetDev_Parser_Service_Name  = "NPars"
	NetDev_Parser_Service_Area  = byte(0)

	K8s_Links_ID             = "K8s"
	K8s_Cache_Service_Name   = "KCache"
	K8s_Cache_Service_Area   = byte(1)
	K8s_Persist_Service_Name = "KPersist"
	K8s_Persist_Service_Area = byte(1)
	K8s_Parser_Service_Name  = "KPars"
	K8s_Parser_Service_Area  = byte(1)
)

type Links struct{}

func (this *Links) Collector(linkid string) (string, byte) {
	return Collector_Service_Name, Collector_Service_Area
}

func (this *Links) Parser(linkid string) (string, byte) {
	switch linkid {
	case NetworkDevice_Links_ID:
		return NetDev_Parser_Service_Name, NetDev_Parser_Service_Area
	case K8s_Links_ID:
		return K8s_Parser_Service_Name, K8s_Parser_Service_Area
	}
	return "", 0
}

func (this *Links) Cache(linkid string) (string, byte) {
	switch linkid {
	case NetworkDevice_Links_ID:
		return NetDev_Cache_Service_Name, NetDev_Cache_Service_Area
	case K8s_Links_ID:
		return K8s_Cache_Service_Name, K8s_Cache_Service_Area
	}
	return "", 0
}

func (this *Links) Persist(linkid string) (string, byte) {
	switch linkid {
	case NetworkDevice_Links_ID:
		return NetDev_Persist_Service_Name, NetDev_Persist_Service_Area
	case K8s_Links_ID:
		return K8s_Persist_Service_Name, K8s_Persist_Service_Area
	}
	return "", 0
}
