package serializers

import (
	"github.com/saichler/k8s_observer/go/types"
	"github.com/saichler/types/go/common"
	"strconv"
	"strings"
)

type Ready struct{}

func (this *Ready) Mode() common.SerializerMode {
	return common.STRING
}
func (this *Ready) Marshal(any interface{}, r common.IRegistry) ([]byte, error) {
	return nil, nil
}
func (this *Ready) Unmarshal(data []byte, typ string, r common.IRegistry) (interface{}, error) {
	str := string(data)
	index := strings.Index(str, "/")
	if index != -1 {
		c, _ := strconv.Atoi(str[:index])
		o, _ := strconv.Atoi(str[index+1:])
		return &types.ReadyState{Count: int32(c), Outof: int32(o)}, nil
	}
	return nil, nil
}
