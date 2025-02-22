// Code generated by protoc-gen-go. DO NOT EDIT.
// versions:
// 	protoc-gen-go v1.32.0
// 	protoc        v3.21.12
// source: k8s.proto

package types

import (
	protoreflect "google.golang.org/protobuf/reflect/protoreflect"
	protoimpl "google.golang.org/protobuf/runtime/protoimpl"
	reflect "reflect"
	sync "sync"
)

const (
	// Verify that this generated code is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(20 - protoimpl.MinVersion)
	// Verify that runtime/protoimpl is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(protoimpl.MaxVersion - 20)
)

type PodStatus int32

const (
	PodStatus_Invalid_Pod_Status PodStatus = 0
	PodStatus_Running            PodStatus = 1
)

// Enum value maps for PodStatus.
var (
	PodStatus_name = map[int32]string{
		0: "Invalid_Pod_Status",
		1: "Running",
	}
	PodStatus_value = map[string]int32{
		"Invalid_Pod_Status": 0,
		"Running":            1,
	}
)

func (x PodStatus) Enum() *PodStatus {
	p := new(PodStatus)
	*p = x
	return p
}

func (x PodStatus) String() string {
	return protoimpl.X.EnumStringOf(x.Descriptor(), protoreflect.EnumNumber(x))
}

func (PodStatus) Descriptor() protoreflect.EnumDescriptor {
	return file_k8s_proto_enumTypes[0].Descriptor()
}

func (PodStatus) Type() protoreflect.EnumType {
	return &file_k8s_proto_enumTypes[0]
}

func (x PodStatus) Number() protoreflect.EnumNumber {
	return protoreflect.EnumNumber(x)
}

// Deprecated: Use PodStatus.Descriptor instead.
func (PodStatus) EnumDescriptor() ([]byte, []int) {
	return file_k8s_proto_rawDescGZIP(), []int{0}
}

type NodeStatus int32

const (
	NodeStatus_Invalid_Node_Status NodeStatus = 0
	NodeStatus_Ready               NodeStatus = 1
)

// Enum value maps for NodeStatus.
var (
	NodeStatus_name = map[int32]string{
		0: "Invalid_Node_Status",
		1: "Ready",
	}
	NodeStatus_value = map[string]int32{
		"Invalid_Node_Status": 0,
		"Ready":               1,
	}
)

func (x NodeStatus) Enum() *NodeStatus {
	p := new(NodeStatus)
	*p = x
	return p
}

func (x NodeStatus) String() string {
	return protoimpl.X.EnumStringOf(x.Descriptor(), protoreflect.EnumNumber(x))
}

func (NodeStatus) Descriptor() protoreflect.EnumDescriptor {
	return file_k8s_proto_enumTypes[1].Descriptor()
}

func (NodeStatus) Type() protoreflect.EnumType {
	return &file_k8s_proto_enumTypes[1]
}

func (x NodeStatus) Number() protoreflect.EnumNumber {
	return protoreflect.EnumNumber(x)
}

// Deprecated: Use NodeStatus.Descriptor instead.
func (NodeStatus) EnumDescriptor() ([]byte, []int) {
	return file_k8s_proto_rawDescGZIP(), []int{1}
}

type ReadyState struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Count int32 `protobuf:"varint,1,opt,name=count,proto3" json:"count,omitempty"`
	Outof int32 `protobuf:"varint,2,opt,name=outof,proto3" json:"outof,omitempty"`
}

func (x *ReadyState) Reset() {
	*x = ReadyState{}
	if protoimpl.UnsafeEnabled {
		mi := &file_k8s_proto_msgTypes[0]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *ReadyState) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ReadyState) ProtoMessage() {}

func (x *ReadyState) ProtoReflect() protoreflect.Message {
	mi := &file_k8s_proto_msgTypes[0]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use ReadyState.ProtoReflect.Descriptor instead.
func (*ReadyState) Descriptor() ([]byte, []int) {
	return file_k8s_proto_rawDescGZIP(), []int{0}
}

func (x *ReadyState) GetCount() int32 {
	if x != nil {
		return x.Count
	}
	return 0
}

func (x *ReadyState) GetOutof() int32 {
	if x != nil {
		return x.Outof
	}
	return 0
}

type RestartsState struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Count int32  `protobuf:"varint,1,opt,name=count,proto3" json:"count,omitempty"`
	Ago   string `protobuf:"bytes,2,opt,name=ago,proto3" json:"ago,omitempty"`
}

func (x *RestartsState) Reset() {
	*x = RestartsState{}
	if protoimpl.UnsafeEnabled {
		mi := &file_k8s_proto_msgTypes[1]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *RestartsState) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*RestartsState) ProtoMessage() {}

func (x *RestartsState) ProtoReflect() protoreflect.Message {
	mi := &file_k8s_proto_msgTypes[1]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use RestartsState.ProtoReflect.Descriptor instead.
func (*RestartsState) Descriptor() ([]byte, []int) {
	return file_k8s_proto_rawDescGZIP(), []int{1}
}

func (x *RestartsState) GetCount() int32 {
	if x != nil {
		return x.Count
	}
	return 0
}

func (x *RestartsState) GetAgo() string {
	if x != nil {
		return x.Ago
	}
	return ""
}

type Cluster struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Name  string           `protobuf:"bytes,1,opt,name=name,proto3" json:"name,omitempty"`
	Nodes map[string]*Node `protobuf:"bytes,2,rep,name=nodes,proto3" json:"nodes,omitempty" protobuf_key:"bytes,1,opt,name=key,proto3" protobuf_val:"bytes,2,opt,name=value,proto3"`
	Pods  map[string]*Pod  `protobuf:"bytes,3,rep,name=pods,proto3" json:"pods,omitempty" protobuf_key:"bytes,1,opt,name=key,proto3" protobuf_val:"bytes,2,opt,name=value,proto3"`
}

func (x *Cluster) Reset() {
	*x = Cluster{}
	if protoimpl.UnsafeEnabled {
		mi := &file_k8s_proto_msgTypes[2]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *Cluster) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Cluster) ProtoMessage() {}

func (x *Cluster) ProtoReflect() protoreflect.Message {
	mi := &file_k8s_proto_msgTypes[2]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use Cluster.ProtoReflect.Descriptor instead.
func (*Cluster) Descriptor() ([]byte, []int) {
	return file_k8s_proto_rawDescGZIP(), []int{2}
}

func (x *Cluster) GetName() string {
	if x != nil {
		return x.Name
	}
	return ""
}

func (x *Cluster) GetNodes() map[string]*Node {
	if x != nil {
		return x.Nodes
	}
	return nil
}

func (x *Cluster) GetPods() map[string]*Pod {
	if x != nil {
		return x.Pods
	}
	return nil
}

type Pod struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Namespace      string         `protobuf:"bytes,1,opt,name=namespace,proto3" json:"namespace,omitempty"`
	Name           string         `protobuf:"bytes,2,opt,name=name,proto3" json:"name,omitempty"`
	Ready          *ReadyState    `protobuf:"bytes,3,opt,name=ready,proto3" json:"ready,omitempty"`
	Status         PodStatus      `protobuf:"varint,4,opt,name=status,proto3,enum=types.PodStatus" json:"status,omitempty"`
	Restarts       *RestartsState `protobuf:"bytes,5,opt,name=restarts,proto3" json:"restarts,omitempty"`
	Age            string         `protobuf:"bytes,6,opt,name=age,proto3" json:"age,omitempty"`
	Ip             string         `protobuf:"bytes,7,opt,name=ip,proto3" json:"ip,omitempty"`
	Node           string         `protobuf:"bytes,8,opt,name=node,proto3" json:"node,omitempty"`
	NominatedNode  string         `protobuf:"bytes,9,opt,name=nominated_node,json=nominatedNode,proto3" json:"nominated_node,omitempty"`
	ReadinessGates string         `protobuf:"bytes,10,opt,name=readiness_gates,json=readinessGates,proto3" json:"readiness_gates,omitempty"`
}

func (x *Pod) Reset() {
	*x = Pod{}
	if protoimpl.UnsafeEnabled {
		mi := &file_k8s_proto_msgTypes[3]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *Pod) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Pod) ProtoMessage() {}

func (x *Pod) ProtoReflect() protoreflect.Message {
	mi := &file_k8s_proto_msgTypes[3]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use Pod.ProtoReflect.Descriptor instead.
func (*Pod) Descriptor() ([]byte, []int) {
	return file_k8s_proto_rawDescGZIP(), []int{3}
}

func (x *Pod) GetNamespace() string {
	if x != nil {
		return x.Namespace
	}
	return ""
}

func (x *Pod) GetName() string {
	if x != nil {
		return x.Name
	}
	return ""
}

func (x *Pod) GetReady() *ReadyState {
	if x != nil {
		return x.Ready
	}
	return nil
}

func (x *Pod) GetStatus() PodStatus {
	if x != nil {
		return x.Status
	}
	return PodStatus_Invalid_Pod_Status
}

func (x *Pod) GetRestarts() *RestartsState {
	if x != nil {
		return x.Restarts
	}
	return nil
}

func (x *Pod) GetAge() string {
	if x != nil {
		return x.Age
	}
	return ""
}

func (x *Pod) GetIp() string {
	if x != nil {
		return x.Ip
	}
	return ""
}

func (x *Pod) GetNode() string {
	if x != nil {
		return x.Node
	}
	return ""
}

func (x *Pod) GetNominatedNode() string {
	if x != nil {
		return x.NominatedNode
	}
	return ""
}

func (x *Pod) GetReadinessGates() string {
	if x != nil {
		return x.ReadinessGates
	}
	return ""
}

type Node struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Name             string     `protobuf:"bytes,1,opt,name=name,proto3" json:"name,omitempty"`
	Status           NodeStatus `protobuf:"varint,2,opt,name=status,proto3,enum=types.NodeStatus" json:"status,omitempty"`
	Roles            string     `protobuf:"bytes,3,opt,name=roles,proto3" json:"roles,omitempty"`
	Age              string     `protobuf:"bytes,4,opt,name=age,proto3" json:"age,omitempty"`
	Version          string     `protobuf:"bytes,5,opt,name=version,proto3" json:"version,omitempty"`
	InternalIp       string     `protobuf:"bytes,6,opt,name=internal_ip,json=internalIp,proto3" json:"internal_ip,omitempty"`
	ExternalIp       string     `protobuf:"bytes,7,opt,name=external_ip,json=externalIp,proto3" json:"external_ip,omitempty"`
	OsImage          string     `protobuf:"bytes,8,opt,name=os_image,json=osImage,proto3" json:"os_image,omitempty"`
	KernelVersion    string     `protobuf:"bytes,9,opt,name=kernel_version,json=kernelVersion,proto3" json:"kernel_version,omitempty"`
	ContainerRuntime string     `protobuf:"bytes,10,opt,name=container_runtime,json=containerRuntime,proto3" json:"container_runtime,omitempty"`
}

func (x *Node) Reset() {
	*x = Node{}
	if protoimpl.UnsafeEnabled {
		mi := &file_k8s_proto_msgTypes[4]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *Node) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Node) ProtoMessage() {}

func (x *Node) ProtoReflect() protoreflect.Message {
	mi := &file_k8s_proto_msgTypes[4]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use Node.ProtoReflect.Descriptor instead.
func (*Node) Descriptor() ([]byte, []int) {
	return file_k8s_proto_rawDescGZIP(), []int{4}
}

func (x *Node) GetName() string {
	if x != nil {
		return x.Name
	}
	return ""
}

func (x *Node) GetStatus() NodeStatus {
	if x != nil {
		return x.Status
	}
	return NodeStatus_Invalid_Node_Status
}

func (x *Node) GetRoles() string {
	if x != nil {
		return x.Roles
	}
	return ""
}

func (x *Node) GetAge() string {
	if x != nil {
		return x.Age
	}
	return ""
}

func (x *Node) GetVersion() string {
	if x != nil {
		return x.Version
	}
	return ""
}

func (x *Node) GetInternalIp() string {
	if x != nil {
		return x.InternalIp
	}
	return ""
}

func (x *Node) GetExternalIp() string {
	if x != nil {
		return x.ExternalIp
	}
	return ""
}

func (x *Node) GetOsImage() string {
	if x != nil {
		return x.OsImage
	}
	return ""
}

func (x *Node) GetKernelVersion() string {
	if x != nil {
		return x.KernelVersion
	}
	return ""
}

func (x *Node) GetContainerRuntime() string {
	if x != nil {
		return x.ContainerRuntime
	}
	return ""
}

var File_k8s_proto protoreflect.FileDescriptor

var file_k8s_proto_rawDesc = []byte{
	0x0a, 0x09, 0x6b, 0x38, 0x73, 0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x12, 0x05, 0x74, 0x79, 0x70,
	0x65, 0x73, 0x22, 0x38, 0x0a, 0x0a, 0x52, 0x65, 0x61, 0x64, 0x79, 0x53, 0x74, 0x61, 0x74, 0x65,
	0x12, 0x14, 0x0a, 0x05, 0x63, 0x6f, 0x75, 0x6e, 0x74, 0x18, 0x01, 0x20, 0x01, 0x28, 0x05, 0x52,
	0x05, 0x63, 0x6f, 0x75, 0x6e, 0x74, 0x12, 0x14, 0x0a, 0x05, 0x6f, 0x75, 0x74, 0x6f, 0x66, 0x18,
	0x02, 0x20, 0x01, 0x28, 0x05, 0x52, 0x05, 0x6f, 0x75, 0x74, 0x6f, 0x66, 0x22, 0x37, 0x0a, 0x0d,
	0x52, 0x65, 0x73, 0x74, 0x61, 0x72, 0x74, 0x73, 0x53, 0x74, 0x61, 0x74, 0x65, 0x12, 0x14, 0x0a,
	0x05, 0x63, 0x6f, 0x75, 0x6e, 0x74, 0x18, 0x01, 0x20, 0x01, 0x28, 0x05, 0x52, 0x05, 0x63, 0x6f,
	0x75, 0x6e, 0x74, 0x12, 0x10, 0x0a, 0x03, 0x61, 0x67, 0x6f, 0x18, 0x02, 0x20, 0x01, 0x28, 0x09,
	0x52, 0x03, 0x61, 0x67, 0x6f, 0x22, 0x88, 0x02, 0x0a, 0x07, 0x43, 0x6c, 0x75, 0x73, 0x74, 0x65,
	0x72, 0x12, 0x12, 0x0a, 0x04, 0x6e, 0x61, 0x6d, 0x65, 0x18, 0x01, 0x20, 0x01, 0x28, 0x09, 0x52,
	0x04, 0x6e, 0x61, 0x6d, 0x65, 0x12, 0x2f, 0x0a, 0x05, 0x6e, 0x6f, 0x64, 0x65, 0x73, 0x18, 0x02,
	0x20, 0x03, 0x28, 0x0b, 0x32, 0x19, 0x2e, 0x74, 0x79, 0x70, 0x65, 0x73, 0x2e, 0x43, 0x6c, 0x75,
	0x73, 0x74, 0x65, 0x72, 0x2e, 0x4e, 0x6f, 0x64, 0x65, 0x73, 0x45, 0x6e, 0x74, 0x72, 0x79, 0x52,
	0x05, 0x6e, 0x6f, 0x64, 0x65, 0x73, 0x12, 0x2c, 0x0a, 0x04, 0x70, 0x6f, 0x64, 0x73, 0x18, 0x03,
	0x20, 0x03, 0x28, 0x0b, 0x32, 0x18, 0x2e, 0x74, 0x79, 0x70, 0x65, 0x73, 0x2e, 0x43, 0x6c, 0x75,
	0x73, 0x74, 0x65, 0x72, 0x2e, 0x50, 0x6f, 0x64, 0x73, 0x45, 0x6e, 0x74, 0x72, 0x79, 0x52, 0x04,
	0x70, 0x6f, 0x64, 0x73, 0x1a, 0x45, 0x0a, 0x0a, 0x4e, 0x6f, 0x64, 0x65, 0x73, 0x45, 0x6e, 0x74,
	0x72, 0x79, 0x12, 0x10, 0x0a, 0x03, 0x6b, 0x65, 0x79, 0x18, 0x01, 0x20, 0x01, 0x28, 0x09, 0x52,
	0x03, 0x6b, 0x65, 0x79, 0x12, 0x21, 0x0a, 0x05, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x18, 0x02, 0x20,
	0x01, 0x28, 0x0b, 0x32, 0x0b, 0x2e, 0x74, 0x79, 0x70, 0x65, 0x73, 0x2e, 0x4e, 0x6f, 0x64, 0x65,
	0x52, 0x05, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x3a, 0x02, 0x38, 0x01, 0x1a, 0x43, 0x0a, 0x09, 0x50,
	0x6f, 0x64, 0x73, 0x45, 0x6e, 0x74, 0x72, 0x79, 0x12, 0x10, 0x0a, 0x03, 0x6b, 0x65, 0x79, 0x18,
	0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x03, 0x6b, 0x65, 0x79, 0x12, 0x20, 0x0a, 0x05, 0x76, 0x61,
	0x6c, 0x75, 0x65, 0x18, 0x02, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x0a, 0x2e, 0x74, 0x79, 0x70, 0x65,
	0x73, 0x2e, 0x50, 0x6f, 0x64, 0x52, 0x05, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x3a, 0x02, 0x38, 0x01,
	0x22, 0xc2, 0x02, 0x0a, 0x03, 0x50, 0x6f, 0x64, 0x12, 0x1c, 0x0a, 0x09, 0x6e, 0x61, 0x6d, 0x65,
	0x73, 0x70, 0x61, 0x63, 0x65, 0x18, 0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x09, 0x6e, 0x61, 0x6d,
	0x65, 0x73, 0x70, 0x61, 0x63, 0x65, 0x12, 0x12, 0x0a, 0x04, 0x6e, 0x61, 0x6d, 0x65, 0x18, 0x02,
	0x20, 0x01, 0x28, 0x09, 0x52, 0x04, 0x6e, 0x61, 0x6d, 0x65, 0x12, 0x27, 0x0a, 0x05, 0x72, 0x65,
	0x61, 0x64, 0x79, 0x18, 0x03, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x11, 0x2e, 0x74, 0x79, 0x70, 0x65,
	0x73, 0x2e, 0x52, 0x65, 0x61, 0x64, 0x79, 0x53, 0x74, 0x61, 0x74, 0x65, 0x52, 0x05, 0x72, 0x65,
	0x61, 0x64, 0x79, 0x12, 0x28, 0x0a, 0x06, 0x73, 0x74, 0x61, 0x74, 0x75, 0x73, 0x18, 0x04, 0x20,
	0x01, 0x28, 0x0e, 0x32, 0x10, 0x2e, 0x74, 0x79, 0x70, 0x65, 0x73, 0x2e, 0x50, 0x6f, 0x64, 0x53,
	0x74, 0x61, 0x74, 0x75, 0x73, 0x52, 0x06, 0x73, 0x74, 0x61, 0x74, 0x75, 0x73, 0x12, 0x30, 0x0a,
	0x08, 0x72, 0x65, 0x73, 0x74, 0x61, 0x72, 0x74, 0x73, 0x18, 0x05, 0x20, 0x01, 0x28, 0x0b, 0x32,
	0x14, 0x2e, 0x74, 0x79, 0x70, 0x65, 0x73, 0x2e, 0x52, 0x65, 0x73, 0x74, 0x61, 0x72, 0x74, 0x73,
	0x53, 0x74, 0x61, 0x74, 0x65, 0x52, 0x08, 0x72, 0x65, 0x73, 0x74, 0x61, 0x72, 0x74, 0x73, 0x12,
	0x10, 0x0a, 0x03, 0x61, 0x67, 0x65, 0x18, 0x06, 0x20, 0x01, 0x28, 0x09, 0x52, 0x03, 0x61, 0x67,
	0x65, 0x12, 0x0e, 0x0a, 0x02, 0x69, 0x70, 0x18, 0x07, 0x20, 0x01, 0x28, 0x09, 0x52, 0x02, 0x69,
	0x70, 0x12, 0x12, 0x0a, 0x04, 0x6e, 0x6f, 0x64, 0x65, 0x18, 0x08, 0x20, 0x01, 0x28, 0x09, 0x52,
	0x04, 0x6e, 0x6f, 0x64, 0x65, 0x12, 0x25, 0x0a, 0x0e, 0x6e, 0x6f, 0x6d, 0x69, 0x6e, 0x61, 0x74,
	0x65, 0x64, 0x5f, 0x6e, 0x6f, 0x64, 0x65, 0x18, 0x09, 0x20, 0x01, 0x28, 0x09, 0x52, 0x0d, 0x6e,
	0x6f, 0x6d, 0x69, 0x6e, 0x61, 0x74, 0x65, 0x64, 0x4e, 0x6f, 0x64, 0x65, 0x12, 0x27, 0x0a, 0x0f,
	0x72, 0x65, 0x61, 0x64, 0x69, 0x6e, 0x65, 0x73, 0x73, 0x5f, 0x67, 0x61, 0x74, 0x65, 0x73, 0x18,
	0x0a, 0x20, 0x01, 0x28, 0x09, 0x52, 0x0e, 0x72, 0x65, 0x61, 0x64, 0x69, 0x6e, 0x65, 0x73, 0x73,
	0x47, 0x61, 0x74, 0x65, 0x73, 0x22, 0xb8, 0x02, 0x0a, 0x04, 0x4e, 0x6f, 0x64, 0x65, 0x12, 0x12,
	0x0a, 0x04, 0x6e, 0x61, 0x6d, 0x65, 0x18, 0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x04, 0x6e, 0x61,
	0x6d, 0x65, 0x12, 0x29, 0x0a, 0x06, 0x73, 0x74, 0x61, 0x74, 0x75, 0x73, 0x18, 0x02, 0x20, 0x01,
	0x28, 0x0e, 0x32, 0x11, 0x2e, 0x74, 0x79, 0x70, 0x65, 0x73, 0x2e, 0x4e, 0x6f, 0x64, 0x65, 0x53,
	0x74, 0x61, 0x74, 0x75, 0x73, 0x52, 0x06, 0x73, 0x74, 0x61, 0x74, 0x75, 0x73, 0x12, 0x14, 0x0a,
	0x05, 0x72, 0x6f, 0x6c, 0x65, 0x73, 0x18, 0x03, 0x20, 0x01, 0x28, 0x09, 0x52, 0x05, 0x72, 0x6f,
	0x6c, 0x65, 0x73, 0x12, 0x10, 0x0a, 0x03, 0x61, 0x67, 0x65, 0x18, 0x04, 0x20, 0x01, 0x28, 0x09,
	0x52, 0x03, 0x61, 0x67, 0x65, 0x12, 0x18, 0x0a, 0x07, 0x76, 0x65, 0x72, 0x73, 0x69, 0x6f, 0x6e,
	0x18, 0x05, 0x20, 0x01, 0x28, 0x09, 0x52, 0x07, 0x76, 0x65, 0x72, 0x73, 0x69, 0x6f, 0x6e, 0x12,
	0x1f, 0x0a, 0x0b, 0x69, 0x6e, 0x74, 0x65, 0x72, 0x6e, 0x61, 0x6c, 0x5f, 0x69, 0x70, 0x18, 0x06,
	0x20, 0x01, 0x28, 0x09, 0x52, 0x0a, 0x69, 0x6e, 0x74, 0x65, 0x72, 0x6e, 0x61, 0x6c, 0x49, 0x70,
	0x12, 0x1f, 0x0a, 0x0b, 0x65, 0x78, 0x74, 0x65, 0x72, 0x6e, 0x61, 0x6c, 0x5f, 0x69, 0x70, 0x18,
	0x07, 0x20, 0x01, 0x28, 0x09, 0x52, 0x0a, 0x65, 0x78, 0x74, 0x65, 0x72, 0x6e, 0x61, 0x6c, 0x49,
	0x70, 0x12, 0x19, 0x0a, 0x08, 0x6f, 0x73, 0x5f, 0x69, 0x6d, 0x61, 0x67, 0x65, 0x18, 0x08, 0x20,
	0x01, 0x28, 0x09, 0x52, 0x07, 0x6f, 0x73, 0x49, 0x6d, 0x61, 0x67, 0x65, 0x12, 0x25, 0x0a, 0x0e,
	0x6b, 0x65, 0x72, 0x6e, 0x65, 0x6c, 0x5f, 0x76, 0x65, 0x72, 0x73, 0x69, 0x6f, 0x6e, 0x18, 0x09,
	0x20, 0x01, 0x28, 0x09, 0x52, 0x0d, 0x6b, 0x65, 0x72, 0x6e, 0x65, 0x6c, 0x56, 0x65, 0x72, 0x73,
	0x69, 0x6f, 0x6e, 0x12, 0x2b, 0x0a, 0x11, 0x63, 0x6f, 0x6e, 0x74, 0x61, 0x69, 0x6e, 0x65, 0x72,
	0x5f, 0x72, 0x75, 0x6e, 0x74, 0x69, 0x6d, 0x65, 0x18, 0x0a, 0x20, 0x01, 0x28, 0x09, 0x52, 0x10,
	0x63, 0x6f, 0x6e, 0x74, 0x61, 0x69, 0x6e, 0x65, 0x72, 0x52, 0x75, 0x6e, 0x74, 0x69, 0x6d, 0x65,
	0x2a, 0x30, 0x0a, 0x09, 0x50, 0x6f, 0x64, 0x53, 0x74, 0x61, 0x74, 0x75, 0x73, 0x12, 0x16, 0x0a,
	0x12, 0x49, 0x6e, 0x76, 0x61, 0x6c, 0x69, 0x64, 0x5f, 0x50, 0x6f, 0x64, 0x5f, 0x53, 0x74, 0x61,
	0x74, 0x75, 0x73, 0x10, 0x00, 0x12, 0x0b, 0x0a, 0x07, 0x52, 0x75, 0x6e, 0x6e, 0x69, 0x6e, 0x67,
	0x10, 0x01, 0x2a, 0x30, 0x0a, 0x0a, 0x4e, 0x6f, 0x64, 0x65, 0x53, 0x74, 0x61, 0x74, 0x75, 0x73,
	0x12, 0x17, 0x0a, 0x13, 0x49, 0x6e, 0x76, 0x61, 0x6c, 0x69, 0x64, 0x5f, 0x4e, 0x6f, 0x64, 0x65,
	0x5f, 0x53, 0x74, 0x61, 0x74, 0x75, 0x73, 0x10, 0x00, 0x12, 0x09, 0x0a, 0x05, 0x52, 0x65, 0x61,
	0x64, 0x79, 0x10, 0x01, 0x42, 0x21, 0x0a, 0x0d, 0x63, 0x6f, 0x6d, 0x2e, 0x6b, 0x38, 0x73, 0x2e,
	0x74, 0x79, 0x70, 0x65, 0x73, 0x42, 0x05, 0x54, 0x79, 0x70, 0x65, 0x73, 0x50, 0x01, 0x5a, 0x07,
	0x2e, 0x2f, 0x74, 0x79, 0x70, 0x65, 0x73, 0x62, 0x06, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x33,
}

var (
	file_k8s_proto_rawDescOnce sync.Once
	file_k8s_proto_rawDescData = file_k8s_proto_rawDesc
)

func file_k8s_proto_rawDescGZIP() []byte {
	file_k8s_proto_rawDescOnce.Do(func() {
		file_k8s_proto_rawDescData = protoimpl.X.CompressGZIP(file_k8s_proto_rawDescData)
	})
	return file_k8s_proto_rawDescData
}

var file_k8s_proto_enumTypes = make([]protoimpl.EnumInfo, 2)
var file_k8s_proto_msgTypes = make([]protoimpl.MessageInfo, 7)
var file_k8s_proto_goTypes = []interface{}{
	(PodStatus)(0),        // 0: types.PodStatus
	(NodeStatus)(0),       // 1: types.NodeStatus
	(*ReadyState)(nil),    // 2: types.ReadyState
	(*RestartsState)(nil), // 3: types.RestartsState
	(*Cluster)(nil),       // 4: types.Cluster
	(*Pod)(nil),           // 5: types.Pod
	(*Node)(nil),          // 6: types.Node
	nil,                   // 7: types.Cluster.NodesEntry
	nil,                   // 8: types.Cluster.PodsEntry
}
var file_k8s_proto_depIdxs = []int32{
	7, // 0: types.Cluster.nodes:type_name -> types.Cluster.NodesEntry
	8, // 1: types.Cluster.pods:type_name -> types.Cluster.PodsEntry
	2, // 2: types.Pod.ready:type_name -> types.ReadyState
	0, // 3: types.Pod.status:type_name -> types.PodStatus
	3, // 4: types.Pod.restarts:type_name -> types.RestartsState
	1, // 5: types.Node.status:type_name -> types.NodeStatus
	6, // 6: types.Cluster.NodesEntry.value:type_name -> types.Node
	5, // 7: types.Cluster.PodsEntry.value:type_name -> types.Pod
	8, // [8:8] is the sub-list for method output_type
	8, // [8:8] is the sub-list for method input_type
	8, // [8:8] is the sub-list for extension type_name
	8, // [8:8] is the sub-list for extension extendee
	0, // [0:8] is the sub-list for field type_name
}

func init() { file_k8s_proto_init() }
func file_k8s_proto_init() {
	if File_k8s_proto != nil {
		return
	}
	if !protoimpl.UnsafeEnabled {
		file_k8s_proto_msgTypes[0].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*ReadyState); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_k8s_proto_msgTypes[1].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*RestartsState); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_k8s_proto_msgTypes[2].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*Cluster); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_k8s_proto_msgTypes[3].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*Pod); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_k8s_proto_msgTypes[4].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*Node); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
	}
	type x struct{}
	out := protoimpl.TypeBuilder{
		File: protoimpl.DescBuilder{
			GoPackagePath: reflect.TypeOf(x{}).PkgPath(),
			RawDescriptor: file_k8s_proto_rawDesc,
			NumEnums:      2,
			NumMessages:   7,
			NumExtensions: 0,
			NumServices:   0,
		},
		GoTypes:           file_k8s_proto_goTypes,
		DependencyIndexes: file_k8s_proto_depIdxs,
		EnumInfos:         file_k8s_proto_enumTypes,
		MessageInfos:      file_k8s_proto_msgTypes,
	}.Build()
	File_k8s_proto = out.File
	file_k8s_proto_rawDesc = nil
	file_k8s_proto_goTypes = nil
	file_k8s_proto_depIdxs = nil
}
